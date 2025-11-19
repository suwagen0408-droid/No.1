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

    // Get reorder request with campaign details
    const reorderRequest = await prisma.reorderRequest.findUnique({
      where: { id },
      include: {
        facility: {
          select: {
            id: true,
            facilityName: true,
          },
        },
        product: {
          select: {
            name: true,
            costPrice: true,
          },
        },
        campaign: {
          select: {
            id: true,
            name: true,
            costModel: true,
            paymentTiming: true,
            unitPrice: true,
            shippingFee: true,
            shippingCostCoveredBy: true,
          },
        },
        facilityProductPlacement: {
          select: {
            facilityCampaignId: true,
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

    // Calculate costs
    const campaign = reorderRequest.campaign;
    const unitPrice = campaign.unitPrice || reorderRequest.product.costPrice;
    const unitCost = unitPrice * validatedData.approvedUnits;
    
    // Calculate shipping cost based on who covers it
    let shippingCost = 0;
    if (campaign.shippingFee) {
      if (campaign.shippingCostCoveredBy === 'facility') {
        shippingCost = campaign.shippingFee;
      } else if (campaign.shippingCostCoveredBy === 'split') {
        shippingCost = campaign.shippingFee / 2;
      }
    }
    
    const totalCost = unitCost + shippingCost;

    // Update reorder request with cost information
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
        unitCost: unitPrice,
        shippingCost: shippingCost,
        totalCost: totalCost,
      },
      include: {
        facility: true,
        product: true,
        campaign: true,
      },
    });

    // Create payment record based on campaign payment timing
    if (campaign.paymentTiming === 'on_approval') {
      // Immediate payment required (paid_sampling)
      await prisma.facilityPayment.create({
        data: {
          facilityId: reorderRequest.facilityId,
          facilityCampaignId: reorderRequest.facilityProductPlacement.facilityCampaignId,
          amount: unitCost,
          shippingFee: shippingCost,
          totalAmount: totalCost,
          currency: 'JPY',
          paymentMethod: 'pending', // Facility will choose payment method
          paymentStatus: 'pending',
        },
      });

      // Notify facility about payment required
      await prisma.notification.create({
        data: {
          userId: reorderRequest.facility.id,
          type: 'reorder_approved_payment_required',
          title: '追加発注が承認されました（支払いが必要です）',
          message: `「${reorderRequest.product.name}」の追加発注（${validatedData.approvedUnits}個）が承認されました。お支払い手続きをお願いします。金額: ¥${totalCost.toLocaleString()}`,
          relatedResourceType: 'ReorderRequest',
          relatedResourceId: id,
        },
      });
    } else if (campaign.paymentTiming === 'monthly_invoice') {
      // Will be included in monthly invoice
      // No immediate payment record, but costs are stored in ReorderRequest
      
      // Notify facility (no payment required now)
      await prisma.notification.create({
        data: {
          userId: reorderRequest.facility.id,
          type: 'reorder_approved',
          title: '追加発注が承認されました',
          message: `「${reorderRequest.product.name}」の追加発注（${validatedData.approvedUnits}個）が承認されました。月次請求書に含まれます。`,
          relatedResourceType: 'ReorderRequest',
          relatedResourceId: id,
        },
      });
    } else {
      // Free or no payment required
      await prisma.notification.create({
        data: {
          userId: reorderRequest.facility.id,
          type: 'reorder_approved',
          title: '追加発注が承認されました',
          message: `「${reorderRequest.product.name}」の追加発注（${validatedData.approvedUnits}個）が承認されました。`,
          relatedResourceType: 'ReorderRequest',
          relatedResourceId: id,
        },
      });
    }

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
