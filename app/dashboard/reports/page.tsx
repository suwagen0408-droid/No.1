'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';

export default function ReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

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
    setLoading(false);
  }, [router]);

  const handleExportCSV = () => {
    alert('CSVエクスポート機能は実装予定です');
  };

  if (!user) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <DashboardLayout user={user}>
      <div className="bg-white rounded-lg shadow">
        <div className="border-b px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">レポート</h1>
              <p className="mt-2 text-gray-600">
                商品とキャンペーンのパフォーマンスレポート
              </p>
            </div>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              CSVエクスポート
            </button>
          </div>
        </div>

        <div className="px-6 py-8 space-y-8">
          {/* Date Range Filter */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              期間選択
            </h2>
            <div className="grid grid-cols-2 gap-4 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  開始日
                </label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  終了日
                </label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Report Sections */}
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              レポート機能
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              詳細なレポート機能は今後実装予定です
            </p>
            <div className="mt-6 space-y-2 text-sm text-gray-600 text-left max-w-md mx-auto">
              <p>📊 商品別パフォーマンス</p>
              <p>📈 キャンペーン別分析</p>
              <p>🏢 施設別レポート</p>
              <p>💰 売上分析</p>
              <p>📉 トレンド分析</p>
              <p>📄 CSVエクスポート</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
