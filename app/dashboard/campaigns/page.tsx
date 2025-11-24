'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  totalUnits: number;
  maxUnitsPerFacility?: number;
  costModel: string;
  shippingCostCoveredBy: string;
  status: string;
  manufacturer: {
    id: string;
    companyName: string;
    logoUrl?: string;
  };
  products: Array<{
    id: string;
    name: string;
    mainImageUrl?: string;
    category: string;
    shortDescription?: string;
  }>;
  participatingFacilities: number;
  isEligible: boolean;
  myApplication?: {
    id: string;
    status: string;
    requestedUnits: number;
    approvedUnits?: number;
  } | null;
}

const COST_MODEL_LABELS: Record<string, string> = {
  free: '無料',
  cost_price: '原価',
  discounted: '割引価格',
};

const SHIPPING_LABELS: Record<string, string> = {
  manufacturer: 'メーカー負担',
  facility: '施設負担',
  split: '分担',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: '承認待ち', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: '承認済み', color: 'bg-green-100 text-green-800' },
  rejected: { label: '却下', color: 'bg-red-100 text-red-800' },
  active: { label: '配送済み', color: 'bg-blue-100 text-blue-800' },
};

export default function CampaignsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplicationModal, setShowApplicationModal] = useState<Campaign | null>(null);
  const [applicationForm, setApplicationForm] = useState({
    requestedUnits: 1,
    requestedMessage: '',
    plannedPlacementLocations: '',
    estimatedMonthlyUsage: 0,
  });
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }

    const userData = JSON.parse(userStr);
    
    // Allow both facility and manufacturer to view campaigns
    if (!['facility', 'manufacturer'].includes(userData.role)) {
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
      
      // Different API endpoint based on role
      const endpoint = userData.role === 'facility' 
        ? '/api/facility/campaigns'
        : '/api/manufacturer/campaigns';
      
      const response = await fetch(endpoint, {
        headers: {
          'x-user-id': userData.id,
        },
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

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showApplicationModal) return;

    setApplying(true);
    try {
      const response = await fetch('/api/facility/campaigns/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          campaignId: showApplicationModal.id,
          ...applicationForm,
        }),
      });

      if (response.ok) {
        alert('キャンペーンに応募しました。メーカーの承認をお待ちください。');
        setShowApplicationModal(null);
        setApplicationForm({
          requestedUnits: 1,
          requestedMessage: '',
          plannedPlacementLocations: '',
          estimatedMonthlyUsage: 0,
        });
        loadCampaigns();
      } else {
        const error = await response.json();
        alert(`エラー: ${error.error}`);
      }
    } catch (error) {
      console.error('Error applying:', error);
      alert('応募に失敗しました');
    } finally {
      setApplying(false);
    }
  };

  if (!user) {
    return <div className="p-8">Loading...</div>;
  }

  const isFacility = user.role === 'facility';

  return (
    <DashboardLayout user={user}>
      <div className="bg-white rounded-lg shadow">
        <div className="border-b px-6 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {isFacility ? 'キャンペーン一覧' : 'マイキャンペーン'}
          </h1>
          <p className="mt-2 text-gray-600">
            {isFacility
              ? '参加可能なキャンペーンを探して応募できます'
              : 'あなたが作成したキャンペーンの一覧'}
          </p>
        </div>

        <div className="px-6 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              {isFacility ? 'キャンペーンがありません' : 'キャンペーンを作成しましょう'}
            </h3>
            <p className="mt-2 text-gray-500">
              {isFacility
                ? '現在参加可能なキャンペーンはありません'
                : '最初のキャンペーンを作成して施設を募集しましょう'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {campaign.name}
                      </h2>
                      <p className="text-sm text-gray-600">
                        メーカー: {campaign.manufacturer.companyName}
                      </p>
                    </div>
                    {campaign.myApplication && (
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          STATUS_LABELS[campaign.myApplication.status]?.color ||
                          'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {STATUS_LABELS[campaign.myApplication.status]?.label ||
                          campaign.myApplication.status}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {campaign.description && (
                    <p className="text-gray-700 mb-4">{campaign.description}</p>
                  )}

                  {/* Products */}
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">
                      対象商品
                    </h3>
                    <div className="flex space-x-3 overflow-x-auto pb-2">
                      {campaign.products.map((product) => (
                        <div
                          key={product.id}
                          className="flex-shrink-0 w-32 bg-gray-50 rounded-lg p-3"
                        >
                          {product.mainImageUrl ? (
                            <img
                              src={product.mainImageUrl}
                              alt={product.name}
                              className="w-full h-24 object-cover rounded mb-2"
                            />
                          ) : (
                            <div className="w-full h-24 bg-gray-200 rounded mb-2 flex items-center justify-center">
                              <svg
                                className="w-8 h-8 text-gray-400"
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
                          )}
                          <p className="text-xs font-medium text-gray-900 truncate">
                            {product.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Campaign Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500">期間</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(campaign.startDate).toLocaleDateString('ja-JP')} -<br />
                        {new Date(campaign.endDate).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">総配布数</p>
                      <p className="text-sm font-medium text-gray-900">
                        {campaign.totalUnits}個
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">費用負担</p>
                      <p className="text-sm font-medium text-gray-900">
                        {COST_MODEL_LABELS[campaign.costModel] || campaign.costModel}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">送料</p>
                      <p className="text-sm font-medium text-gray-900">
                        {SHIPPING_LABELS[campaign.shippingCostCoveredBy] ||
                          campaign.shippingCostCoveredBy}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  {isFacility && (
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="text-sm text-gray-600">
                        参加施設: {campaign.participatingFacilities}
                        {!campaign.isEligible && (
                          <span className="ml-2 text-orange-600">
                            (条件を満たしていません)
                          </span>
                        )}
                      </div>
                      {campaign.myApplication ? (
                        <div className="text-sm text-gray-600">
                          応募数: {campaign.myApplication.requestedUnits}個
                          {campaign.myApplication.approvedUnits && (
                            <span className="ml-2 text-green-600">
                              / 承認: {campaign.myApplication.approvedUnits}個
                            </span>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowApplicationModal(campaign)}
                          disabled={!campaign.isEligible}
                          className={`px-6 py-2 rounded-lg font-medium ${
                            campaign.isEligible
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          応募する
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* Application Modal */}
      {showApplicationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">キャンペーン応募</h2>

              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900">
                  {showApplicationModal.name}
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  {showApplicationModal.manufacturer.companyName}
                </p>
              </div>

              <form onSubmit={handleApply} className="space-y-4">
                {/* Requested Units */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    希望数量 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={showApplicationModal.maxUnitsPerFacility || undefined}
                    value={applicationForm.requestedUnits}
                    onChange={(e) =>
                      setApplicationForm({
                        ...applicationForm,
                        requestedUnits: parseInt(e.target.value),
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                  {showApplicationModal.maxUnitsPerFacility && (
                    <p className="text-xs text-gray-500 mt-1">
                      最大: {showApplicationModal.maxUnitsPerFacility}個
                    </p>
                  )}
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    メッセージ
                  </label>
                  <textarea
                    value={applicationForm.requestedMessage}
                    onChange={(e) =>
                      setApplicationForm({
                        ...applicationForm,
                        requestedMessage: e.target.value,
                      })
                    }
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="応募理由や要望などがあれば記入してください"
                  />
                </div>

                {/* Placement Locations */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    設置予定場所
                  </label>
                  <input
                    type="text"
                    value={applicationForm.plannedPlacementLocations}
                    onChange={(e) =>
                      setApplicationForm({
                        ...applicationForm,
                        plannedPlacementLocations: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="例: 客室、ロビー、大浴場"
                  />
                </div>

                {/* Estimated Usage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    月間予想使用数
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={applicationForm.estimatedMonthlyUsage}
                    onChange={(e) =>
                      setApplicationForm({
                        ...applicationForm,
                        estimatedMonthlyUsage: parseInt(e.target.value),
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowApplicationModal(null)}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={applying}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {applying ? '応募中...' : '応募する'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
