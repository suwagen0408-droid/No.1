'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/app/components/DashboardLayout';

interface ManufacturerStats {
  products: {
    total: number;
    approved: number;
    pending: number;
  };
  campaigns: {
    total: number;
    active: number;
    pending: number;
  };
  engagement: {
    totalScans: number;
    totalClicks: number;
    totalPurchases: number;
    conversionRate: string;
  };
  revenue: {
    total: number;
    recent30Days: number;
  };
  recent30Days: {
    scans: number;
    purchases: number;
  };
  topProducts: Array<{
    id: string;
    name: string;
    imageUrl?: string;
    scans: number;
    purchases: number;
  }>;
  facilities: Array<{
    id: string;
    name: string;
    type: string;
    campaignName: string;
  }>;
}

export default function ManufacturerDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<ManufacturerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }

    const userData = JSON.parse(userStr);
    if (userData.role !== 'manufacturer') {
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
      const response = await fetch('/api/manufacturer/stats', {
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
            <h1 className="text-3xl font-bold text-gray-900">メーカーダッシュボード</h1>
            <p className="mt-2 text-gray-600">
              商品とキャンペーンのパフォーマンスを確認できます
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
            {/* Products */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">商品</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {stats?.products.total || 0}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    承認済み: {stats?.products.approved || 0}
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
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Campaigns */}
            <Link
              href="/dashboard/manufacturer/campaigns"
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">キャンペーン</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {stats?.campaigns.total || 0}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    有効: {stats?.campaigns.active || 0}
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
                      d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
                    />
                  </svg>
                </div>
              </div>
            </Link>

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
                      d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Revenue */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">売上</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    ¥{(stats?.revenue.total || 0).toLocaleString()}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    直近30日: ¥{(stats?.revenue.recent30Days || 0).toLocaleString()}
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
            <div className="flex items-center justify-around">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {((stats?.engagement.totalClicks || 0) / (stats?.engagement.totalScans || 1) * 100).toFixed(1)}%
                </p>
                <p className="text-sm text-gray-600 mt-1">スキャン→クリック</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {((stats?.engagement.totalPurchases || 0) / (stats?.engagement.totalClicks || 1) * 100).toFixed(1)}%
                </p>
                <p className="text-sm text-gray-600 mt-1">クリック→購入</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {stats?.engagement.conversionRate || 0}%
                </p>
                <p className="text-sm text-gray-600 mt-1">全体コンバージョン</p>
              </div>
            </div>
          </div>

          {/* Top Products & Facilities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">トップ商品</h2>
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
                        {product.imageUrl && (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-10 h-10 object-cover rounded"
                          />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <p className="text-sm text-gray-500">
                            {product.scans} スキャン
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-600">
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

            {/* Participating Facilities */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">参加施設</h2>
              {stats?.facilities && stats.facilities.length > 0 ? (
                <div className="space-y-3">
                  {stats.facilities.slice(0, 5).map((facility) => (
                    <div
                      key={facility.id}
                      className="p-3 bg-gray-50 rounded-lg"
                    >
                      <p className="font-medium text-gray-900">{facility.name}</p>
                      <p className="text-sm text-gray-600">
                        種類: {facility.type} | {facility.campaignName}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  参加施設がありません
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">クイックアクション</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Link
                href="/dashboard/products"
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
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                <p className="mt-3 font-medium text-gray-900">新しい商品を登録</p>
              </Link>

              <Link
                href="/dashboard/manufacturer/campaigns"
                className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <p className="mt-3 font-medium text-gray-900">キャンペーンを管理</p>
              </Link>

              <Link
                href="/dashboard/campaigns/new"
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
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                <p className="mt-3 font-medium text-gray-900">キャンペーンを作成</p>
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
