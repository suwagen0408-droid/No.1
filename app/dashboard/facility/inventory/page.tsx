'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';
import StockUpdateModal from '@/app/components/StockUpdateModal';
import ReorderButton from '@/app/components/ReorderButton';
import StatusBadge from '@/app/components/common/StatusBadge';
import { formatDate, formatCurrency } from '@/lib/formatters';

interface Placement {
  id: string;
  locationLabel: string;
  initialUnits: number;
  currentUnits: number;
  reorderThreshold: number;
  createdAt: string;
  updatedAt: string;
  product: {
    id: string;
    name: string;
    mainImageUrl?: string;
    category: string;
  };
  facilityCampaign: {
    id: string;
    status: string;
    campaign: {
      id: string;
      name: string;
      endDate: string;
      manufacturer: {
        companyName: string;
      };
    };
  };
  stockLogs: Array<{
    id: string;
    changeType: string;
    quantity: number;
    beforeUnits: number;
    afterUnits: number;
    createdAt: string;
  }>;
}

interface Stats {
  totalPlacements: number;
  lowStock: number;
  outOfStock: number;
  totalUnits: number;
}

interface ReorderRequest {
  id: string;
  requestedUnits: number;
  reason?: string;
  urgency: string;
  status: string;
  approvedUnits?: number;
  rejectionReason?: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  deliveredAt?: string;
  unitCost?: number;
  shippingCost?: number;
  totalCost?: number;
  createdAt: string;
  product: {
    id: string;
    name: string;
    mainImageUrl?: string;
    category: string;
  };
  campaign: {
    id: string;
    name: string;
  };
  manufacturer: {
    id: string;
    companyName: string;
  };
  facilityProductPlacement: {
    id: string;
    locationLabel: string;
    currentUnits: number;
    reorderThreshold: number;
  };
}

const CHANGE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  usage: { label: '使用', color: 'text-blue-600' },
  restock: { label: '補充', color: 'text-green-600' },
  adjustment: { label: '調整', color: 'text-yellow-600' },
  damage: { label: '破損', color: 'text-red-600' },
};

const URGENCY_LABELS: Record<string, { label: string; color: string }> = {
  normal: { label: '通常', color: 'bg-gray-100 text-gray-800' },
  high: { label: '優先', color: 'bg-orange-100 text-orange-800' },
  emergency: { label: '緊急', color: 'bg-red-100 text-red-800' },
};

const REORDER_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: '承認待ち', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: '承認済み', color: 'bg-green-100 text-green-800' },
  rejected: { label: '却下', color: 'bg-red-100 text-red-800' },
  shipped: { label: '発送済み', color: 'bg-blue-100 text-blue-800' },
  delivered: { label: '配達完了', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'キャンセル', color: 'bg-gray-100 text-gray-600' },
};

