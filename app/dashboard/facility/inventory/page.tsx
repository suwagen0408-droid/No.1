'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';
import StockUpdateModal from '@/app/components/StockUpdateModal';

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

const CHANGE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  usage: { label: '使用', color: 'text-blue-600' },
  restock: { label: '補充', color: 'text-green-600' },
  adjustment: { label: '調整', color: 'text-yellow-600' },
  damage: { label: '破損', color: 'text-red-600' },
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
          <h1 className="text-3xl font-bold text-gray-900">在庫管理</h1>
          <p className="mt-2 text-gray-600">
            配置された商品の在庫状況を確認・更新できます
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
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

        {/* Filters */}
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

        {/* Inventory List */}
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

                          <button
                            onClick={() => openUpdateModal(placement)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm whitespace-nowrap"
                          >
                            📝 在庫更新
                          </button>
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
