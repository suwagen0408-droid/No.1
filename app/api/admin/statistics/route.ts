import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/admin/statistics - Get comprehensive platform statistics
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Verify user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Get date range from query params
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    // Aggregate statistics
    const [
      totalUsers,
      totalManufacturers,
      totalFacilities,
      totalProducts,
      totalCampaigns,
      activeCampaigns,
      totalPlacements,
      totalQRScans,
      totalClicks,
      totalPurchases,
      totalInvoices,
      paidInvoices,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.manufacturer.count({ where: { approvedAt: { not: null } } }),
      prisma.facility.count({ where: { approvedAt: { not: null } } }),
      prisma.product.count({ where: { status: 'approved' } }),
      prisma.campaign.count(),
      prisma.campaign.count({ where: { status: 'active' } }),
      prisma.facilityProductPlacement.count(),
      prisma.qrScanEvent.count(dateFilter.gte || dateFilter.lte ? { where: { scannedAt: dateFilter } } : {}),
      prisma.clickEvent.count(dateFilter.gte || dateFilter.lte ? { where: { clickedAt: dateFilter } } : {}),
      prisma.purchaseEvent.count(dateFilter.gte || dateFilter.lte ? { where: { purchasedAt: dateFilter } } : {}),
      prisma.invoice.count(),
      prisma.invoice.count({ where: { paymentStatus: 'completed' } }),
    ]);

    // Calculate conversion rates
    const scanToClickRate = totalQRScans > 0 ? ((totalClicks / totalQRScans) * 100).toFixed(2) : '0.00';
    const clickToPurchaseRate = totalClicks > 0 ? ((totalPurchases / totalClicks) * 100).toFixed(2) : '0.00';
    const scanToPurchaseRate = totalQRScans > 0 ? ((totalPurchases / totalQRScans) * 100).toFixed(2) : '0.00';

    // Get revenue data
    const revenueData = await prisma.purchaseEvent.aggregate({
      _sum: {
        amount: true,
      },
      where: dateFilter.gte || dateFilter.lte ? { purchasedAt: dateFilter } : {},
    });

    const totalRevenue = revenueData._sum.amount || 0;

    // Get invoice data
    const invoiceData = await prisma.invoice.aggregate({
      _sum: {
        total: true,
      },
      where: { paymentStatus: 'completed' },
    });

    const totalInvoiceRevenue = invoiceData._sum.total || 0;

    // Monthly trends (last 12 months)
    const monthlyData = await getMonthlyTrends(12);

    // Top performing campaigns
    const topCampaigns = await prisma.campaign.findMany({
      take: 5,
      include: {
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
    });

    // Top performing products
    const topProducts = await prisma.product.findMany({
      take: 5,
      include: {
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
    });

    // Top facilities by engagement
    const topFacilities = await prisma.facility.findMany({
      take: 5,
      where: {
        approvedAt: { not: null },
      },
      include: {
        _count: {
          select: {
            qrScanEvents: true,
            facilityCampaigns: true,
          },
        },
      },
      orderBy: {
        qrScanEvents: {
          _count: 'desc',
        },
      },
    });

    return NextResponse.json(
      {
        overview: {
          totalUsers,
          totalManufacturers,
          totalFacilities,
          totalProducts,
          totalCampaigns,
          activeCampaigns,
          totalPlacements,
        },
        engagement: {
          totalQRScans,
          totalClicks,
          totalPurchases,
          scanToClickRate: parseFloat(scanToClickRate),
          clickToPurchaseRate: parseFloat(clickToPurchaseRate),
          scanToPurchaseRate: parseFloat(scanToPurchaseRate),
        },
        revenue: {
          totalRevenue,
          totalInvoices,
          paidInvoices,
          totalInvoiceRevenue,
          averageOrderValue: totalPurchases > 0 ? totalRevenue / totalPurchases : 0,
        },
        trends: {
          monthly: monthlyData,
        },
        topPerformers: {
          campaigns: topCampaigns,
          products: topProducts,
          facilities: topFacilities,
        },
      },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (error) {
    console.error('Statistics retrieval error:', error);
    return NextResponse.json(
      { error: '統計情報の取得に失敗しました' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}

// Helper function to get monthly trends
async function getMonthlyTrends(months: number) {
  const now = new Date();
  const monthlyData = [];

  for (let i = months - 1; i >= 0; i--) {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

    const [scans, clicks, purchases] = await Promise.all([
      prisma.qrScanEvent.count({
        where: {
          scannedAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      }),
      prisma.clickEvent.count({
        where: {
          clickedAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      }),
      prisma.purchaseEvent.count({
        where: {
          purchasedAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      }),
    ]);

    monthlyData.push({
      month: startOfMonth.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short' }),
      scans,
      clicks,
      purchases,
    });
  }

  return monthlyData;
}