export default function FacilityInventoryPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlacement, setSelectedPlacement] = useState<Placement | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'low' | 'empty'>('all');
  
  // Tab and Reorder states
  const [activeTab, setActiveTab] = useState<'inventory' | 'reorders'>('inventory');
  const [reorders, setReorders] = useState<ReorderRequest[]>([]);
  const [reordersLoading, setReordersLoading] = useState(false);
  const [reorderFilter, setReorderFilter] = useState<string>('all');

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
    loadInventory();
  }, [router]);

  useEffect(() => {
    if (activeTab === 'reorders' && user) {
      loadReorders();
    }
  }, [activeTab, reorderFilter, user]);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;

      const userData = JSON.parse(userStr);
      const response = await fetch('/api/facility/inventory', {
        headers: { 'x-user-id': userData.id },
      });

      if (response.ok) {
        const data = await response.json();
        setPlacements(data.placements);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReorders = async () => {
    setReordersLoading(true);
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;

      const userData = JSON.parse(userStr);
      const url = reorderFilter === 'all' 
        ? '/api/facility/reorder'
        : `/api/facility/reorder?status=${reorderFilter}`;
        
      const response = await fetch(url, {
        headers: { 'x-user-id': userData.id },
      });

      if (response.ok) {
        const data = await response.json();
        setReorders(data.reorderRequests);
      }
    } catch (error) {
      console.error('Error loading reorders:', error);
    } finally {
      setReordersLoading(false);
    }
  };

  const handleConfirmDelivery = async (id: string) => {
    if (!confirm('商品が配達されたことを確認しますか？')) return;

    try {
      const response = await fetch(`/api/facility/reorder/${id}/deliver`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user!.id,
        },
      });

      if (response.ok) {
        alert('配達完了を記録しました');
        loadReorders();
      } else {
        const error = await response.json();
        alert(error.error || '配達確認に失敗しました');
      }
    } catch (error) {
      console.error('Error confirming delivery:', error);
      alert('配達確認に失敗しました');
    }
  };

  const openUpdateModal = (placement: Placement) => {
    setSelectedPlacement(placement);
    setShowUpdateModal(true);
  };

  const handleUpdateComplete = () => {
    setShowUpdateModal(false);
    setSelectedPlacement(null);
    loadInventory();
  };

  const getStockStatus = (placement: Placement) => {
    if (placement.currentUnits === 0) {
      return { label: '在庫切れ', color: 'bg-red-100 text-red-800', icon: '🚨' };
    } else if (placement.currentUnits <= placement.reorderThreshold) {
      return { label: '要補充', color: 'bg-yellow-100 text-yellow-800', icon: '⚠️' };
    } else {
      return { label: '正常', color: 'bg-green-100 text-green-800', icon: '✓' };
    }
  };

  const getStockPercentage = (placement: Placement) => {
    return Math.round((placement.currentUnits / placement.initialUnits) * 100);
  };

  const filteredPlacements = placements.filter(p => {
    if (filter === 'low') return p.currentUnits <= p.reorderThreshold && p.currentUnits > 0;
    if (filter === 'empty') return p.currentUnits === 0;
    return true;
  });

  if (!user) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold text-gray-900">在庫・発注管理</h1>
          <p className="mt-2 text-gray-600">
            商品の在庫状況の確認・更新、追加発注の管理ができます
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('inventory')}
                className={`flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'inventory'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📦 在庫一覧
              </button>
              <button
                onClick={() => setActiveTab('reorders')}
                className={`flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'reorders'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🚚 発注履歴
              </button>
            </nav>
          </div>
        </div>

        {/* Stats Cards - Inventory Tab */}
        {activeTab === 'inventory' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">総配置数</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalPlacements}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📦</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">総在庫数</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalUnits}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📊</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">要補充</p>
                  <p className="mt-2 text-3xl font-bold text-yellow-600">{stats.lowStock}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">⚠️</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">在庫切れ</p>
                  <p className="mt-2 text-3xl font-bold text-red-600">{stats.outOfStock}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🚨</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards - Reorders Tab */}
        {activeTab === 'reorders' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {['pending', 'approved', 'shipped', 'delivered'].map((status) => {
              const count = reorders.filter(r => r.status === status).length;
              const config = REORDER_STATUS_CONFIG[status];
              return (
                <div key={status} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">{config.label}</p>
                      <p className="mt-2 text-3xl font-bold text-gray-900">{count}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Filters - Inventory Tab */}
        {activeTab === 'inventory' && (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 font-medium">フィルター:</span>
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 text-sm rounded-lg ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                すべて
              </button>
              <button
                onClick={() => setFilter('low')}
                className={`px-4 py-2 text-sm rounded-lg ${
                  filter === 'low'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                要補充 {stats && stats.lowStock > 0 && `(${stats.lowStock})`}
              </button>
              <button
                onClick={() => setFilter('empty')}
                className={`px-4 py-2 text-sm rounded-lg ${
                  filter === 'empty'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
              在庫切れ {stats && stats.outOfStock > 0 && `(${stats.outOfStock})`}
            </button>
          </div>
        </div>
        )}

        {/* Filters - Reorders Tab */}
        {activeTab === 'reorders' && (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 font-medium">ステータス:</span>
              {['all', 'pending', 'approved', 'shipped', 'delivered'].map((f) => (
                <button
                  key={f}
                  onClick={() => setReorderFilter(f)}
                  className={`px-4 py-2 text-sm rounded-lg ${
                    reorderFilter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f === 'all' ? 'すべて' : REORDER_STATUS_CONFIG[f]?.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Inventory List */}
        {activeTab === 'inventory' && (
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="px-6 py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">データを読み込んでいます...</p>
            </div>
          ) : filteredPlacements.length === 0 ? (
            <div className="px-6 py-12 text-center">
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
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                該当する在庫がありません
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {filter === 'low' && '要補充の商品はありません'}
                {filter === 'empty' && '在庫切れの商品はありません'}
                {filter === 'all' && '配置された商品がありません'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredPlacements.map((placement) => {
                const status = getStockStatus(placement);
                const percentage = getStockPercentage(placement);
                return (
                  <div key={placement.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start space-x-4">
                      {/* Product Image */}
                      <div className="flex-shrink-0 w-20 h-20 bg-gray-200 rounded-lg overflow-hidden">
                        {placement.product.mainImageUrl ? (
                          <img
                            src={placement.product.mainImageUrl}
                            alt={placement.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {placement.product.name}
                              </h3>
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${status.color}`}>
                                {status.icon} {status.label}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              配置場所: {placement.locationLabel}
                            </p>
                            <p className="text-sm text-gray-600">
                              キャンペーン: {placement.facilityCampaign.campaign.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              メーカー: {placement.facilityCampaign.campaign.manufacturer.companyName}
                            </p>
                          </div>

                          <div className="flex space-x-2">
                            <button
                              onClick={() => openUpdateModal(placement)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm whitespace-nowrap"
                            >
                              📝 在庫更新
                            </button>
                            {placement.currentUnits <= placement.reorderThreshold && (
                              <ReorderButton
                                placementId={placement.id}
                                productName={placement.product.name}
                                currentUnits={placement.currentUnits}
                                threshold={placement.reorderThreshold}
                                onSuccess={loadInventory}
                              />
                            )}
                          </div>
                        </div>

                        {/* Stock Level Bar */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-gray-600">
                              現在: <span className="font-bold text-gray-900">{placement.currentUnits}</span> / {placement.initialUnits}個
                            </span>
                            <span className="text-gray-600">
                              {percentage}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                placement.currentUnits === 0
                                  ? 'bg-red-500'
                                  : placement.currentUnits <= placement.reorderThreshold
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs mt-1">
                            <span className="text-gray-500">
                              補充目安: {placement.reorderThreshold}個
                            </span>
                            <span className="text-gray-500">
                              最終更新: {new Date(placement.updatedAt).toLocaleDateString('ja-JP')}
                            </span>
                          </div>
                        </div>

                        {/* Recent Stock Logs */}
                        {placement.stockLogs.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs font-medium text-gray-700 mb-2">最近の履歴:</p>
                            <div className="flex flex-wrap gap-2">
                              {placement.stockLogs.slice(0, 3).map((log) => (
                                <div
                                  key={log.id}
                                  className="text-xs bg-gray-50 rounded px-2 py-1"
                                >
                                  <span className={`font-medium ${CHANGE_TYPE_LABELS[log.changeType]?.color || 'text-gray-600'}`}>
                                    {CHANGE_TYPE_LABELS[log.changeType]?.label || log.changeType}
                                  </span>
                                  {' '}
                                  <span className="text-gray-600">
                                    {log.quantity > 0 ? '+' : ''}{log.quantity}個
                                  </span>
                                  {' '}
                                  <span className="text-gray-400">
                                    ({new Date(log.createdAt).toLocaleDateString('ja-JP')})
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        )}

        {/* Reorders List */}
        {activeTab === 'reorders' && (
        <div className="bg-white rounded-lg shadow">
          {reordersLoading ? (
            <div className="p-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">データを読み込んでいます...</p>
            </div>
          ) : reorders.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500">追加発注の履歴がありません</p>
              <p className="mt-2 text-sm text-gray-400">
                在庫が少ない商品は「在庫一覧」タブから追加発注できます
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {reorders.map((reorder) => (
                <div key={reorder.id} className="p-6">
                  <div className="flex items-start space-x-4">
                    {/* Product Image */}
                    <div className="flex-shrink-0 w-20 h-20 bg-gray-200 rounded-lg overflow-hidden">
                      {reorder.product.mainImageUrl ? (
                        <img
                          src={reorder.product.mainImageUrl}
                          alt={reorder.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          📦
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {reorder.product.name}
                            </h3>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${REORDER_STATUS_CONFIG[reorder.status]?.color}`}>
                              {REORDER_STATUS_CONFIG[reorder.status]?.label}
                            </span>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${URGENCY_LABELS[reorder.urgency]?.color}`}>
                              {URGENCY_LABELS[reorder.urgency]?.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            配置場所: {reorder.facilityProductPlacement.locationLabel}
                          </p>
                          <p className="text-sm text-gray-600">
                            メーカー: {reorder.manufacturer.companyName}
                          </p>
                        </div>

                        {reorder.status === 'shipped' && (
                          <button
                            onClick={() => handleConfirmDelivery(reorder.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm"
                          >
                            配達完了を確認
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">発注数量</p>
                          <p className="font-semibold text-gray-900">{reorder.requestedUnits}個</p>
                        </div>
                        {reorder.approvedUnits && (
                          <div>
                            <p className="text-gray-500">承認数量</p>
                            <p className="font-semibold text-green-600">{reorder.approvedUnits}個</p>
                          </div>
                        )}
                        {reorder.totalCost && (
                          <div>
                            <p className="text-gray-500">合計金額</p>
                            <p className="font-semibold text-gray-900">
                              {formatCurrency(reorder.totalCost, 'JPY', { showCurrency: true })}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-gray-500">発注日</p>
                          <p className="font-semibold text-gray-900">
                            {formatDate(reorder.createdAt)}
                          </p>
                        </div>
                      </div>

                      {reorder.trackingNumber && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">追跡番号:</span> {reorder.trackingNumber}
                          </p>
                          {reorder.estimatedDelivery && (
                            <p className="text-sm text-gray-700 mt-1">
                              <span className="font-medium">配達予定:</span> {formatDate(reorder.estimatedDelivery)}
                            </p>
                          )}
                        </div>
                      )}

                      {reorder.reason && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">発注理由:</span> {reorder.reason}
                          </p>
                        </div>
                      )}

                      {reorder.rejectionReason && (
                        <div className="mt-3 p-3 bg-red-50 rounded-lg">
                          <p className="text-sm text-red-700">
                            <span className="font-medium">却下理由:</span> {reorder.rejectionReason}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}
      </div>

      {/* Stock Update Modal */}
      {showUpdateModal && selectedPlacement && (
        <StockUpdateModal
          placement={selectedPlacement}
          onComplete={handleUpdateComplete}
          onCancel={() => {
            setShowUpdateModal(false);
            setSelectedPlacement(null);
          }}
        />
      )}
    </DashboardLayout>
  );
}
