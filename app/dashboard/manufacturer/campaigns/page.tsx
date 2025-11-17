'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/app/components/DashboardLayout';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  totalUnits: number;
  status: string;
  campaignProducts: Array<{
    product: {
      id: string;
      name: string;
      mainImageUrl?: string;
    };
  }>;
  facilityCampaigns: Array<{
    facility: {
      id: string;
      facilityName: string;
    };
  }>;
  _count: {
    facilityCampaigns: number;
    qrScanEvents: number;
    purchaseEvents: number;
  };
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: '下書き', color: 'bg-gray-100 text-gray-800' },
  pending: { label: '承認待ち', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: '承認済み', color: 'bg-green-100 text-green-800' },
  rejected: { label: '却下', color: 'bg-red-100 text-red-800' },
  active: { label: '実施中', color: 'bg-blue-100 text-blue-800' },
  completed: { label: '終了', color: 'bg-gray-100 text-gray-600' },
};

export default function ManufacturerCampaignsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
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
    loadCampaigns();
  }, [router]);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;

      const userData = JSON.parse(userStr);
      const response = await fetch('/api/manufacturer/campaigns', {
        headers: { 'x-user-id': userData.id },
      });

      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns);
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
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
        <div className="border-b px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">キャンペーン管理</h1>
              <p className="mt-2 text-gray-600">
                作成したキャンペーンを管理します
              </p>
            </div>
            <Link
              href="/dashboard/campaigns/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              新規作成
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">データを読み込んでいます...</p>
          </div>
        ) : (
          <div className="px-6 py-8">
            {campaigns.length === 0 ? (
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
                    d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  キャンペーンがありません
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  最初のキャンペーンを作成してみましょう
                </p>
                <Link
                  href="/dashboard/campaigns/new"
                  className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  キャンペーンを作成
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="border rounded-lg p-6 hover:shadow-lg transition-shadow relative"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h3 className="text-xl font-semibold text-gray-900">
                            {campaign.name}
                          </h3>
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              STATUS_LABELS[campaign.status]?.color ||
                              'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {STATUS_LABELS[campaign.status]?.label || campaign.status}
                          </span>
                        </div>

                        {campaign.description && (
                          <p className="text-gray-600 mb-4 line-clamp-2">
                            {campaign.description}
                          </p>
                        )}

                        <div className="flex items-center space-x-6 text-sm text-gray-600">
                          <span>
                            📅 {new Date(campaign.startDate).toLocaleDateString('ja-JP')} 〜{' '}
                            {new Date(campaign.endDate).toLocaleDateString('ja-JP')}
                          </span>
                          <span>📦 {campaign.totalUnits}個</span>
                          <span>
                            🏢 {campaign._count.facilityCampaigns}施設が参加
                          </span>
                        </div>

                        <div className="mt-4 flex items-center space-x-2">
                          {campaign.campaignProducts.slice(0, 3).map((cp) => (
                            <div
                              key={cp.product.id}
                              className="w-12 h-12 bg-gray-200 rounded overflow-hidden"
                            >
                              {cp.product.mainImageUrl && (
                                <img
                                  src={cp.product.mainImageUrl}
                                  alt={cp.product.name}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                          ))}
                          {campaign.campaignProducts.length > 3 && (
                            <span className="text-sm text-gray-500">
                              +{campaign.campaignProducts.length - 3}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right ml-6">
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm text-gray-600">スキャン数</p>
                            <p className="text-2xl font-bold text-blue-600">
                              {campaign._count.qrScanEvents.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">購入数</p>
                            <p className="text-2xl font-bold text-green-600">
                              {campaign._count.purchaseEvents.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-4 pt-4 border-t flex justify-end space-x-2">
                      <Link
                        href={`/dashboard/manufacturer/campaigns/${campaign.id}`}
                        className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded hover:bg-gray-50"
                      >
                        詳細
                      </Link>
                      {(campaign.status === 'draft' ||
                        campaign.status === 'rejected' ||
                        campaign.status === 'pending') && (
                        <Link
                          href={`/dashboard/manufacturer/campaigns/${campaign.id}/edit`}
                          className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded hover:bg-blue-50"
                        >
                          編集
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
