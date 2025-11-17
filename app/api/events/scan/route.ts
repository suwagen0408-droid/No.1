import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const scanEventSchema = z.object({
  qrCodeId: z.string().uuid(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  location: z.string().optional(),
});

// POST /api/events/scan - Record QR code scan event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = scanEventSchema.parse(body);

    // Verify QR code exists
    const qrCode = await prisma.qrCode.findUnique({
      where: { id: validatedData.qrCodeId },
      include: {
        facilityProductPlacement: {
          include: {
            product: true,
            facilityCampaign: {
              include: {
                campaign: true,
              },
            },
          },
        },
      },
    });

    if (!qrCode) {
      return NextResponse.json({ error: 'QR code not found' }, { status: 404 });
    }

    // Check if QR code is expired
    if (qrCode.expiresAt && new Date() > qrCode.expiresAt) {
      return NextResponse.json({ error: 'QR code has expired' }, { status: 400 });
    }

    // Create scan event
    const scanEvent = await prisma.qrScanEvent.create({
      data: {
        qrCodeId: validatedData.qrCodeId,
        productId: qrCode.facilityProductPlacement.productId,
        facilityId: qrCode.facilityId, // Use facilityId from QrCode
        facilityProductPlacementId: qrCode.facilityProductPlacementId,
        campaignId: qrCode.campaignId || null,
        userAgent: validatedData.userAgent || null,
        ipHash: validatedData.ipAddress ? validatedData.ipAddress.substring(0, 64) : null, // Hash or truncate IP
        sessionId: validatedData.ipAddress || null, // Use IP as session for now
      },
    });

    // Note: Scan count can be derived from qrScanEvents count

    return NextResponse.json(
      {
        scanEvent: {
          id: scanEvent.id,
          timestamp: scanEvent.scannedAt,
        },
        product: {
          id: qrCode.facilityProductPlacement.product.id,
          name: qrCode.facilityProductPlacement.product.name,
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

    console.error('Error recording scan event:', error);
    return NextResponse.json(
      { error: 'Failed to record scan event' },
      { status: 500 }
    );
  }
}
