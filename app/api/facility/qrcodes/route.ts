import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const qrCodeSchema = z.object({
  facilityProductPlacementId: z.string().uuid(),
  label: z.string().optional(),
});

// GET /api/facility/qrcodes - Get all QR codes for facility
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

    const qrCodes = await prisma.qrCode.findMany({
      where: {
        facilityProductPlacement: {
          facilityCampaign: {
            facilityId: facility.id,
          },
        },
      },
      include: {
        facilityProductPlacement: {
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
        },
        _count: {
          select: {
            qrScanEvents: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ qrCodes });
  } catch (error) {
    console.error('Error fetching QR codes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch QR codes' },
      { status: 500 }
    );
  }
}

// POST /api/facility/qrcodes - Generate new QR code
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
    const validatedData = qrCodeSchema.parse(body);

    // Verify placement belongs to this facility
    const placement = await prisma.facilityProductPlacement.findFirst({
      where: {
        id: validatedData.facilityProductPlacementId,
        facilityCampaign: {
          facilityId: facility.id,
        },
      },
      include: {
        product: true,
        facilityCampaign: {
          select: {
            campaignId: true,
          },
        },
      },
    });

    if (!placement) {
      return NextResponse.json(
        { error: 'Placement not found or not authorized' },
        { status: 403 }
      );
    }

    // Generate unique code string
    const codeString = `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // In production, you would generate actual QR code image here
    // For now, we'll just store a URL that points to the landing page
    const qrCodeUrl = `https://essc-platform.com/product/${codeString}`;

    // Create QR code with required schema fields
    const qrCode = await prisma.qrCode.create({
      data: {
        codeString,
        url: qrCodeUrl,
        productId: placement.productId,
        facilityId: facility.id,
        facilityProductPlacementId: validatedData.facilityProductPlacementId,
        campaignId: placement.facilityCampaign.campaignId,
      },
      include: {
        facilityProductPlacement: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                mainImageUrl: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(
      {
        qrCode,
        message: 'QR code generated successfully',
        // In production, return actual QR code image URL
        qrImageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCodeUrl)}`,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error generating QR code:', error);
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}
