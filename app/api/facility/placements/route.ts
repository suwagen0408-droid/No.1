import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const placementSchema = z.object({
  facilityCampaignId: z.string().uuid(),
  productId: z.string().uuid(),
  locationLabel: z.string().min(1),
  initialUnits: z.number().int().min(1),
  reorderThreshold: z.number().int().min(0).default(5),
});

// GET /api/facility/placements - Get all placements for facility
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const facility = await prisma.facility.findUnique({
      where: { userId },
    });

    if (!facility) {
      return NextResponse.json({ error: 'Facility not found' }, { status: 404 });
    }

    const placements = await prisma.facilityProductPlacement.findMany({
      where: {
        facilityCampaign: {
          facilityId: facility.id,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            mainImageUrl: true,
            category: true,
            manufacturer: {
              select: {
                companyName: true,
              },
            },
          },
        },
        facilityCampaign: {
          include: {
            campaign: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        qrCodes: {
          select: {
            id: true,
            url: true,
            codeString: true,
            _count: {
              select: {
                qrScanEvents: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ placements });
  } catch (error) {
    console.error('Error fetching placements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch placements' },
      { status: 500 }
    );
  }
}

// POST /api/facility/placements - Create new placement
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const facility = await prisma.facility.findUnique({
      where: { userId },
    });

    if (!facility) {
      return NextResponse.json({ error: 'Facility not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = placementSchema.parse(body);

    // Verify facility campaign belongs to this facility
    const facilityCampaign = await prisma.facilityCampaign.findUnique({
      where: { id: validatedData.facilityCampaignId },
      include: {
        campaign: {
          include: {
            campaignProducts: true,
          },
        },
      },
    });

    if (!facilityCampaign || facilityCampaign.facilityId !== facility.id) {
      return NextResponse.json(
        { error: 'Campaign not found or not authorized' },
        { status: 403 }
      );
    }

    if (facilityCampaign.status !== 'approved') {
      return NextResponse.json(
        { error: 'Campaign must be approved before placing products' },
        { status: 400 }
      );
    }

    // Verify product is in the campaign
    const productInCampaign = facilityCampaign.campaign.campaignProducts.some(
      (cp) => cp.productId === validatedData.productId
    );

    if (!productInCampaign) {
      return NextResponse.json(
        { error: 'Product is not part of this campaign' },
        { status: 400 }
      );
    }

    // Create placement
    const placement = await prisma.facilityProductPlacement.create({
      data: {
        facilityCampaignId: validatedData.facilityCampaignId,
        productId: validatedData.productId,
        locationLabel: validatedData.locationLabel,
        initialUnits: validatedData.initialUnits,
        currentUnits: validatedData.initialUnits,
        reorderThreshold: validatedData.reorderThreshold,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            mainImageUrl: true,
          },
        },
        facilityCampaign: {
          include: {
            campaign: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Create stock log
    await prisma.stockLog.create({
      data: {
        facilityProductPlacementId: placement.id,
        changeType: 'initial',
        quantity: validatedData.initialUnits,
        beforeUnits: 0,
        afterUnits: validatedData.initialUnits,
        note: 'Initial placement',
        loggedBy: userId,
      },
    });

    return NextResponse.json(
      { placement, message: 'Placement created successfully' },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating placement:', error);
    return NextResponse.json(
      { error: 'Failed to create placement' },
      { status: 500 }
    );
  }
}
