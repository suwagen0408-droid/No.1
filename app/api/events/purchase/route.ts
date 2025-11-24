import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, campaignId, facilityId, sessionId, amount } = body;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Get product to verify it exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        retailPrice: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Create purchase event
    const purchaseEvent = await prisma.purchaseEvent.create({
      data: {
        productId,
        campaignId: campaignId || null,
        facilityId: facilityId || null,
        sessionId: sessionId || null,
        amount: amount || product.retailPrice,
        purchasedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      eventId: purchaseEvent.id,
    });
  } catch (error) {
    console.error('Error recording purchase event:', error);
    return NextResponse.json(
      { error: 'Failed to record purchase event' },
      { status: 500 }
    );
  }
}
