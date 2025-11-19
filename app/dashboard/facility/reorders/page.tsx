'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';
import { useAuth } from '@/lib/auth-context';
import StatusBadge from '@/app/components/common/StatusBadge';
import LoadingSpinner from '@/app/components/common/LoadingSpinner';
import { formatDate, formatCurrency } from '@/lib/formatters';

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

export default function FacilityReordersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [reorders, setReorders] = useState<ReorderRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push('/login');
      return;
    }

    if (user.role !== 'facility') {
      router.push('/dashboard');
      return;
    }

    loadReorders();
  }, [user, authLoading, router, filter]);

  const loadReorders = async () => {
    setLoading(true);
    try {
      const url = filter === 'all' 
        ? '/api/facility/reorder'
        : `/api/facility/reorder?status=${filter}`;
        
      const response = await fetch(url, {
        headers: { 'x-user-id': user!.id },
      });

      if (response.ok) {
        const data = await response.json();
        setReorders(data.reorderRequests);
      }
    } catch (error) {
      console.error('Error loading reorders:', error);
    } finally {
      setLoading(false);
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

  if (authLoading || !user) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">追加発注管理</h1>
              <p className="mt-2 text-gray-600">
                追加発注の履歴と状況を確認できます
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard/facility/inventory')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              在庫管理に戻る
            </button>
          </div>
        </div>

        {/* Stats */}
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

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 font-medium">ステータス:</span>
            {['all', 'pending', 'approved', 'shipped', 'delivered'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm rounded-lg ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f === 'all' ? 'すべて' : REORDER_STATUS_CONFIG[f]?.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reorders List */}
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="p-12">
              <LoadingSpinner />
            </div>
          ) : reorders.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500">追加発注の履歴がありません</p>
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
      </div>
    </DashboardLayout>
  );
}
