import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const clickEventSchema = z.object({
  qrCodeId: z.string().uuid(),
  productId: z.string().uuid(),
  scanEventId: z.string().uuid().optional(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
});

// POST /api/events/click - Record EC click event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = clickEventSchema.parse(body);

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: validatedData.productId },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Get QR code info for facility and campaign
    const qrCode = await prisma.qrCode.findUnique({
      where: { id: validatedData.qrCodeId },
      include: {
        facilityProductPlacement: {
          include: {
            facilityCampaign: true,
          },
        },
      },
    });

    // Create click event
    const clickEvent = await prisma.clickEvent.create({
      data: {
        qrCodeId: validatedData.qrCodeId,
        productId: validatedData.productId,
        facilityId: qrCode?.facilityProductPlacement.facilityCampaign?.facilityId,
        campaignId: qrCode?.facilityProductPlacement.facilityCampaign?.campaignId,
        scanEventId: validatedData.scanEventId,
        userAgent: validatedData.userAgent,
        ipAddress: validatedData.ipAddress,
      },
    });

    return NextResponse.json(
      {
        clickEvent: {
          id: clickEvent.id,
          timestamp: clickEvent.clickedAt,
        },
        redirectUrl: product.ecUrl,
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

    console.error('Error recording click event:', error);
    return NextResponse.json(
      { error: 'Failed to record click event' },
      { status: 500 }
    );
  }
}
