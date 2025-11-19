import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getAuthenticatedUser, forbiddenResponse, notFoundResponse, badRequestResponse, serverErrorResponse, successResponse } from '@/lib/api-helpers';

const approveSchema = z.object({
  approvedUnits: z.number().int().min(1),
  estimatedDelivery: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * POST /api/manufacturer/reorder/[id]/approve
 * Approve a reorder request
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
    const validatedData = approveSchema.parse(body);

    // Get reorder request
    const reorderRequest = await prisma.reorderRequest.findUnique({
      where: { id },
      include: {
        facility: {
          select: {
            facilityName: true,
          },
        },
        product: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!reorderRequest) {
      return notFoundResponse('追加発注リクエストが見つかりません');
    }

    if (reorderRequest.manufacturerId !== user.manufacturer.id) {
      return forbiddenResponse('この発注へのアクセス権限がありません');
    }

    if (reorderRequest.status !== 'pending') {
      return badRequestResponse('この発注は既に処理されています');
    }

    // Update reorder request
    const updatedRequest = await prisma.reorderRequest.update({
      where: { id },
      data: {
        status: 'approved',
        approvedUnits: validatedData.approvedUnits,
        approvedAt: new Date(),
        approvedBy: user.id,
        estimatedDelivery: validatedData.estimatedDelivery 
          ? new Date(validatedData.estimatedDelivery) 
          : undefined,
        notes: validatedData.notes,
      },
      include: {
        facility: true,
        product: true,
      },
    });

    // TODO: Send notification to facility

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        action: 'approve_reorder_request',
        resourceType: 'ReorderRequest',
        resourceId: id,
        oldValues: JSON.stringify({ status: 'pending' }),
        newValues: JSON.stringify({
          status: 'approved',
          approvedUnits: validatedData.approvedUnits,
        }),
      },
    });

    return successResponse(
      { reorderRequest: updatedRequest },
      '追加発注を承認しました'
    );
  } catch (error) {
    console.error('Error approving reorder:', error);

    if (error instanceof z.ZodError) {
      return badRequestResponse('入力データが正しくありません', error.issues);
    }

    return serverErrorResponse('追加発注の承認に失敗しました');
  }
}
