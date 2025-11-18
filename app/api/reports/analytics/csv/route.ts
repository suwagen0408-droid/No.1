import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateCSV } from '@/lib/report-generator';

/**
 * GET /api/reports/analytics/csv
 * Export analytics data as CSV
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

    // Get export type from query parameter
    const searchParams = request.nextUrl.searchParams;
    const exportType = searchParams.get('type') || 'overview';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = 'export.csv';

    switch (exportType) {
      case 'users':
        filename = 'users-export.csv';
        headers = ['ID', 'メール', 'ロール', '状態', '登録日'];
        const users = await prisma.user.findMany({
          where: { createdAt: { gte: start, lte: end } },
          orderBy: { createdAt: 'desc' },
        });
        rows = users.map((u) => [
          u.id,
          u.email,
          u.role === 'manufacturer' ? 'メーカー' : u.role === 'facility' ? '施設' : '管理者',
          u.status === 'active' ? 'アクティブ' : u.status === 'pending' ? '保留中' : '停止中',
          new Date(u.createdAt).toISOString(),
        ]);
        break;

      case 'campaigns':
        filename = 'campaigns-export.csv';
        headers = ['ID', 'キャンペーン名', 'メーカー', '状態', '開始日', '終了日'];
        const campaigns = await prisma.campaign.findMany({
          where: { createdAt: { gte: start, lte: end } },
          include: {
            manufacturer: { select: { companyName: true } },
          },
          orderBy: { createdAt: 'desc' },
        });
        rows = campaigns.map((c) => [
          c.id,
          c.name,
          c.manufacturer.companyName,
          c.status === 'approved' ? '承認済み' : c.status === 'pending' ? '保留中' : '却下',
          new Date(c.startDate).toISOString(),
          new Date(c.endDate).toISOString(),
        ]);
        break;

      case 'products':
        filename = 'products-export.csv';
        headers = ['ID', '商品名', 'メーカー', 'カテゴリ', '状態', '登録日'];
        const products = await prisma.product.findMany({
          where: { createdAt: { gte: start, lte: end } },
          include: {
            manufacturer: { select: { companyName: true } },
          },
          orderBy: { createdAt: 'desc' },
        });
        rows = products.map((p) => [
          p.id,
          p.name,
          p.manufacturer.companyName,
          p.category,
          p.status === 'approved' ? '承認済み' : p.status === 'pending' ? '保留中' : '却下',
          new Date(p.createdAt).toISOString(),
        ]);
        break;

      case 'facilities':
        filename = 'facilities-export.csv';
        headers = ['ID', '施設名', 'タイプ', '都道府県', '市区町村', '登録日'];
        const facilities = await prisma.facility.findMany({
          where: { createdAt: { gte: start, lte: end } },
          orderBy: { createdAt: 'desc' },
        });
        rows = facilities.map((f) => [
          f.id,
          f.facilityName,
          f.facilityType,
          f.prefecture || '',
          f.city || '',
          new Date(f.createdAt).toISOString(),
        ]);
        break;

      case 'scans':
        filename = 'scans-export.csv';
        headers = ['ID', 'QRコードID', 'スキャン日時', 'デバイスタイプ', 'リファラー'];
        const scans = await prisma.qrScanEvent.findMany({
          where: { scannedAt: { gte: start, lte: end } },
          orderBy: { scannedAt: 'desc' },
          take: 10000, // Limit for performance
        });
        rows = scans.map((s) => [
          s.id,
          s.qrCodeId,
          new Date(s.scannedAt).toISOString(),
          s.deviceType || '',
          s.referrer || '',
        ]);
        break;

      case 'purchases':
        filename = 'purchases-export.csv';
        headers = ['ID', '商品ID', '購入日時', '金額', 'プラットフォーム'];
        const purchases = await prisma.purchaseEvent.findMany({
          where: { purchasedAt: { gte: start, lte: end } },
          orderBy: { purchasedAt: 'desc' },
          take: 10000, // Limit for performance
        });
        rows = purchases.map((p) => [
          p.id,
          p.productId,
          new Date(p.purchasedAt).toISOString(),
          p.amount || 0,
          p.platform || '',
        ]);
        break;

      default:
        // Overview export
        filename = 'analytics-overview.csv';
        headers = ['指標', '値'];
        const [totalUsers, totalCampaigns, totalScans, totalPurchases] = await Promise.all([
          prisma.user.count({ where: { createdAt: { gte: start, lte: end } } }),
          prisma.campaign.count({ where: { createdAt: { gte: start, lte: end } } }),
          prisma.qrScanEvent.count({ where: { scannedAt: { gte: start, lte: end } } }),
          prisma.purchaseEvent.count({ where: { purchasedAt: { gte: start, lte: end } } }),
        ]);
        rows = [
          ['総ユーザー数', totalUsers],
          ['総キャンペーン数', totalCampaigns],
          ['総スキャン数', totalScans],
          ['総購入数', totalPurchases],
          ['コンバージョン率', totalScans > 0 ? `${((totalPurchases / totalScans) * 100).toFixed(2)}%` : '0%'],
        ];
    }

    // Generate CSV
    const csvContent = generateCSV(headers, rows);

    // Add BOM for Excel compatibility with Japanese characters
    const bom = '\uFEFF';
    const csvWithBom = bom + csvContent;

    return new NextResponse(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Failed to export CSV:', error);
    return NextResponse.json(
      { error: 'CSVエクスポートに失敗しました' },
      { status: 500 }
    );
  }
}
