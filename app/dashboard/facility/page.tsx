'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/app/components/DashboardLayout';

interface FacilityStats {
  campaigns: {
    total: number;
    active: number;
    pending: number;
  };
  qrCodes: {
    total: number;
  };
  engagement: {
    totalScans: number;
    totalClicks: number;
    totalPurchases: number;
    conversionRate: string;
  };
  revenue: {
    total: number;
  };
  recent30Days: {
    scans: number;
    purchases: number;
  };
  activeCampaigns: Array<{
    id: string;
    campaignId: string;
    campaignName: string;
    manufacturer: string;
    status: string;
    approvedUnits?: number;
    products: Array<{
      id: string;
      name: string;
      imageUrl?: string;
    }>;
  }>;
  topProducts: Array<{
    id: string;
    name: string;
    mainImageUrl?: string;
    manufacturer: {
      companyName: string;
    };
    scans: number;
    purchases: number;
  }>;
  placements: Array<{
    id: string;
    productName: string;
    productImageUrl?: string;
    campaignName: string;
    locationLabel: string;
    currentUnits: number;
    reorderThreshold: number;
    needsReorder: boolean;
  }>;
}

export default function FacilityDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<FacilityStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }

    const userData = JSON.parse(userStr);
    if (userData.role !== 'facility') {
      router.push('/dashboard');
      return;
    }

    setUser(userData);
    loadStats();
  }, [router]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;

      const userData = JSON.parse(userStr);
      const response = await fetch('/api/facility/stats', {
        headers: {
          'x-user-id': userData.id,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <DashboardLayout user={user}>
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="border-b">
          <div className="px-6 py-6">
            <h1 className="text-3xl font-bold text-gray-900">施設ダッシュボード</h1>
            <p className="mt-2 text-gray-600">
              キャンペーン参加状況と商品パフォーマンスを確認できます
            </p>
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">データを読み込んでいます...</p>
          </div>
        ) : (
          <div className="px-6 py-8 space-y-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Campaigns */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">参加キャンペーン</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {stats?.campaigns.total || 0}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    有効: {stats?.campaigns.active || 0}
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
                      d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* QR Codes */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">QRコード</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {stats?.qrCodes.total || 0}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">生成済み</p>
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
                      d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
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
                    {stats?.engagement.totalScans.toLocaleString() || 0}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    直近30日: {stats?.recent30Days.scans.toLocaleString() || 0}
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
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Revenue Contribution */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">売上貢献</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    ¥{(stats?.revenue.total || 0).toLocaleString()}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    購入: {stats?.engagement.totalPurchases || 0}件
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
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Conversion Rate */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">コンバージョン率</h2>
            <div className="text-center">
              <p className="text-4xl font-bold text-blue-600">
                {stats?.engagement.conversionRate || 0}%
              </p>
              <p className="text-sm text-gray-600 mt-2">
                スキャンから購入への転換率
              </p>
            </div>
          </div>

          {/* Stock Alerts */}
          {stats?.placements && stats.placements.some((p) => p.needsReorder) && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg">
              <div className="flex items-center">
                <svg
                  className="w-6 h-6 text-yellow-600 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <h3 className="font-semibold text-yellow-900">在庫アラート</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    {stats.placements.filter((p) => p.needsReorder).length}
                    件の商品が再発注しきい値を下回っています
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Active Campaigns & Top Products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Campaigns */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">参加中のキャンペーン</h2>
              {stats?.activeCampaigns && stats.activeCampaigns.length > 0 ? (
                <div className="space-y-3">
                  {stats.activeCampaigns.slice(0, 5).map((campaign) => (
                    <div
                      key={campaign.id}
                      className="p-4 bg-gray-50 rounded-lg"
                    >
                      <h3 className="font-medium text-gray-900">
                        {campaign.campaignName}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        メーカー: {campaign.manufacturer}
                      </p>
                      {campaign.approvedUnits && (
                        <p className="text-sm text-gray-500">
                          承認数量: {campaign.approvedUnits}個
                        </p>
                      )}
                      <div className="flex items-center mt-2 space-x-2">
                        {campaign.products.slice(0, 3).map((product) => (
                          <div
                            key={product.id}
                            className="w-10 h-10 bg-gray-200 rounded overflow-hidden"
                          >
                            {product.imageUrl && (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  参加中のキャンペーンはありません
                </p>
              )}
            </div>

            {/* Top Products */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">人気商品</h2>
              {stats?.topProducts && stats.topProducts.length > 0 ? (
                <div className="space-y-3">
                  {stats.topProducts.map((product, index) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-lg font-bold text-gray-400">
                          {index + 1}
                        </span>
                        {product.mainImageUrl && (
                          <img
                            src={product.mainImageUrl}
                            alt={product.name}
                            className="w-10 h-10 object-cover rounded"
                          />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <p className="text-sm text-gray-500">
                            {product.manufacturer.companyName}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-blue-600">
                          {product.scans} スキャン
                        </p>
                        <p className="text-xs text-green-600">
                          {product.purchases} 購入
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">データがありません</p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">クイックアクション</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/dashboard/campaigns"
                className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <svg
                  className="w-12 h-12 mx-auto text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <p className="mt-3 font-medium text-gray-900">
                  キャンペーンを探す
                </p>
              </Link>

              <Link
                href="/dashboard/qrcodes"
                className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-green-500 hover:bg-green-50 transition-colors"
              >
                <svg
                  className="w-12 h-12 mx-auto text-gray-400"
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
                <p className="mt-3 font-medium text-gray-900">QRコードを生成</p>
              </Link>

              <button
                onClick={loadStats}
                className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-purple-500 hover:bg-purple-50 transition-colors"
              >
                <svg
                  className="w-12 h-12 mx-auto text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <p className="mt-3 font-medium text-gray-900">データを更新</p>
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}
