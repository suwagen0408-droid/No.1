import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // User statistics
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({
      where: { status: 'active' },
    });
    const pendingUsers = await prisma.user.count({
      where: { status: 'pending' },
    });
    const suspendedUsers = await prisma.user.count({
      where: { status: 'suspended' },
    });

    const manufacturersCount = await prisma.user.count({
      where: { role: 'manufacturer' },
    });
    const facilitiesCount = await prisma.user.count({
      where: { role: 'facility' },
    });

    // Product statistics
    const totalProducts = await prisma.product.count();
    const approvedProducts = await prisma.product.count({
      where: { status: 'approved' },
    });
    const pendingProducts = await prisma.product.count({
      where: { status: 'pending' },
    });
    const rejectedProducts = await prisma.product.count({
      where: { status: 'rejected' },
    });

    // Campaign statistics
    const totalCampaigns = await prisma.campaign.count();
    const activeCampaigns = await prisma.campaign.count({
      where: { status: 'active' },
    });
    const pendingCampaigns = await prisma.campaign.count({
      where: { status: 'pending' },
    });
    const approvedCampaigns = await prisma.campaign.count({
      where: { status: 'approved' },
    });
    const completedCampaigns = await prisma.campaign.count({
      where: { status: 'completed' },
    });

    // QR Code and Event statistics
    const totalQrCodes = await prisma.qrCode.count();
    const totalScans = await prisma.qrScanEvent.count();
    const totalClicks = await prisma.clickEvent.count();
    const totalPurchases = await prisma.purchaseEvent.count();

    // Calculate conversion rates
    const scanToClickRate = totalScans > 0 ? (totalClicks / totalScans) * 100 : 0;
    const clickToPurchaseRate = totalClicks > 0 ? (totalPurchases / totalClicks) * 100 : 0;
    const overallConversionRate = totalScans > 0 ? (totalPurchases / totalScans) * 100 : 0;

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentScans = await prisma.qrScanEvent.count({
      where: {
        scannedAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    const recentPurchases = await prisma.purchaseEvent.count({
      where: {
        purchasedAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Revenue statistics
    const totalRevenue = await prisma.purchaseEvent.aggregate({
      _sum: {
        amount: true,
      },
    });

    const recentRevenue = await prisma.purchaseEvent.aggregate({
      where: {
        purchasedAt: {
          gte: thirtyDaysAgo,
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Top performing products
    const topProducts = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        manufacturer: {
          select: {
            companyName: true,
          },
        },
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
      take: 10,
    });

    // Top performing facilities
    const topFacilities = await prisma.facility.findMany({
      where: {
        status: 'active',
      },
      select: {
        id: true,
        facilityName: true,
        facilityType: true,
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
      take: 10,
    });

    // Top performing campaigns
    const topCampaigns = await prisma.campaign.findMany({
      where: {
        status: { in: ['active', 'approved', 'completed'] },
      },
      select: {
        id: true,
        name: true,
        manufacturer: {
          select: {
            companyName: true,
          },
        },
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
      take: 10,
    });

    // Monthly trends (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyScans = await prisma.$queryRaw<Array<{ month: string; count: number }>>`
      SELECT 
        strftime('%Y-%m', scanned_at) as month,
        COUNT(*) as count
      FROM qr_scan_events
      WHERE scanned_at >= ${twelveMonthsAgo.toISOString()}
      GROUP BY strftime('%Y-%m', scanned_at)
      ORDER BY month ASC
    `;

    const monthlyPurchases = await prisma.$queryRaw<Array<{ month: string; count: number }>>`
      SELECT 
        strftime('%Y-%m', purchased_at) as month,
        COUNT(*) as count
      FROM purchase_events
      WHERE purchased_at >= ${twelveMonthsAgo.toISOString()}
      GROUP BY strftime('%Y-%m', purchased_at)
      ORDER BY month ASC
    `;

    const monthlyRevenue = await prisma.$queryRaw<Array<{ month: string; revenue: number }>>`
      SELECT 
        strftime('%Y-%m', purchased_at) as month,
        SUM(amount) as revenue
      FROM purchase_events
      WHERE purchased_at >= ${twelveMonthsAgo.toISOString()}
      GROUP BY strftime('%Y-%m', purchased_at)
      ORDER BY month ASC
    `;

    // Response data
    return NextResponse.json({
      overview: {
        users: {
          total: totalUsers,
          active: activeUsers,
          pending: pendingUsers,
          suspended: suspendedUsers,
          manufacturers: manufacturersCount,
          facilities: facilitiesCount,
        },
        products: {
          total: totalProducts,
          approved: approvedProducts,
          pending: pendingProducts,
          rejected: rejectedProducts,
        },
        campaigns: {
          total: totalCampaigns,
          active: activeCampaigns,
          approved: approvedCampaigns,
          pending: pendingCampaigns,
          completed: completedCampaigns,
        },
        engagement: {
          totalQrCodes,
          totalScans,
          totalClicks,
          totalPurchases,
          scanToClickRate: parseFloat(scanToClickRate.toFixed(2)),
          clickToPurchaseRate: parseFloat(clickToPurchaseRate.toFixed(2)),
          overallConversionRate: parseFloat(overallConversionRate.toFixed(2)),
        },
        revenue: {
          total: totalRevenue._sum.amount || 0,
          recent30Days: recentRevenue._sum.amount || 0,
        },
        recent30Days: {
          scans: recentScans,
          purchases: recentPurchases,
        },
      },
      topPerformers: {
        products: topProducts.map((p) => ({
          id: p.id,
          name: p.name,
          manufacturer: p.manufacturer.companyName,
          scans: p._count.qrScanEvents,
          purchases: p._count.purchaseEvents,
        })),
        facilities: topFacilities.map((f) => ({
          id: f.id,
          name: f.facilityName,
          type: f.facilityType,
          scans: f._count.qrScanEvents,
          purchases: f._count.purchaseEvents,
        })),
        campaigns: topCampaigns.map((c) => ({
          id: c.id,
          name: c.name,
          manufacturer: c.manufacturer.companyName,
          scans: c._count.qrScanEvents,
          purchases: c._count.purchaseEvents,
        })),
      },
      trends: {
        monthlyScans,
        monthlyPurchases,
        monthlyRevenue,
      },
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
