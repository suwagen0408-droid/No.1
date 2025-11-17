import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
      return NextResponse.json(
        { error: 'Facility not found' },
        { status: 404 }
      );
    }

    // Campaign participation statistics
    const totalCampaigns = await prisma.facilityCampaign.count({
      where: {
        facilityId: facility.id,
      },
    });

    const activeCampaigns = await prisma.facilityCampaign.count({
      where: {
        facilityId: facility.id,
        status: { in: ['approved', 'active'] },
      },
    });

    const pendingCampaigns = await prisma.facilityCampaign.count({
      where: {
        facilityId: facility.id,
        status: 'pending',
      },
    });

    // QR Code statistics
    const totalQrCodes = await prisma.qrCode.count({
      where: {
        facilityId: facility.id,
      },
    });

    // Engagement statistics
    const totalScans = await prisma.qrScanEvent.count({
      where: {
        facilityId: facility.id,
      },
    });

    const totalClicks = await prisma.clickEvent.count({
      where: {
        facilityId: facility.id,
      },
    });

    const totalPurchases = await prisma.purchaseEvent.count({
      where: {
        facilityId: facility.id,
      },
    });

    // Revenue contribution
    const revenue = await prisma.purchaseEvent.aggregate({
      where: {
        facilityId: facility.id,
      },
      _sum: {
        amount: true,
      },
    });

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentScans = await prisma.qrScanEvent.count({
      where: {
        facilityId: facility.id,
        scannedAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    const recentPurchases = await prisma.purchaseEvent.count({
      where: {
        facilityId: facility.id,
        purchasedAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Active campaigns with details
    const activeCampaignDetails = await prisma.facilityCampaign.findMany({
      where: {
        facilityId: facility.id,
        status: { in: ['approved', 'active'] },
      },
      include: {
        campaign: {
          include: {
            manufacturer: {
              select: {
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
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    // Top performing products at this facility
    const topProducts = await prisma.qrScanEvent.groupBy({
      by: ['productId'],
      where: {
        facilityId: facility.id,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 5,
    });

    const topProductDetails = await Promise.all(
      topProducts.map(async (tp) => {
        const product = await prisma.product.findUnique({
          where: { id: tp.productId },
          select: {
            id: true,
            name: true,
            mainImageUrl: true,
            manufacturer: {
              select: {
                companyName: true,
              },
            },
          },
        });

        const purchases = await prisma.purchaseEvent.count({
          where: {
            productId: tp.productId,
            facilityId: facility.id,
          },
        });

        return {
          ...product,
          scans: tp._count.id,
          purchases,
        };
      })
    );

    // Product placements (inventory)
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      campaigns: {
        total: totalCampaigns,
        active: activeCampaigns,
        pending: pendingCampaigns,
      },
      qrCodes: {
        total: totalQrCodes,
      },
      engagement: {
        totalScans,
        totalClicks,
        totalPurchases,
        conversionRate:
          totalScans > 0 ? ((totalPurchases / totalScans) * 100).toFixed(2) : 0,
      },
      revenue: {
        total: revenue._sum.amount || 0,
      },
      recent30Days: {
        scans: recentScans,
        purchases: recentPurchases,
      },
      activeCampaigns: activeCampaignDetails.map((fc) => ({
        id: fc.id,
        campaignId: fc.campaign.id,
        campaignName: fc.campaign.name,
        manufacturer: fc.campaign.manufacturer.companyName,
        status: fc.status,
        approvedUnits: fc.approvedUnits,
        products: fc.campaign.campaignProducts.map((cp) => ({
          id: cp.product.id,
          name: cp.product.name,
          imageUrl: cp.product.mainImageUrl,
        })),
      })),
      topProducts: topProductDetails.filter((p) => p !== null),
      placements: placements.map((p) => ({
        id: p.id,
        productName: p.product.name,
        productImageUrl: p.product.mainImageUrl,
        campaignName: p.facilityCampaign.campaign.name,
        locationLabel: p.locationLabel,
        currentUnits: p.currentUnits,
        reorderThreshold: p.reorderThreshold,
        needsReorder: p.currentUnits <= p.reorderThreshold,
      })),
    });
  } catch (error) {
    console.error('Error fetching facility stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
