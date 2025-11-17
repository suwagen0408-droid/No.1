import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { CampaignStatus } from '@prisma/client';

const updateCampaignSchema = z.object({
  name: z.string().min(1).optional(),
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
  status: z.enum(['draft', 'pending', 'approved', 'active', 'paused', 'completed', 'archived']).optional(),
});

// GET /api/admin/campaigns/[id] - Get campaign details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin
    const adminUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      include: {
        manufacturer: {
          select: {
            id: true,
            companyName: true,
          },
        },
        campaignProducts: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
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
    return NextResponse.json({ error: 'Failed to fetch campaign' }, { status: 500 });
  }
}

// PUT /api/admin/campaigns/[id] - Update campaign
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin
    const adminUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateCampaignSchema.parse(body);

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
      updateData.targetFacilityTypes = JSON.stringify(validatedData.targetFacilityTypes);
    if (validatedData.targetFacilityTags !== undefined)
      updateData.targetFacilityTags = JSON.stringify(validatedData.targetFacilityTags);
    if (validatedData.minMonthlyGuests !== undefined)
      updateData.minMonthlyGuests = validatedData.minMonthlyGuests;
    if (validatedData.costModel !== undefined)
      updateData.costModel = validatedData.costModel;
    if (validatedData.shippingCostCoveredBy !== undefined)
      updateData.shippingCostCoveredBy = validatedData.shippingCostCoveredBy;
    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status;
      // If approving, set approvedAt and approvedBy
      if (validatedData.status === 'approved' || validatedData.status === 'active') {
        updateData.approvedAt = new Date();
        updateData.approvedBy = userId;
      }
    }

    const campaign = await prisma.campaign.update({
      where: { id: params.id },
      data: updateData,
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'ADMIN_UPDATE_CAMPAIGN',
        resourceType: 'campaign',
        resourceId: params.id,
        newValues: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ campaign, message: 'キャンペーン情報を更新しました' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    console.error('Error updating campaign:', error);
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
  }
}

// DELETE /api/admin/campaigns/[id] - Delete campaign
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin
    const adminUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Soft delete
    await prisma.campaign.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'ADMIN_DELETE_CAMPAIGN',
        resourceType: 'campaign',
        resourceId: params.id,
      },
    });

    return NextResponse.json({ message: 'キャンペーンを削除しました' });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
  }
}
