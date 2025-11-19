'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';
import { useAuth } from '@/lib/auth-context';
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
  unitCost?: number;
  totalCost?: number;
  createdAt: string;
  facility: {
    id: string;
    facilityName: string;
    facilityType: string;
    phone?: string;
    address?: string;
  };
  product: {
    id: string;
    name: string;
    mainImageUrl?: string;
  };
  facilityProductPlacement: {
    locationLabel: string;
    currentUnits: number;
    reorderThreshold: number;
  };
}

const URGENCY_COLORS: Record<string, string> = {
  normal: 'bg-gray-100 text-gray-800',
  high: 'bg-orange-100 text-orange-800',
  emergency: 'bg-red-100 text-red-800',
};

export default function ManufacturerReordersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [reorders, setReorders] = useState<ReorderRequest[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReorder, setSelectedReorder] = useState<ReorderRequest | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showShipModal, setShowShipModal] = useState(false);
  const [approvedUnits, setApprovedUnits] = useState<number>(0);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [trackingNumber, setTrackingNumber] = useState<string>('');

  useEffect(() => {
    if (authLoading) return;
    
    if (!user || user.role !== 'manufacturer') {
      router.push('/dashboard');
      return;
    }

    loadReorders();
  }, [user, authLoading, router]);

  const loadReorders = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/manufacturer/reorder', {
        headers: { 'x-user-id': user!.id },
      });

      if (response.ok) {
        const data = await response.json();
        setReorders(data.reorderRequests);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading reorders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string, approvedUnits: number) => {
    try {
      const response = await fetch(`/api/manufacturer/reorder/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user!.id,
        },
        body: JSON.stringify({ approvedUnits }),
      });

      if (response.ok) {
        alert('追加発注を承認しました');
        loadReorders();
        setShowApproveModal(false);
      }
    } catch (error) {
      console.error('Error approving reorder:', error);
      alert('承認に失敗しました');
    }
  };

  const handleReject = async (id: string, rejectionReason: string) => {
    try {
      const response = await fetch(`/api/manufacturer/reorder/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user!.id,
        },
        body: JSON.stringify({ rejectionReason }),
      });

      if (response.ok) {
        alert('追加発注を却下しました');
        loadReorders();
        setShowRejectModal(false);
      }
    } catch (error) {
      console.error('Error rejecting reorder:', error);
      alert('却下に失敗しました');
    }
  };

  const handleShip = async (id: string, trackingNumber: string) => {
    try {
      const response = await fetch(`/api/manufacturer/reorder/${id}/ship`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user!.id,
        },
        body: JSON.stringify({ trackingNumber }),
      });

      if (response.ok) {
        alert('発送情報を登録しました');
        loadReorders();
        setShowShipModal(false);
      }
    } catch (error) {
      console.error('Error shipping reorder:', error);
      alert('発送登録に失敗しました');
    }
  };

  if (authLoading || !user) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold text-gray-900">追加発注管理</h1>
          <p className="mt-2 text-gray-600">施設からの追加発注リクエストを管理</p>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">承認待ち</p>
              <p className="mt-2 text-3xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">承認済み</p>
              <p className="mt-2 text-3xl font-bold text-green-600">{stats.approved}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">発送済み</p>
              <p className="mt-2 text-3xl font-bold text-blue-600">{stats.shipped}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">合計</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="p-12"><LoadingSpinner /></div>
          ) : reorders.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500">追加発注リクエストはありません</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {reorders.map((reorder) => (
                <div key={reorder.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold">{reorder.product.name}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full font-semibold ${URGENCY_COLORS[reorder.urgency]}`}>
                          {reorder.urgency === 'emergency' ? '緊急' : reorder.urgency === 'high' ? '優先' : '通常'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">施設: {reorder.facility.facilityName}</p>
                      <p className="text-sm text-gray-600">配置場所: {reorder.facilityProductPlacement.locationLabel}</p>
                      <p className="text-sm text-gray-600">
                        現在在庫: {reorder.facilityProductPlacement.currentUnits}個
                        （閾値: {reorder.facilityProductPlacement.reorderThreshold}個）
                      </p>
                      <div className="mt-2">
                        <span className="text-sm font-medium">発注数量: </span>
                        <span className="text-lg font-bold text-blue-600">{reorder.requestedUnits}個</span>
                      </div>
                      {reorder.reason && (
                        <p className="mt-2 text-sm text-gray-700">理由: {reorder.reason}</p>
                      )}
                    </div>

                    <div className="ml-4 flex flex-col space-y-2">
                      {reorder.status === 'pending' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedReorder(reorder);
                              setApprovedUnits(reorder.requestedUnits);
                              setShowApproveModal(true);
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                          >
                            承認
                          </button>
                          <button
                            onClick={() => {
                              setSelectedReorder(reorder);
                              setShowRejectModal(true);
                            }}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                          >
                            却下
                          </button>
                        </>
                      )}
                      {reorder.status === 'approved' && (
                        <button
                          onClick={() => {
                            setSelectedReorder(reorder);
                            setShowShipModal(true);
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                        >
                          発送登録
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Approve Modal */}
      {showApproveModal && selectedReorder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold mb-4">追加発注を承認</h3>
            <p className="text-sm text-gray-600 mb-4">
              承認数量を入力してください
            </p>
            <input
              type="number"
              value={approvedUnits}
              onChange={(e) => setApprovedUnits(parseInt(e.target.value) || 0)}
              min="1"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  if (approvedUnits > 0) {
                    handleApprove(selectedReorder.id, approvedUnits);
                  } else {
                    alert('承認数量は1以上を入力してください');
                  }
                }}
                disabled={approvedUnits <= 0}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                承認
              </button>
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setApprovedUnits(0);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedReorder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold mb-4">追加発注を却下</h3>
            <p className="text-sm text-gray-600 mb-4">
              却下理由を入力してください
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              rows={3}
              placeholder="却下理由を入力..."
            />
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  if (rejectionReason.trim()) {
                    handleReject(selectedReorder.id, rejectionReason);
                  } else {
                    alert('却下理由を入力してください');
                  }
                }}
                disabled={!rejectionReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                却下
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ship Modal */}
      {showShipModal && selectedReorder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold mb-4">発送情報を登録</h3>
            <p className="text-sm text-gray-600 mb-4">
              追跡番号を入力してください（任意）
            </p>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="追跡番号"
            />
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  handleShip(selectedReorder.id, trackingNumber);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                発送登録
              </button>
              <button
                onClick={() => {
                  setShowShipModal(false);
                  setTrackingNumber('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
