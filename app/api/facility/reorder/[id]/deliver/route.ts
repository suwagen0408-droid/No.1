import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, forbiddenResponse, notFoundResponse, badRequestResponse, serverErrorResponse, successResponse } from '@/lib/api-helpers';

/**
 * POST /api/facility/reorder/[id]/deliver
 * Confirm delivery of reorder
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser(request);
    
    if (!user || user.role !== 'facility' || !user.facility) {
      return forbiddenResponse('施設アカウントでのアクセスが必要です');
    }

    // Get reorder request
    const reorderRequest = await prisma.reorderRequest.findUnique({
      where: { id },
      include: {
        facilityProductPlacement: true,
      },
    });

    if (!reorderRequest) {
      return notFoundResponse('追加発注リクエストが見つかりません');
    }

    if (reorderRequest.facilityId !== user.facility.id) {
      return forbiddenResponse('この発注へのアクセス権限がありません');
    }

    if (reorderRequest.status !== 'shipped') {
      return badRequestResponse('発送済みの発注のみ配達確認できます');
    }

    // Update reorder status
    const updatedRequest = await prisma.reorderRequest.update({
      where: { id },
      data: {
        status: 'delivered',
        deliveredAt: new Date(),
      },
    });

    // Update inventory
    const newUnits = reorderRequest.facilityProductPlacement.currentUnits + (reorderRequest.approvedUnits || reorderRequest.requestedUnits);
    
    await prisma.facilityProductPlacement.update({
      where: { id: reorderRequest.facilityProductPlacementId },
      data: {
        currentUnits: newUnits,
      },
    });

    // Create stock log
    await prisma.stockLog.create({
      data: {
        facilityProductPlacementId: reorderRequest.facilityProductPlacementId,
        changeType: 'delivery',
        quantity: reorderRequest.approvedUnits || reorderRequest.requestedUnits,
        beforeUnits: reorderRequest.facilityProductPlacement.currentUnits,
        afterUnits: newUnits,
        note: `追加発注の配達 (発注ID: ${id})`,
        loggedBy: user.id,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        action: 'confirm_reorder_delivery',
        resourceType: 'ReorderRequest',
        resourceId: id,
        oldValues: JSON.stringify({ status: 'shipped' }),
        newValues: JSON.stringify({
          status: 'delivered',
          deliveredAt: new Date(),
        }),
      },
    });

    return successResponse(
      { reorderRequest: updatedRequest },
      '配達を確認し、在庫を更新しました'
    );
  } catch (error) {
    console.error('Error confirming delivery:', error);
    return serverErrorResponse('配達確認に失敗しました');
  }
}
