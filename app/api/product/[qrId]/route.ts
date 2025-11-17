import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/product/[qrId] - Get product info for landing page
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ qrId: string }> }
) {
  try {
    const { qrId } = await params;
    const qrCode = await prisma.qrCode.findUnique({
      where: { id: qrId },
      include: {
        facilityProductPlacement: {
          include: {
            product: {
              include: {
                manufacturer: {
                  select: {
                    companyName: true,
                    logoUrl: true,
                  },
                },
              },
            },
            facilityCampaign: {
              include: {
                facility: {
                  select: {
                    facilityName: true,
                    facilityType: true,
                    address: true,
                  },
                },
                campaign: {
                  select: {
                    name: true,
                    description: true,
                  },
                },
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

    const product = qrCode.facilityProductPlacement.product;
    const facilityCampaign = qrCode.facilityProductPlacement.facilityCampaign;

    const responseData = {
      product: {
        id: product.id,
        name: product.name,
        nameEn: product.nameEn,
        description: product.description,
        mainImageUrl: product.mainImageUrl,
        category: product.category,
        retailPrice: product.retailPrice,
        ecUrl: product.ecUrl,
        manufacturer: product.manufacturer,
      },
      facility: facilityCampaign?.facility || null,
      campaign: facilityCampaign?.campaign || null,
      qrCode: {
        id: qrCode.id,
      },
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error fetching product data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product data' },
      { status: 500 }
    );
  }
}
