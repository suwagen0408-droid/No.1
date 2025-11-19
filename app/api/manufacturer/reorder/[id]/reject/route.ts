import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getAuthenticatedUser, forbiddenResponse, notFoundResponse, badRequestResponse, serverErrorResponse, successResponse } from '@/lib/api-helpers';

const rejectSchema = z.object({
  rejectionReason: z.string().min(1, '却下理由を入力してください'),
});

/**
 * POST /api/manufacturer/reorder/[id]/reject
 * Reject a reorder request
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
    const validatedData = rejectSchema.parse(body);

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

    if (reorderRequest.status !== 'pending') {
      return badRequestResponse('この発注は既に処理されています');
    }

    // Update reorder request
    const updatedRequest = await prisma.reorderRequest.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectionReason: validatedData.rejectionReason,
        approvedBy: user.id,
        approvedAt: new Date(),
      },
    });

    // TODO: Send notification to facility

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        action: 'reject_reorder_request',
        resourceType: 'ReorderRequest',
        resourceId: id,
        oldValues: JSON.stringify({ status: 'pending' }),
        newValues: JSON.stringify({
          status: 'rejected',
          rejectionReason: validatedData.rejectionReason,
        }),
      },
    });

    return successResponse(
      { reorderRequest: updatedRequest },
      '追加発注を却下しました'
    );
  } catch (error) {
    console.error('Error rejecting reorder:', error);

    if (error instanceof z.ZodError) {
      return badRequestResponse('入力データが正しくありません', error.issues);
    }

    return serverErrorResponse('追加発注の却下に失敗しました');
  }
}
