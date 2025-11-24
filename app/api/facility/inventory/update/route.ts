import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getAuthenticatedUser, forbiddenResponse, notFoundResponse, badRequestResponse, serverErrorResponse, successResponse } from '@/lib/api-helpers';

const updateSchema = z.object({
  facilityProductPlacementId: z.string(),
  changeType: z.enum(['delivery', 'usage', 'adjustment', 'damage', 'return']),
  quantity: z.number().int(),
  note: z.string().optional(),
});

/**
 * POST /api/facility/inventory/update
 * Update inventory and check for reorder alerts
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    
    if (!user || user.role !== 'facility' || !user.facility) {
      return forbiddenResponse('施設アカウントでのアクセスが必要です');
    }

    const body = await request.json();
    const validatedData = updateSchema.parse(body);

    // Get current placement
    const placement = await prisma.facilityProductPlacement.findUnique({
      where: { id: validatedData.facilityProductPlacementId },
      include: {
        facilityCampaign: {
          select: {
            facilityId: true,
          },
        },
      },
    });

    if (!placement) {
      return notFoundResponse('在庫情報が見つかりません');
    }

    if (placement.facilityCampaign.facilityId !== user.facility.id) {
      return forbiddenResponse('この在庫へのアクセス権限がありません');
    }

    // Calculate new units based on change type
    let quantityChange = validatedData.quantity;
    if (['usage', 'damage', 'return'].includes(validatedData.changeType)) {
      quantityChange = -Math.abs(validatedData.quantity);
    }

    const newUnits = Math.max(0, placement.currentUnits + quantityChange);

    // Update placement
    const updatedPlacement = await prisma.facilityProductPlacement.update({
      where: { id: validatedData.facilityProductPlacementId },
      data: {
        currentUnits: newUnits,
      },
    });

    // Create stock log
    await prisma.stockLog.create({
      data: {
        facilityProductPlacementId: validatedData.facilityProductPlacementId,
        changeType: validatedData.changeType,
        quantity: validatedData.quantity,
        beforeUnits: placement.currentUnits,
        afterUnits: newUnits,
        note: validatedData.note,
        loggedBy: user.id,
      },
    });

    // Check if reorder threshold is reached
    const needsReorder = newUnits <= placement.reorderThreshold;
    let reorderAlert = null;

    if (needsReorder) {
      // Check if there's already a pending reorder
      const existingReorder = await prisma.reorderRequest.findFirst({
        where: {
          facilityProductPlacementId: validatedData.facilityProductPlacementId,
          status: {
            in: ['pending', 'approved'],
          },
        },
      });

      if (!existingReorder) {
        reorderAlert = {
          message: `在庫が閾値（${placement.reorderThreshold}）以下になりました`,
          currentUnits: newUnits,
          threshold: placement.reorderThreshold,
          needsReorder: true,
        };

        // TODO: Send notification to facility staff
      }
    }

    return successResponse({
      placement: updatedPlacement,
      needsReorder,
      reorderAlert,
    }, '在庫を更新しました');
  } catch (error) {
    console.error('Error updating inventory:', error);

    if (error instanceof z.ZodError) {
      return badRequestResponse('入力データが正しくありません', error.issues);
    }

    return serverErrorResponse('在庫の更新に失敗しました');
  }
}
