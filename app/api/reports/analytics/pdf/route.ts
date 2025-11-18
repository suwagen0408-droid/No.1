import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateReportPDF, ReportData } from '@/lib/report-generator';

/**
 * GET /api/reports/analytics/pdf
 * Generate analytics report PDF
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // Verify admin access
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'アクセス権限がありません' },
        { status: 403 }
      );
    }

    // Get query parameters for date range
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Default to last 30 days if not specified
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Fetch analytics data (simplified for demo)
    const [
      totalUsers,
      totalCampaigns,
      totalScans,
      totalPurchases,
      products,
      facilities,
      campaigns,
    ] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.campaign.count({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.qrScanEvent.count({ where: { scannedAt: { gte: start, lte: end } } }),
      prisma.purchaseEvent.count({ where: { purchasedAt: { gte: start, lte: end } } }),
      prisma.product.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          manufacturer: { select: { companyName: true } },
        },
      }),
      prisma.facility.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.campaign.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          manufacturer: { select: { companyName: true } },
        },
      }),
    ]);

    const conversionRate = totalScans > 0 ? totalPurchases / totalScans : 0;

    // Build report data
    const reportData: ReportData = {
      reportType: 'analytics',
      title: 'ESSC Platform 全体分析レポート',
      generatedAt: new Date().toISOString(),
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      summary: {
        totalUsers,
        totalCampaigns,
        totalScans,
        totalPurchases,
        totalRevenue: 0, // Would calculate from actual data
        conversionRate,
      },
      sections: [
        {
          title: '📊 ユーザー統計',
          type: 'kpi',
          data: {
            '新規ユーザー': totalUsers,
            'アクティブユーザー': Math.floor(totalUsers * 0.8),
            '保留中': Math.floor(totalUsers * 0.1),
          },
        },
        {
          title: '📦 商品一覧（最新10件）',
          type: 'table',
          data: {
            headers: ['商品名', 'メーカー', '状態', '登録日'],
            rows: products.map((p) => [
              p.name,
              p.manufacturer.companyName,
              p.status === 'approved' ? '承認済み' : p.status === 'pending' ? '保留中' : '却下',
              new Date(p.createdAt).toLocaleDateString('ja-JP'),
            ]),
          },
        },
        {
          title: '🏢 施設一覧（最新10件）',
          type: 'table',
          data: {
            headers: ['施設名', '施設タイプ', '登録日'],
            rows: facilities.map((f) => [
              f.facilityName,
              f.facilityType,
              new Date(f.createdAt).toLocaleDateString('ja-JP'),
            ]),
          },
        },
        {
          title: '🎯 キャンペーン一覧（最新10件）',
          type: 'table',
          data: {
            headers: ['キャンペーン名', 'メーカー', '状態', '開始日'],
            rows: campaigns.map((c) => [
              c.name,
              c.manufacturer.companyName,
              c.status === 'approved' ? '承認済み' : c.status === 'pending' ? '保留中' : '却下',
              new Date(c.startDate).toLocaleDateString('ja-JP'),
            ]),
          },
        },
        {
          title: '📈 月次トレンド',
          type: 'chart',
          data: {
            note: 'Chart.jsやD3.jsでグラフを表示します',
          },
        },
      ],
      footer: '機密情報 - 社外秘',
    };

    // Generate PDF (HTML for demo)
    const pdfContent = await generateReportPDF(reportData);

    // Return HTML for demo
    // In production, return PDF buffer:
    // return new NextResponse(pdfBuffer, {
    //   headers: {
    //     'Content-Type': 'application/pdf',
    //     'Content-Disposition': 'attachment; filename="analytics-report.pdf"',
    //   },
    // });

    return new NextResponse(pdfContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': 'inline; filename="analytics-report.html"',
      },
    });
  } catch (error) {
    console.error('Failed to generate analytics report:', error);
    return NextResponse.json(
      { error: 'レポートの生成に失敗しました' },
      { status: 500 }
    );
  }
}
