import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { CampaignStatus } from '@prisma/client';

const updateCampaignSchema = z.object({
  name: z.string().min(1, 'キャンペーン名は必須です').optional(),
  description: z.string().optional().nullable(),
  startDate: z.string().transform((str) => new Date(str)).optional(),
  endDate: z.string().transform((str) => new Date(str)).optional(),
  totalUnits: z.number().int().min(1).optional(),
  maxUnitsPerFacility: z.number().int().min(1).optional().nullable(),
  targetFacilityTypes: z.array(z.string()).optional(),
  targetFacilityTags: z.array(z.string()).optional(),
  minMonthlyGuests: z.number().int().optional().nullable(),
  costModel: z.enum(['free', 'cost_price', 'discounted']).optional(),
  shippingCostCoveredBy: z.enum(['manufacturer', 'facility', 'split']).optional(),
  productIds: z.array(z.string()).optional(),
});

// GET /api/manufacturer/campaigns/[id] - Get campaign details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const manufacturer = await prisma.manufacturer.findUnique({
      where: { userId },
    });

    if (!manufacturer) {
      return NextResponse.json(
        { error: 'Manufacturer not found' },
        { status: 404 }
      );
    }

    const campaign = await prisma.campaign.findFirst({
      where: {
        id: params.id,
        manufacturerId: manufacturer.id,
        deletedAt: null,
      },
      include: {
        campaignProducts: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                mainImageUrl: true,
                category: true,
                retailPrice: true,
              },
            },
          },
          orderBy: {
            displayOrder: 'asc',
          },
        },
        facilityCampaigns: {
          include: {
            facility: {
              select: {
                id: true,
                facilityName: true,
                facilityType: true,
              },
            },
          },
        },
        _count: {
          select: {
            facilityCampaigns: true,
            qrScanEvents: true,
            clickEvents: true,
            purchaseEvents: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Parse JSON fields
    const targetFacilityTypes = campaign.targetFacilityTypes
      ? JSON.parse(campaign.targetFacilityTypes)
      : [];
    const targetFacilityTags = campaign.targetFacilityTags
      ? JSON.parse(campaign.targetFacilityTags)
      : [];

    return NextResponse.json({
      campaign: {
        ...campaign,
        targetFacilityTypes,
        targetFacilityTags,
      },
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign' },
      { status: 500 }
    );
  }
}

// PUT /api/manufacturer/campaigns/[id] - Update campaign
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const manufacturer = await prisma.manufacturer.findUnique({
      where: { userId },
    });

    if (!manufacturer) {
      return NextResponse.json(
        { error: 'Manufacturer not found' },
        { status: 404 }
      );
    }

    // Check if campaign exists and belongs to this manufacturer
    const existingCampaign = await prisma.campaign.findFirst({
      where: {
        id: params.id,
        manufacturerId: manufacturer.id,
        deletedAt: null,
      },
    });

    if (!existingCampaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Only allow editing draft or rejected campaigns, or specific fields for approved campaigns
    if (
      existingCampaign.status !== CampaignStatus.draft &&
      existingCampaign.status !== CampaignStatus.rejected &&
      existingCampaign.status !== CampaignStatus.pending
    ) {
      return NextResponse.json(
        {
          error:
            'アクティブまたは終了したキャンペーンは編集できません。下書き、却下済み、承認待ちのキャンペーンのみ編集可能です。',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    console.log('Updating campaign with data:', JSON.stringify(body, null, 2));
    
    const validatedData = updateCampaignSchema.parse(body);

    // If product IDs are being updated, verify they belong to this manufacturer
    if (validatedData.productIds) {
      const products = await prisma.product.findMany({
        where: {
          id: { in: validatedData.productIds },
          manufacturerId: manufacturer.id,
          status: 'approved',
        },
      });

      if (products.length !== validatedData.productIds.length) {
        return NextResponse.json(
          {
            error:
              '一部の商品が見つからないか、承認されていません。承認済みの商品のみ選択できます。',
          },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: any = {};

    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.description !== undefined)
      updateData.description = validatedData.description;
    if (validatedData.startDate !== undefined)
      updateData.startDate = validatedData.startDate;
    if (validatedData.endDate !== undefined)
      updateData.endDate = validatedData.endDate;
    if (validatedData.totalUnits !== undefined)
      updateData.totalUnits = validatedData.totalUnits;
    if (validatedData.maxUnitsPerFacility !== undefined)
      updateData.maxUnitsPerFacility = validatedData.maxUnitsPerFacility;
    if (validatedData.targetFacilityTypes !== undefined)
      updateData.targetFacilityTypes = JSON.stringify(
        validatedData.targetFacilityTypes
      );
    if (validatedData.targetFacilityTags !== undefined)
      updateData.targetFacilityTags = JSON.stringify(
        validatedData.targetFacilityTags
      );
    if (validatedData.minMonthlyGuests !== undefined)
      updateData.minMonthlyGuests = validatedData.minMonthlyGuests;
    if (validatedData.costModel !== undefined)
      updateData.costModel = validatedData.costModel;
    if (validatedData.shippingCostCoveredBy !== undefined)
      updateData.shippingCostCoveredBy = validatedData.shippingCostCoveredBy;

    // Update campaign
    const campaign = await prisma.campaign.update({
      where: { id: params.id },
      data: updateData,
    });

    // Update products if provided
    if (validatedData.productIds) {
      // Delete existing campaign products
      await prisma.campaignProduct.deleteMany({
        where: { campaignId: params.id },
      });

      // Add new products
      await Promise.all(
        validatedData.productIds.map((productId, index) =>
          prisma.campaignProduct.create({
            data: {
              campaignId: params.id,
              productId,
              unitsAllocated: Math.floor(
                (validatedData.totalUnits || existingCampaign.totalUnits) /
                  validatedData.productIds!.length
              ),
              displayOrder: index,
            },
          })
        )
      );
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE_CAMPAIGN',
        resourceType: 'campaign',
        resourceId: campaign.id,
        oldValues: JSON.stringify(existingCampaign),
        newValues: JSON.stringify(updateData),
      },
    });

    // Fetch updated campaign with relations
    const updatedCampaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      include: {
        campaignProducts: {
          include: {
            product: true,
          },
          orderBy: {
            displayOrder: 'asc',
          },
        },
      },
    });

    return NextResponse.json({
      campaign: updatedCampaign,
      message: 'キャンペーンを更新しました',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to update campaign' },
      { status: 500 }
    );
  }
}

// DELETE /api/manufacturer/campaigns/[id] - Soft delete campaign
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const manufacturer = await prisma.manufacturer.findUnique({
      where: { userId },
    });

    if (!manufacturer) {
      return NextResponse.json(
        { error: 'Manufacturer not found' },
        { status: 404 }
      );
    }

    // Check if campaign exists and belongs to this manufacturer
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: params.id,
        manufacturerId: manufacturer.id,
        deletedAt: null,
      },
      include: {
        facilityCampaigns: true,
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Don't allow deletion if there are approved facility campaigns
    const hasApprovedApplications = campaign.facilityCampaigns.some(
      (fc) => fc.status === 'approved' || fc.status === 'active'
    );

    if (hasApprovedApplications) {
      return NextResponse.json(
        {
          error:
            '承認済みまたはアクティブな施設応募があるため、このキャンペーンは削除できません。',
        },
        { status: 403 }
      );
    }

    // Soft delete campaign
    await prisma.campaign.update({
      where: { id: params.id },
      data: {
        deletedAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE_CAMPAIGN',
        resourceType: 'campaign',
        resourceId: campaign.id,
      },
    });

    return NextResponse.json({
      message: 'キャンペーンを削除しました',
    });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json(
      { error: 'Failed to delete campaign' },
      { status: 500 }
    );
  }
}
