'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/app/components/DashboardLayout';

interface Placement {
  id: string;
  locationLabel: string;
  initialUnits: number;
  currentUnits: number;
  reorderThreshold: number;
  notes?: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
    mainImageUrl?: string;
    category: string;
    manufacturer: {
      companyName: string;
    };
  };
  facilityCampaign: {
    campaign: {
      id: string;
      name: string;
    };
  };
  qrCodes: Array<{
    id: string;
    qrCodeUrl: string;
    scanCount: number;
  }>;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  approvedUnits?: number;
  products: Array<{
    id: string;
    name: string;
    mainImageUrl?: string;
  }>;
}

export default function PlacementsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedPlacement, setSelectedPlacement] = useState<Placement | null>(null);
  
  const [formData, setFormData] = useState({
    facilityCampaignId: '',
    productId: '',
    locationLabel: '',
    initialUnits: 10,
    reorderThreshold: 5,
    notes: '',
  });

  const [stockUpdate, setStockUpdate] = useState({
    changeType: 'restock' as 'restock' | 'consume' | 'adjust' | 'damage',
    changeAmount: 0,
    notes: '',
  });

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
    loadData();
  }, [router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;

      const userData = JSON.parse(userStr);

      // Load placements
      const placementsRes = await fetch('/api/facility/placements', {
        headers: { 'x-user-id': userData.id },
      });
      if (placementsRes.ok) {
        const data = await placementsRes.json();
        setPlacements(data.placements);
      }

      // Load approved campaigns for creating new placements
      const campaignsRes = await fetch('/api/facility/stats', {
        headers: { 'x-user-id': userData.id },
      });
      if (campaignsRes.ok) {
        const statsData = await campaignsRes.json();
        setCampaigns(statsData.activeCampaigns || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlacement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;

      const userData = JSON.parse(userStr);
      const response = await fetch('/api/facility/placements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userData.id,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('商品配置を作成しました');
        setShowCreateModal(false);
        setFormData({
          facilityCampaignId: '',
          productId: '',
          locationLabel: '',
          initialUnits: 10,
          reorderThreshold: 5,
          notes: '',
        });
        loadData();
      } else {
        const data = await response.json();
        alert(data.error || '作成に失敗しました');
      }
    } catch (error) {
      console.error('Error creating placement:', error);
      alert('作成に失敗しました');
    }
  };

  const handleStockUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlacement) return;

    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;

      const userData = JSON.parse(userStr);
      const response = await fetch(`/api/facility/placements/${selectedPlacement.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userData.id,
        },
        body: JSON.stringify(stockUpdate),
      });

      if (response.ok) {
        alert('在庫を更新しました');
        setShowStockModal(false);
        setSelectedPlacement(null);
        setStockUpdate({ changeType: 'restock', changeAmount: 0, notes: '' });
        loadData();
      } else {
        const data = await response.json();
        alert(data.error || '更新に失敗しました');
      }
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('更新に失敗しました');
    }
  };

  if (!user) {
    return <div className="p-8">Loading...</div>;
  }

  const needsReorder = placements.filter(p => p.currentUnits <= p.reorderThreshold);

  return (
    <DashboardLayout user={user}>
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="border-b px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">商品配置管理</h1>
              <p className="mt-2 text-gray-600">
                商品の配置場所と在庫を管理します
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              新規配置を追加
            </button>
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">データを読み込んでいます...</p>
          </div>
        ) : (
          <div className="px-6 py-8 space-y-6">
            {/* Stock Alerts */}
            {needsReorder.length > 0 && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
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
                      {needsReorder.length}件の商品が再発注しきい値を下回っています
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Placements List */}
            {placements.length === 0 ? (
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
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">配置がありません</h3>
                <p className="mt-1 text-sm text-gray-500">
                  キャンペーンの商品を配置してみましょう
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  最初の配置を追加
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {placements.map((placement) => (
                  <div
                    key={placement.id}
                    className={`border rounded-lg p-4 ${
                      placement.currentUnits <= placement.reorderThreshold
                        ? 'border-yellow-300 bg-yellow-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        {placement.product.mainImageUrl && (
                          <img
                            src={placement.product.mainImageUrl}
                            alt={placement.product.name}
                            className="w-20 h-20 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {placement.product.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {placement.product.manufacturer.companyName}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            📍 {placement.locationLabel}
                          </p>
                          <p className="text-sm text-blue-600 mt-1">
                            キャンペーン: {placement.facilityCampaign.campaign.name}
                          </p>
                        </div>
                      </div>

                      <div className="text-right ml-4">
                        <div className="mb-3">
                          <p className="text-sm text-gray-600">現在在庫</p>
                          <p className={`text-2xl font-bold ${
                            placement.currentUnits <= placement.reorderThreshold
                              ? 'text-yellow-600'
                              : 'text-gray-900'
                          }`}>
                            {placement.currentUnits}
                          </p>
                          <p className="text-xs text-gray-500">
                            再発注: {placement.reorderThreshold}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <button
                            onClick={() => {
                              setSelectedPlacement(placement);
                              setShowStockModal(true);
                            }}
                            className="w-full px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            在庫更新
                          </button>
                          <Link
                            href="/dashboard/qrcodes"
                            className="block w-full px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-center"
                          >
                            QRコード ({placement.qrCodes.length})
                          </Link>
                        </div>
                      </div>
                    </div>

                    {placement.notes && (
                      <p className="mt-3 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        📝 {placement.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Placement Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4">
              <h2 className="text-xl font-bold text-gray-900">新規配置を追加</h2>
            </div>

            <form onSubmit={handleCreatePlacement} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  キャンペーン選択 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.facilityCampaignId}
                  onChange={(e) => {
                    setFormData({ ...formData, facilityCampaignId: e.target.value, productId: '' });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                >
                  <option value="" className="text-gray-500">選択してください</option>
                  {campaigns.filter(c => c.status === 'approved').map((campaign) => (
                    <option key={campaign.id} value={campaign.id} className="text-gray-900">
                      {campaign.name}
                    </option>
                  ))}
                </select>
              </div>

              {formData.facilityCampaignId && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    商品選択 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.productId}
                    onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    required
                  >
                    <option value="" className="text-gray-500">選択してください</option>
                    {campaigns
                      .find(c => c.id === formData.facilityCampaignId)
                      ?.products.map((product) => (
                        <option key={product.id} value={product.id} className="text-gray-900">
                          {product.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  配置場所 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.locationLabel}
                  onChange={(e) => setFormData({ ...formData, locationLabel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: フロント, 客室A, レストラン入口"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    初期数量 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.initialUnits}
                    onChange={(e) => setFormData({ ...formData, initialUnits: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    再発注しきい値
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.reorderThreshold}
                    onChange={(e) => setFormData({ ...formData, reorderThreshold: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  メモ
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="配置に関する注意事項など"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  配置を作成
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Update Modal */}
      {showStockModal && selectedPlacement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="border-b px-6 py-4">
              <h2 className="text-xl font-bold text-gray-900">在庫更新</h2>
              <p className="text-sm text-gray-600 mt-1">
                {selectedPlacement.product.name} - {selectedPlacement.locationLabel}
              </p>
            </div>

            <form onSubmit={handleStockUpdate} className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">現在の在庫</p>
                <p className="text-3xl font-bold text-gray-900">{selectedPlacement.currentUnits}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  更新タイプ
                </label>
                <select
                  value={stockUpdate.changeType}
                  onChange={(e) => setStockUpdate({ ...stockUpdate, changeType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="restock" className="text-gray-900">補充</option>
                  <option value="consume" className="text-gray-900">消費</option>
                  <option value="adjust" className="text-gray-900">調整</option>
                  <option value="damage" className="text-gray-900">破損</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  変更量 {stockUpdate.changeType === 'restock' ? '(+)' : '(-)'}
                </label>
                <input
                  type="number"
                  value={Math.abs(stockUpdate.changeAmount)}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    setStockUpdate({
                      ...stockUpdate,
                      changeAmount: stockUpdate.changeType === 'restock' ? value : -value
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  更新後: {selectedPlacement.currentUnits + stockUpdate.changeAmount}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  メモ
                </label>
                <textarea
                  value={stockUpdate.notes}
                  onChange={(e) => setStockUpdate({ ...stockUpdate, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="更新理由など"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowStockModal(false);
                    setSelectedPlacement(null);
                    setStockUpdate({ changeType: 'restock', changeAmount: 0, notes: '' });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  在庫を更新
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
