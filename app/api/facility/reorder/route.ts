import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getAuthenticatedUser, forbiddenResponse, notFoundResponse, badRequestResponse, serverErrorResponse, successResponse } from '@/lib/api-helpers';

// Reorder request creation schema
const reorderSchema = z.object({
  facilityProductPlacementId: z.string(),
  requestedUnits: z.number().int().min(1),
  reason: z.string().optional(),
  urgency: z.enum(['normal', 'high', 'emergency']).default('normal'),
});

/**
 * GET /api/facility/reorder
 * Get facility's reorder requests
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    
    if (!user || user.role !== 'facility' || !user.facility) {
      return forbiddenResponse('施設アカウントでのアクセスが必要です');
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const reorderRequests = await prisma.reorderRequest.findMany({
      where: {
        facilityId: user.facility.id,
        ...(status && { status: status as any }),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            mainImageUrl: true,
            category: true,
          },
        },
        campaign: {
          select: {
            id: true,
            name: true,
          },
        },
        manufacturer: {
          select: {
            id: true,
            companyName: true,
          },
        },
        facilityProductPlacement: {
          select: {
            id: true,
            locationLabel: true,
            currentUnits: true,
            reorderThreshold: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return successResponse({ reorderRequests });
  } catch (error) {
    console.error('Error fetching reorder requests:', error);
    return serverErrorResponse('追加発注リストの取得に失敗しました');
  }
}

/**
 * POST /api/facility/reorder
 * Create a new reorder request
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    
    if (!user || user.role !== 'facility' || !user.facility) {
      return forbiddenResponse('施設アカウントでのアクセスが必要です');
    }

    const body = await request.json();
    const validatedData = reorderSchema.parse(body);

    // Get placement details
    const placement = await prisma.facilityProductPlacement.findUnique({
      where: { id: validatedData.facilityProductPlacementId },
      include: {
        facilityCampaign: {
          include: {
            campaign: {
              select: {
                id: true,
                manufacturerId: true,
                costModel: true,
                unitPrice: true,
                shippingFee: true,
              },
            },
          },
        },
        product: {
          select: {
            id: true,
            costPrice: true,
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

    // Calculate costs
    const unitCost = placement.facilityCampaign.campaign.unitPrice || placement.product.costPrice;
    const shippingCost = placement.facilityCampaign.campaign.shippingFee || 0;
    const totalCost = (unitCost * validatedData.requestedUnits) + shippingCost;

    // Create reorder request
    const reorderRequest = await prisma.reorderRequest.create({
      data: {
        facilityId: user.facility.id,
        facilityProductPlacementId: validatedData.facilityProductPlacementId,
        productId: placement.productId,
        campaignId: placement.facilityCampaign.campaignId,
        manufacturerId: placement.facilityCampaign.campaign.manufacturerId,
        requestedUnits: validatedData.requestedUnits,
        reason: validatedData.reason,
        urgency: validatedData.urgency,
        unitCost,
        shippingCost,
        totalCost,
        status: 'pending',
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            mainImageUrl: true,
          },
        },
        manufacturer: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });

    // TODO: Send notification to manufacturer

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        action: 'create_reorder_request',
        resourceType: 'ReorderRequest',
        resourceId: reorderRequest.id,
        newValues: JSON.stringify(validatedData),
      },
    });

    return successResponse(
      { reorderRequest },
      '追加発注リクエストを作成しました'
    );
  } catch (error) {
    console.error('Error creating reorder request:', error);

    if (error instanceof z.ZodError) {
      return badRequestResponse('入力データが正しくありません', error.issues);
    }

    return serverErrorResponse('追加発注リクエストの作成に失敗しました');
  }
}
