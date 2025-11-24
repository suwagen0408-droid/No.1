'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';

interface Placement {
  id: string;
  locationLabel: string;
  currentUnits: number;
  reorderThreshold: number;
  initialUnits: number;
  updatedAt: string;
  product: {
    id: string;
    name: string;
    mainImageUrl?: string;
    category: string;
  };
  facilityCampaign: {
    facility: {
      id: string;
      facilityName: string;
      facilityType: string;
    };
    campaign: {
      id: string;
      name: string;
      startDate: string;
      endDate: string;
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

interface CampaignGroup {
  campaign: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  };
  placements: Placement[];
  stats: {
    totalUnits: number;
    lowStock: number;
    outOfStock: number;
  };
}

interface Stats {
  totalPlacements: number;
  lowStock: number;
  outOfStock: number;
  totalUnits: number;
  facilitiesCount: number;
}

export default function ManufacturerInventoryPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [byCampaign, setByCampaign] = useState<CampaignGroup[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [stockLevelFilter, setStockLevelFilter] = useState<'all' | 'low' | 'empty'>('all');
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());

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
    loadInventory();
  }, [router, stockLevelFilter]);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;

      const userData = JSON.parse(userStr);
      
      let url = '/api/manufacturer/inventory';
      if (stockLevelFilter !== 'all') {
        url += `?stockLevel=${stockLevelFilter}`;
      }

      const response = await fetch(url, {
        headers: { 'x-user-id': userData.id },
      });

      if (response.ok) {
        const data = await response.json();
        setPlacements(data.placements);
        setByCampaign(data.byCampaign);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCampaign = (campaignId: string) => {
    const newExpanded = new Set(expandedCampaigns);
    if (newExpanded.has(campaignId)) {
      newExpanded.delete(campaignId);
    } else {
      newExpanded.add(campaignId);
    }
    setExpandedCampaigns(newExpanded);
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

  if (!user) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold text-gray-900">在庫状況</h1>
          <p className="mt-2 text-gray-600">
            全施設の商品在庫状況を確認できます
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
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
                  <p className="text-sm text-gray-600">参加施設</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{stats.facilitiesCount}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🏢</span>
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
              onClick={() => setStockLevelFilter('all')}
              className={`px-4 py-2 text-sm rounded-lg ${
                stockLevelFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              すべて
            </button>
            <button
              onClick={() => setStockLevelFilter('low')}
              className={`px-4 py-2 text-sm rounded-lg ${
                stockLevelFilter === 'low'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              要補充 {stats && stats.lowStock > 0 && `(${stats.lowStock})`}
            </button>
            <button
              onClick={() => setStockLevelFilter('empty')}
              className={`px-4 py-2 text-sm rounded-lg ${
                stockLevelFilter === 'empty'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              在庫切れ {stats && stats.outOfStock > 0 && `(${stats.outOfStock})`}
            </button>
          </div>
        </div>

        {/* Campaign Groups */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white rounded-lg shadow px-6 py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">データを読み込んでいます...</p>
            </div>
          ) : byCampaign.length === 0 ? (
            <div className="bg-white rounded-lg shadow px-6 py-12 text-center">
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
                {stockLevelFilter === 'low' && '要補充の商品はありません'}
                {stockLevelFilter === 'empty' && '在庫切れの商品はありません'}
                {stockLevelFilter === 'all' && '配置された商品がありません'}
              </p>
            </div>
          ) : (
            byCampaign.map((group) => {
              const isExpanded = expandedCampaigns.has(group.campaign.id);
              return (
                <div key={group.campaign.id} className="bg-white rounded-lg shadow">
                  {/* Campaign Header */}
                  <button
                    onClick={() => toggleCampaign(group.campaign.id)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 text-left">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {group.campaign.name}
                        </h3>
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm">
                          {group.placements.length}件の配置
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        期間: {new Date(group.campaign.startDate).toLocaleDateString('ja-JP')} 〜{' '}
                        {new Date(group.campaign.endDate).toLocaleDateString('ja-JP')}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-sm">
                        <span className="text-gray-600">
                          総在庫: <span className="font-semibold">{group.stats.totalUnits}</span>個
                        </span>
                        {group.stats.lowStock > 0 && (
                          <span className="text-yellow-600">
                            ⚠️ 要補充: {group.stats.lowStock}件
                          </span>
                        )}
                        {group.stats.outOfStock > 0 && (
                          <span className="text-red-600">
                            🚨 在庫切れ: {group.stats.outOfStock}件
                          </span>
                        )}
                      </div>
                    </div>
                    <svg
                      className={`w-6 h-6 text-gray-400 transition-transform ${
                        isExpanded ? 'transform rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* Placements List */}
                  {isExpanded && (
                    <div className="border-t divide-y divide-gray-200">
                      {group.placements.map((placement) => {
                        const status = getStockStatus(placement);
                        const percentage = getStockPercentage(placement);
                        return (
                          <div key={placement.id} className="px-6 py-4">
                            <div className="flex items-start space-x-4">
                              {/* Product Image */}
                              <div className="flex-shrink-0 w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
                                {placement.product.mainImageUrl ? (
                                  <img
                                    src={placement.product.mainImageUrl}
                                    alt={placement.product.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <h4 className="font-semibold text-gray-900">
                                        {placement.product.name}
                                      </h4>
                                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${status.color}`}>
                                        {status.icon} {status.label}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1">
                                      施設: {placement.facilityCampaign.facility.facilityName}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      配置場所: {placement.locationLabel}
                                    </p>
                                  </div>
                                </div>

                                {/* Stock Bar */}
                                <div className="mt-2">
                                  <div className="flex items-center justify-between text-sm mb-1">
                                    <span className="text-gray-600">
                                      <span className="font-bold text-gray-900">{placement.currentUnits}</span> / {placement.initialUnits}個
                                    </span>
                                    <span className="text-gray-600">{percentage}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
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
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
