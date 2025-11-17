'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';

interface AnalyticsData {
  overview: {
    users: {
      total: number;
      active: number;
      pending: number;
      suspended: number;
      manufacturers: number;
      facilities: number;
    };
    products: {
      total: number;
      approved: number;
      pending: number;
      rejected: number;
    };
    campaigns: {
      total: number;
      active: number;
      approved: number;
      pending: number;
      completed: number;
    };
    engagement: {
      totalQrCodes: number;
      totalScans: number;
      totalClicks: number;
      totalPurchases: number;
      scanToClickRate: number;
      clickToPurchaseRate: number;
      overallConversionRate: number;
    };
    revenue: {
      total: number;
      recent30Days: number;
    };
    recent30Days: {
      scans: number;
      purchases: number;
    };
  };
  topPerformers: {
    products: Array<{
      id: string;
      name: string;
      manufacturer: string;
      scans: number;
      purchases: number;
    }>;
    facilities: Array<{
      id: string;
      name: string;
      type: string;
      scans: number;
      purchases: number;
    }>;
    campaigns: Array<{
      id: string;
      name: string;
      manufacturer: string;
      scans: number;
      purchases: number;
    }>;
  };
  trends: {
    monthlyScans: Array<{ month: string; count: number }>;
    monthlyPurchases: Array<{ month: string; count: number }>;
    monthlyRevenue: Array<{ month: string; revenue: number }>;
  };
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }

    const userData = JSON.parse(userStr);
    if (userData.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    setUser(userData);
    loadAnalytics();
  }, [router]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/analytics');
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="p-8">Loading...</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">データを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">データの読み込みに失敗しました</p>
      </div>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="bg-white rounded-lg shadow">
        <div className="border-b px-6 py-6">
          <h1 className="text-3xl font-bold text-gray-900">全体分析</h1>
          <p className="mt-2 text-gray-600">
            プラットフォーム全体のKPI・統計データを表示します
          </p>
        </div>

        <div className="px-6 py-8 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Users */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">総ユーザー数</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {data.overview.users.total}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  有効: {data.overview.users.active} / 保留: {data.overview.users.pending}
                </p>
              </div>
              <div className="ml-4 p-3 bg-blue-100 rounded-lg">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Products */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">総商品数</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {data.overview.products.total}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  承認済: {data.overview.products.approved} / 保留:{' '}
                  {data.overview.products.pending}
                </p>
              </div>
              <div className="ml-4 p-3 bg-green-100 rounded-lg">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Campaigns */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">総キャンペーン数</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {data.overview.campaigns.total}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  有効: {data.overview.campaigns.active} / 保留:{' '}
                  {data.overview.campaigns.pending}
                </p>
              </div>
              <div className="ml-4 p-3 bg-purple-100 rounded-lg">
                <svg
                  className="w-8 h-8 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Scans */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">総スキャン数</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {data.overview.engagement.totalScans.toLocaleString()}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  直近30日: {data.overview.recent30Days.scans.toLocaleString()}
                </p>
              </div>
              <div className="ml-4 p-3 bg-yellow-100 rounded-lg">
                <svg
                  className="w-8 h-8 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Conversion Rates */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">コンバージョン率</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border-l-4 border-blue-500 pl-4">
              <p className="text-sm text-gray-600">スキャン→クリック</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.overview.engagement.scanToClickRate.toFixed(2)}%
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {data.overview.engagement.totalClicks.toLocaleString()} クリック /{' '}
                {data.overview.engagement.totalScans.toLocaleString()} スキャン
              </p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <p className="text-sm text-gray-600">クリック→購入</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.overview.engagement.clickToPurchaseRate.toFixed(2)}%
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {data.overview.engagement.totalPurchases.toLocaleString()} 購入 /{' '}
                {data.overview.engagement.totalClicks.toLocaleString()} クリック
              </p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <p className="text-sm text-gray-600">全体コンバージョン率</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.overview.engagement.overallConversionRate.toFixed(2)}%
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {data.overview.engagement.totalPurchases.toLocaleString()} 購入 /{' '}
                {data.overview.engagement.totalScans.toLocaleString()} スキャン
              </p>
            </div>
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">売上</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border-l-4 border-green-500 pl-4">
              <p className="text-sm text-gray-600">総売上</p>
              <p className="text-3xl font-bold text-gray-900">
                ¥{data.overview.revenue.total.toLocaleString()}
              </p>
            </div>
            <div className="border-l-4 border-blue-500 pl-4">
              <p className="text-sm text-gray-600">直近30日の売上</p>
              <p className="text-3xl font-bold text-gray-900">
                ¥{data.overview.revenue.recent30Days.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* User Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">ユーザー内訳</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">メーカー</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.overview.users.manufacturers}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">施設</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.overview.users.facilities}
              </p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">有効アカウント</p>
              <p className="text-2xl font-bold text-green-700">
                {data.overview.users.active}
              </p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-gray-600">承認待ち</p>
              <p className="text-2xl font-bold text-yellow-700">
                {data.overview.users.pending}
              </p>
            </div>
          </div>
        </div>

        {/* Top Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Products */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">トップ商品</h2>
            <div className="space-y-3">
              {data.topPerformers.products.slice(0, 5).map((product, index) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    <span className="text-sm font-medium text-gray-500 w-6">
                      {index + 1}.
                    </span>
                    <div className="ml-2 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-gray-500">{product.manufacturer}</p>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm font-semibold text-gray-900">
                      {product.scans}
                    </p>
                    <p className="text-xs text-gray-500">スキャン</p>
                  </div>
                </div>
              ))}
              {data.topPerformers.products.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">データなし</p>
              )}
            </div>
          </div>

          {/* Top Facilities */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">トップ施設</h2>
            <div className="space-y-3">
              {data.topPerformers.facilities.slice(0, 5).map((facility, index) => (
                <div key={facility.id} className="flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    <span className="text-sm font-medium text-gray-500 w-6">
                      {index + 1}.
                    </span>
                    <div className="ml-2 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {facility.name}
                      </p>
                      <p className="text-xs text-gray-500">{facility.type}</p>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm font-semibold text-gray-900">
                      {facility.scans}
                    </p>
                    <p className="text-xs text-gray-500">スキャン</p>
                  </div>
                </div>
              ))}
              {data.topPerformers.facilities.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">データなし</p>
              )}
            </div>
          </div>

          {/* Top Campaigns */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">トップキャンペーン</h2>
            <div className="space-y-3">
              {data.topPerformers.campaigns.slice(0, 5).map((campaign, index) => (
                <div key={campaign.id} className="flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    <span className="text-sm font-medium text-gray-500 w-6">
                      {index + 1}.
                    </span>
                    <div className="ml-2 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {campaign.name}
                      </p>
                      <p className="text-xs text-gray-500">{campaign.manufacturer}</p>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm font-semibold text-gray-900">
                      {campaign.scans}
                    </p>
                    <p className="text-xs text-gray-500">スキャン</p>
                  </div>
                </div>
              ))}
              {data.topPerformers.campaigns.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">データなし</p>
              )}
            </div>
          </div>
        </div>

        {/* Monthly Trends */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">月次トレンド（直近12ヶ月）</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    月
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    スキャン数
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    購入数
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    売上
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.trends.monthlyScans.map((item) => {
                  const purchases = data.trends.monthlyPurchases.find(
                    (p) => p.month === item.month
                  );
                  const revenue = data.trends.monthlyRevenue.find(
                    (r) => r.month === item.month
                  );
                  return (
                    <tr key={item.month}>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.month}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {item.count.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {purchases?.count.toLocaleString() || 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        ¥{(revenue?.revenue || 0).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
                {data.trends.monthlyScans.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      データなし
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="flex justify-center">
          <button
            onClick={loadAnalytics}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            データを再読み込み
          </button>
        </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
