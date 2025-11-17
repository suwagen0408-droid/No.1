import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const manufacturer = await prisma.manufacturer.findUnique({
      where: { userId },
    });

    if (!manufacturer) {
      return NextResponse.json(
        { error: 'Manufacturer not found' },
        { status: 404 }
      );
    }

    // Product statistics
    const totalProducts = await prisma.product.count({
      where: {
        manufacturerId: manufacturer.id,
        deletedAt: null,
      },
    });

    const approvedProducts = await prisma.product.count({
      where: {
        manufacturerId: manufacturer.id,
        status: 'approved',
        deletedAt: null,
      },
    });

    const pendingProducts = await prisma.product.count({
      where: {
        manufacturerId: manufacturer.id,
        status: 'pending',
        deletedAt: null,
      },
    });

    // Campaign statistics
    const totalCampaigns = await prisma.campaign.count({
      where: {
        manufacturerId: manufacturer.id,
        deletedAt: null,
      },
    });

    const activeCampaigns = await prisma.campaign.count({
      where: {
        manufacturerId: manufacturer.id,
        status: 'active',
        deletedAt: null,
      },
    });

    const pendingCampaigns = await prisma.campaign.count({
      where: {
        manufacturerId: manufacturer.id,
        status: 'pending',
        deletedAt: null,
      },
    });

    // Engagement statistics
    const totalScans = await prisma.qrScanEvent.count({
      where: {
        product: {
          manufacturerId: manufacturer.id,
        },
      },
    });

    const totalClicks = await prisma.clickEvent.count({
      where: {
        product: {
          manufacturerId: manufacturer.id,
        },
      },
    });

    const totalPurchases = await prisma.purchaseEvent.count({
      where: {
        product: {
          manufacturerId: manufacturer.id,
        },
      },
    });

    // Revenue
    const revenue = await prisma.purchaseEvent.aggregate({
      where: {
        product: {
          manufacturerId: manufacturer.id,
        },
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
        product: {
          manufacturerId: manufacturer.id,
        },
        scannedAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    const recentPurchases = await prisma.purchaseEvent.count({
      where: {
        product: {
          manufacturerId: manufacturer.id,
        },
        purchasedAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    const recentRevenue = await prisma.purchaseEvent.aggregate({
      where: {
        product: {
          manufacturerId: manufacturer.id,
        },
        purchasedAt: {
          gte: thirtyDaysAgo,
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Top products
    const topProducts = await prisma.product.findMany({
      where: {
        manufacturerId: manufacturer.id,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        mainImageUrl: true,
        _count: {
          select: {
            qrScanEvents: true,
            purchaseEvents: true,
          },
        },
      },
      orderBy: {
        qrScanEvents: {
          _count: 'desc',
        },
      },
      take: 5,
    });

    // Participating facilities
    const facilities = await prisma.facilityCampaign.findMany({
      where: {
        campaign: {
          manufacturerId: manufacturer.id,
        },
        status: { in: ['approved', 'active'] },
      },
      include: {
        facility: {
          select: {
            id: true,
            facilityName: true,
            facilityType: true,
          },
        },
        campaign: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      distinct: ['facilityId'],
    });

    return NextResponse.json({
      products: {
        total: totalProducts,
        approved: approvedProducts,
        pending: pendingProducts,
      },
      campaigns: {
        total: totalCampaigns,
        active: activeCampaigns,
        pending: pendingCampaigns,
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
        recent30Days: recentRevenue._sum.amount || 0,
      },
      recent30Days: {
        scans: recentScans,
        purchases: recentPurchases,
      },
      topProducts: topProducts.map((p) => ({
        id: p.id,
        name: p.name,
        imageUrl: p.mainImageUrl,
        scans: p._count.qrScanEvents,
        purchases: p._count.purchaseEvents,
      })),
      facilities: facilities.map((fc) => ({
        id: fc.facility.id,
        name: fc.facility.facilityName,
        type: fc.facility.facilityType,
        campaignName: fc.campaign.name,
      })),
    });
  } catch (error) {
    console.error('Error fetching manufacturer stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
