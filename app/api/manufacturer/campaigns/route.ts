import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const campaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  description: z.string().optional(),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  totalUnits: z.number().int().min(1),
  maxUnitsPerFacility: z.number().int().min(1).optional(),
  targetFacilityTypes: z.array(z.string()).optional(),
  targetFacilityTags: z.array(z.string()).optional(),
  minMonthlyGuests: z.number().int().optional(),
  costModel: z.enum(['free', 'paid_sampling', 'invoice_later', 'cost_price', 'discounted']).default('free'),
  paymentTiming: z.enum(['none', 'on_approval', 'monthly_invoice']).default('none'),
  unitPrice: z.number().min(0).optional(),
  shippingFee: z.number().min(0).optional(),
  shippingCostCoveredBy: z
    .enum(['manufacturer', 'facility', 'split'])
    .default('manufacturer'),
  productIds: z.array(z.string()).min(1, 'At least one product is required'),
});

// GET /api/manufacturer/campaigns - Get all campaigns
export async function GET(request: NextRequest) {
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

    const campaigns = await prisma.campaign.findMany({
      where: {
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
              },
            },
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
            purchaseEvents: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Auto-activate campaigns that are approved and past their start date
    const now = new Date();
    const campaignsToActivate = campaigns.filter(
      (c) => c.status === 'approved' && new Date(c.startDate) <= now
    );

    if (campaignsToActivate.length > 0) {
      await Promise.all(
        campaignsToActivate.map((campaign) =>
          prisma.campaign.update({
            where: { id: campaign.id },
            data: { status: 'active' },
          })
        )
      );

      // Re-fetch campaigns with updated status
      const updatedCampaigns = await prisma.campaign.findMany({
        where: {
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
                },
              },
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
              purchaseEvents: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return NextResponse.json({ campaigns: updatedCampaigns });
    }

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

// POST /api/manufacturer/campaigns - Create new campaign
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const validatedData = campaignSchema.parse(body);

    // Verify all products belong to this manufacturer
    const products = await prisma.product.findMany({
      where: {
        id: { in: validatedData.productIds },
        manufacturerId: manufacturer.id,
        status: 'approved', // Only approved products can be in campaigns
      },
    });

    if (products.length !== validatedData.productIds.length) {
      return NextResponse.json(
        {
          error:
            'Some products not found or not approved. All products must be approved before creating a campaign.',
        },
        { status: 400 }
      );
    }

    // Create campaign
    const campaign = await prisma.campaign.create({
      data: {
        manufacturerId: manufacturer.id,
        name: validatedData.name,
        description: validatedData.description,
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
        totalUnits: validatedData.totalUnits,
        maxUnitsPerFacility: validatedData.maxUnitsPerFacility,
        targetFacilityTypes: JSON.stringify(
          validatedData.targetFacilityTypes || []
        ),
        targetFacilityTags: JSON.stringify(validatedData.targetFacilityTags || []),
        minMonthlyGuests: validatedData.minMonthlyGuests,
        costModel: validatedData.costModel,
        paymentTiming: validatedData.paymentTiming,
        unitPrice: validatedData.unitPrice || null,
        shippingFee: validatedData.shippingFee || null,
        shippingCostCoveredBy: validatedData.shippingCostCoveredBy,
        status: 'pending', // Requires admin approval
      },
    });

    // Add products to campaign
    await Promise.all(
      validatedData.productIds.map((productId, index) =>
        prisma.campaignProduct.create({
          data: {
            campaignId: campaign.id,
            productId,
            unitsAllocated: Math.floor(
              validatedData.totalUnits / validatedData.productIds.length
            ),
            displayOrder: index,
          },
        })
      )
    );

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE_CAMPAIGN',
        resourceType: 'campaign',
        resourceId: campaign.id,
        newValues: JSON.stringify(validatedData),
      },
    });

    // Notify admins about new campaign
    const { notifyAdminsNewCampaign } = await import('@/lib/notifications');
    await notifyAdminsNewCampaign(campaign.name, manufacturer.companyName);

    // Fetch complete campaign data
    const completeCampaign = await prisma.campaign.findUnique({
      where: { id: campaign.id },
      include: {
        campaignProducts: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        campaign: completeCampaign,
        message: 'Campaign created successfully. Waiting for admin approval.',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
