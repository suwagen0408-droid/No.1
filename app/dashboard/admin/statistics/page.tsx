'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';

interface Statistics {
  overview: {
    totalUsers: number;
    totalManufacturers: number;
    totalFacilities: number;
    totalProducts: number;
    totalCampaigns: number;
    activeCampaigns: number;
    totalPlacements: number;
  };
  engagement: {
    totalQRScans: number;
    totalClicks: number;
    totalPurchases: number;
    scanToClickRate: number;
    clickToPurchaseRate: number;
    scanToPurchaseRate: number;
  };
  revenue: {
    totalRevenue: number;
    totalInvoices: number;
    paidInvoices: number;
    totalInvoiceRevenue: number;
    averageOrderValue: number;
  };
  trends: {
    monthly: Array<{
      month: string;
      scans: number;
      clicks: number;
      purchases: number;
    }>;
  };
  topPerformers: {
    campaigns: Array<any>;
    products: Array<any>;
    facilities: Array<any>;
  };
}

export default function AdminStatisticsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<Statistics | null>(null);
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
    loadStatistics();
  }, [router]);

  const loadStatistics = async () => {
    setLoading(true);
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;

      const userData = JSON.parse(userStr);
      const response = await fetch('/api/admin/statistics', {
        headers: { 'x-user-id': userData.id },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ja-JP').format(num);
  };

  if (!user) {
    return <div className="p-8">Loading...</div>;
  }

  if (loading) {
    return (
      <DashboardLayout user={user}>
        <div className="px-6 py-12 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">データを読み込んでいます...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!stats) {
    return (
      <DashboardLayout user={user}>
        <div className="text-center py-12">
          <p className="text-gray-600">統計情報が取得できませんでした</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold text-gray-900">統計ダッシュボード</h1>
          <p className="mt-2 text-gray-600">
            プラットフォーム全体のパフォーマンス指標と分析
          </p>
        </div>

        {/* Overview Stats */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 概要</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">総ユーザー数</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{formatNumber(stats.overview.totalUsers)}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">👥</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">メーカー数</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{formatNumber(stats.overview.totalManufacturers)}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🏭</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">施設数</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{formatNumber(stats.overview.totalFacilities)}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🏢</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">商品数</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{formatNumber(stats.overview.totalProducts)}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📦</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">総キャンペーン</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{formatNumber(stats.overview.totalCampaigns)}</p>
                </div>
                <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🎯</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">実施中</p>
                  <p className="mt-2 text-3xl font-bold text-green-600">{formatNumber(stats.overview.activeCampaigns)}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🚀</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">商品配置数</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{formatNumber(stats.overview.totalPlacements)}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📍</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Engagement Stats */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🎯 エンゲージメント</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600">QRスキャン</p>
                  <p className="mt-2 text-3xl font-bold text-blue-600">{formatNumber(stats.engagement.totalQRScans)}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📱</span>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                →クリック率: <span className="font-semibold text-blue-600">{stats.engagement.scanToClickRate}%</span>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600">クリック</p>
                  <p className="mt-2 text-3xl font-bold text-purple-600">{formatNumber(stats.engagement.totalClicks)}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">👆</span>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                →購入率: <span className="font-semibold text-purple-600">{stats.engagement.clickToPurchaseRate}%</span>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600">購入</p>
                  <p className="mt-2 text-3xl font-bold text-green-600">{formatNumber(stats.engagement.totalPurchases)}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">💰</span>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                総コンバージョン: <span className="font-semibold text-green-600">{stats.engagement.scanToPurchaseRate}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Stats */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">💰 収益</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">総売上</p>
              <p className="mt-2 text-2xl font-bold text-green-600">{formatCurrency(stats.revenue.totalRevenue)}</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">平均注文額</p>
              <p className="mt-2 text-2xl font-bold text-blue-600">{formatCurrency(stats.revenue.averageOrderValue)}</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">請求書</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {stats.revenue.paidInvoices} / {stats.revenue.totalInvoices}
              </p>
              <p className="text-xs text-gray-500 mt-1">支払済み / 総数</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">請求額合計</p>
              <p className="mt-2 text-2xl font-bold text-purple-600">{formatCurrency(stats.revenue.totalInvoiceRevenue)}</p>
            </div>
          </div>
        </div>

        {/* Monthly Trends */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">📈 月次トレンド</h2>
          <div className="space-y-6">
            {stats.trends.monthly.map((month, index) => {
              const maxValue = Math.max(...stats.trends.monthly.map(m => Math.max(m.scans, m.clicks, m.purchases)));
              return (
                <div key={index}>
                  <p className="text-sm font-medium text-gray-700 mb-2">{month.month}</p>
                  <div className="space-y-2">
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>スキャン</span>
                        <span className="font-semibold">{formatNumber(month.scans)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${(month.scans / maxValue) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>クリック</span>
                        <span className="font-semibold">{formatNumber(month.clicks)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full"
                          style={{ width: `${(month.clicks / maxValue) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>購入</span>
                        <span className="font-semibold">{formatNumber(month.purchases)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${(month.purchases / maxValue) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Campaigns */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🏆 トップキャンペーン</h3>
            <div className="space-y-3">
              {stats.topPerformers.campaigns.slice(0, 5).map((campaign, index) => (
                <div key={campaign.id} className="flex items-start space-x-3 pb-3 border-b last:border-0">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{campaign.name}</p>
                    <p className="text-xs text-gray-500">{campaign.manufacturer.companyName}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {formatNumber(campaign._count.qrScanEvents)} スキャン / {formatNumber(campaign._count.purchaseEvents)} 購入
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">⭐ トップ商品</h3>
            <div className="space-y-3">
              {stats.topPerformers.products.slice(0, 5).map((product, index) => (
                <div key={product.id} className="flex items-start space-x-3 pb-3 border-b last:border-0">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-600 text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.manufacturer.companyName}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {formatNumber(product._count.qrScanEvents)} スキャン / {formatNumber(product._count.purchaseEvents)} 購入
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Facilities */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🌟 トップ施設</h3>
            <div className="space-y-3">
              {stats.topPerformers.facilities.slice(0, 5).map((facility, index) => (
                <div key={facility.id} className="flex items-start space-x-3 pb-3 border-b last:border-0">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-600 text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{facility.facilityName}</p>
                    <p className="text-xs text-gray-500">{facility.facilityType}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {formatNumber(facility._count.qrScanEvents)} スキャン / {facility._count.facilityCampaigns} キャンペーン
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
