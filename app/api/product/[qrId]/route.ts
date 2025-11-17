import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/product/[qrId] - Get product info for landing page
export async function GET(
  request: NextRequest,
  { params }: { params: { qrId: string } }
) {
  try {
    const qrCode = await prisma.qrCode.findUnique({
      where: { id: params.qrId },
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

    if (!qrCode.isActive) {
      return NextResponse.json({ error: 'QR code is inactive' }, { status: 400 });
    }

    const product = qrCode.facilityProductPlacement.product;
    const facilityCampaign = qrCode.facilityProductPlacement.facilityCampaign;

    // Parse JSON fields
    const features = product.features ? JSON.parse(product.features as string) : [];
    const additionalImageUrls = product.additionalImageUrls
      ? JSON.parse(product.additionalImageUrls as string)
      : [];

    const responseData = {
      product: {
        id: product.id,
        name: product.name,
        nameEn: product.nameEn,
        description: product.description,
        mainImageUrl: product.mainImageUrl,
        additionalImageUrls,
        category: product.category,
        retailPrice: product.retailPrice,
        ecUrl: product.ecUrl,
        features,
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
