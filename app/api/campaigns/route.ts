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

/**
 * GET /api/campaigns
 * Get campaigns based on user role:
 * - manufacturer: Get their own campaigns
 * - facility: Get all approved campaigns or their applied campaigns
 * - admin: Get all campaigns (with optional status filter)
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const myApplications = searchParams.get('myApplications') === 'true';
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user and their role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        manufacturer: true,
        facility: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let campaigns;

    // Role-based campaign fetching
    if (user.role === 'manufacturer') {
      if (!user.manufacturer) {
        return NextResponse.json(
          { error: 'Manufacturer profile not found' },
          { status: 404 }
        );
      }

      campaigns = await prisma.campaign.findMany({
        where: {
          manufacturerId: user.manufacturer.id,
          deletedAt: null,
          ...(status && { status }),
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
        orderBy: { createdAt: 'desc' },
      });
    } else if (user.role === 'facility') {
      if (!user.facility) {
        return NextResponse.json(
          { error: 'Facility profile not found' },
          { status: 404 }
        );
      }

      if (myApplications) {
        // Get campaigns the facility has applied to
        campaigns = await prisma.campaign.findMany({
          where: {
            deletedAt: null,
            facilityCampaigns: {
              some: {
                facilityId: user.facility.id,
              },
            },
          },
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
                    mainImageUrl: true,
                    category: true,
                  },
                },
              },
            },
            facilityCampaigns: {
              where: {
                facilityId: user.facility.id,
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
          orderBy: { createdAt: 'desc' },
        });
      } else {
        // Get all approved campaigns available to apply
        campaigns = await prisma.campaign.findMany({
          where: {
            status: 'approved',
            deletedAt: null,
          },
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
                    mainImageUrl: true,
                    category: true,
                  },
                },
              },
            },
            facilityCampaigns: {
              where: {
                facilityId: user.facility.id,
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
          orderBy: { createdAt: 'desc' },
        });
      }
    } else if (user.role === 'admin') {
      // Admin sees all campaigns with optional status filter
      campaigns = await prisma.campaign.findMany({
        where: {
          deletedAt: null,
          ...(status && { status }),
        },
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
                  mainImageUrl: true,
                  category: true,
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
        orderBy: { createdAt: 'desc' },
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid user role' },
        { status: 403 }
      );
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

/**
 * POST /api/campaigns
 * Create a new campaign (manufacturer only)
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get manufacturer
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { manufacturer: true },
    });

    if (!user || user.role !== 'manufacturer' || !user.manufacturer) {
      return NextResponse.json(
        { error: 'Only manufacturers can create campaigns' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = campaignSchema.parse(body);
    const { productIds, ...campaignData } = validatedData;

    // Verify all products belong to this manufacturer
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        manufacturerId: user.manufacturer.id,
        status: 'approved',
        deletedAt: null,
      },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { error: 'Some products are invalid or not approved' },
        { status: 400 }
      );
    }

    // Create campaign with product relations
    const campaign = await prisma.campaign.create({
      data: {
        ...campaignData,
        manufacturerId: user.manufacturer.id,
        status: 'draft',
        campaignProducts: {
          create: productIds.map((productId) => ({
            productId,
          })),
        },
      },
      include: {
        campaignProducts: {
          include: {
            product: true,
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

    return NextResponse.json({
      message: 'Campaign created successfully',
      campaign,
    });
  } catch (error) {
    console.error('Error creating campaign:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
