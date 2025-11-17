import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const purchaseEventSchema = z.object({
  qrCodeId: z.string().uuid(),
  productId: z.string().uuid(),
  clickEventId: z.string().uuid().optional(),
  scanEventId: z.string().uuid().optional(),
  purchaseAmount: z.number().min(0),
  quantity: z.number().int().min(1).default(1),
  orderId: z.string().optional(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
});

// POST /api/events/purchase - Record purchase event (webhook from EC)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = purchaseEventSchema.parse(body);

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

    // Create purchase event
    const purchaseEvent = await prisma.purchaseEvent.create({
      data: {
        productId: validatedData.productId,
        facilityId: qrCode?.facilityProductPlacement.facilityCampaign?.facilityId || null,
        campaignId: qrCode?.facilityProductPlacement.facilityCampaign?.campaignId || null,
        clickEventId: validatedData.clickEventId || null,
        externalOrderId: validatedData.orderId || `order-${Date.now()}`,
        amount: validatedData.purchaseAmount,
        quantity: validatedData.quantity,
        purchasedAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        purchaseEvent: {
          id: purchaseEvent.id,
          timestamp: purchaseEvent.purchasedAt,
          amount: purchaseEvent.amount,
        },
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

    console.error('Error recording purchase event:', error);
    return NextResponse.json(
      { error: 'Failed to record purchase event' },
      { status: 500 }
    );
  }
}
