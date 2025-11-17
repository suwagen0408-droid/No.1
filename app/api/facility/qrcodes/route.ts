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
        qrScanEvents: {
          select: {
            id: true,
            clickEvents: {
              select: {
                id: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format the response with computed counts and proper field names
    const formattedQrCodes = qrCodes.map((qrCode) => {
      // Count click events across all scan events
      const clickEventsCount = qrCode.qrScanEvents.reduce(
        (total, scanEvent) => total + scanEvent.clickEvents.length,
        0
      );
      
      // For now, purchaseEvents are not linked to QR codes in the schema
      // So we return 0, but this should be fixed in the schema later
      const purchaseEventsCount = 0;
      
      return {
        id: qrCode.id,
        url: qrCode.url, // Use 'url' field instead of 'qrCodeUrl'
        codeString: qrCode.codeString,
        createdAt: qrCode.createdAt,
        expiresAt: qrCode.expiresAt,
        facilityProductPlacement: qrCode.facilityProductPlacement,
        _count: {
          qrScanEvents: qrCode.qrScanEvents.length,
          clickEvents: clickEventsCount,
          purchaseEvents: purchaseEventsCount,
        },
      };
    });
    
    return NextResponse.json({ qrCodes: formattedQrCodes });
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

    // Generate unique code string (use UUID format for consistency)
    const codeString = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Get the base URL from the request
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;
    
    // Create URL that points to the product landing PAGE (not API)
    // We'll use the QR code ID (will be generated) in the URL
    const qrCodeUrl = `${baseUrl}/product/PLACEHOLDER_ID`;

    // Create QR code with required schema fields (with placeholder URL first)
    const qrCode = await prisma.qrCode.create({
      data: {
        codeString,
        url: qrCodeUrl, // Will be updated below
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
    
    // Update the URL with the actual QR code ID (pointing to landing page, not API)
    const actualQrCodeUrl = `${baseUrl}/product/${qrCode.id}`;
    await prisma.qrCode.update({
      where: { id: qrCode.id },
      data: { url: actualQrCodeUrl },
    });

    return NextResponse.json(
      {
        qrCode: {
          ...qrCode,
          url: actualQrCodeUrl, // Return the updated URL
        },
        message: 'QR code generated successfully',
        // Generate QR code image using the actual URL
        qrImageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(actualQrCodeUrl)}`,
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

    console.error('Error generating QR code:', error);
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}
