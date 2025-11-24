import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getAuthenticatedUser, forbiddenResponse, notFoundResponse, badRequestResponse, serverErrorResponse, successResponse } from '@/lib/api-helpers';

const shipSchema = z.object({
  trackingNumber: z.string().optional(),
  estimatedDelivery: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * POST /api/manufacturer/reorder/[id]/ship
 * Mark reorder request as shipped
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser(request);
    
    if (!user || user.role !== 'manufacturer' || !user.manufacturer) {
      return forbiddenResponse('メーカーアカウントでのアクセスが必要です');
    }

    const body = await request.json();
    const validatedData = shipSchema.parse(body);

    // Get reorder request
    const reorderRequest = await prisma.reorderRequest.findUnique({
      where: { id },
    });

    if (!reorderRequest) {
      return notFoundResponse('追加発注リクエストが見つかりません');
    }

    if (reorderRequest.manufacturerId !== user.manufacturer.id) {
      return forbiddenResponse('この発注へのアクセス権限がありません');
    }

    if (reorderRequest.status !== 'approved') {
      return badRequestResponse('承認済みの発注のみ発送できます');
    }

    // Update reorder request
    const updatedRequest = await prisma.reorderRequest.update({
      where: { id },
      data: {
        status: 'shipped',
        shippedAt: new Date(),
        trackingNumber: validatedData.trackingNumber,
        estimatedDelivery: validatedData.estimatedDelivery 
          ? new Date(validatedData.estimatedDelivery) 
          : undefined,
        notes: validatedData.notes,
      },
    });

    // TODO: Send notification to facility with tracking info

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        action: 'ship_reorder',
        resourceType: 'ReorderRequest',
        resourceId: id,
        oldValues: JSON.stringify({ status: 'approved' }),
        newValues: JSON.stringify({
          status: 'shipped',
          trackingNumber: validatedData.trackingNumber,
        }),
      },
    });

    return successResponse(
      { reorderRequest: updatedRequest },
      '発送情報を更新しました'
    );
  } catch (error) {
    console.error('Error shipping reorder:', error);

    if (error instanceof z.ZodError) {
      return badRequestResponse('入力データが正しくありません', error.issues);
    }

    return serverErrorResponse('発送情報の更新に失敗しました');
  }
}
