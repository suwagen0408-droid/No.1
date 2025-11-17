'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';

interface QRCode {
  id: string;
  qrCodeUrl: string;
  label?: string;
  isActive: boolean;
  scanCount: number;
  createdAt: string;
  lastScannedAt?: string;
  facilityProductPlacement: {
    product: {
      id: string;
      name: string;
      mainImageUrl?: string;
    };
    facilityCampaign: {
      campaign: {
        name: string;
      };
    };
  };
  _count: {
    qrScanEvents: number;
    clickEvents: number;
    purchaseEvents: number;
  };
}

interface Placement {
  id: string;
  locationLabel: string;
  product: {
    name: string;
  };
  facilityCampaign: {
    campaign: {
      name: string;
    };
  };
}

export default function QRCodesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedQrCode, setSelectedQrCode] = useState<QRCode | null>(null);
  const [formData, setFormData] = useState({
    facilityProductPlacementId: '',
    label: '',
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

      // Load QR codes
      const qrRes = await fetch('/api/facility/qrcodes', {
        headers: { 'x-user-id': userData.id },
      });
      if (qrRes.ok) {
        const data = await qrRes.json();
        setQrCodes(data.qrCodes);
      }

      // Load placements for creating new QR codes
      const placementsRes = await fetch('/api/facility/placements', {
        headers: { 'x-user-id': userData.id },
      });
      if (placementsRes.ok) {
        const data = await placementsRes.json();
        setPlacements(data.placements);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQRCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;

      const userData = JSON.parse(userStr);
      const response = await fetch('/api/facility/qrcodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userData.id,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        alert('QRコードを生成しました');
        
        // Download QR code image
        if (data.qrImageUrl) {
          window.open(data.qrImageUrl, '_blank');
        }
        
        setShowCreateModal(false);
        setFormData({ facilityProductPlacementId: '', label: '' });
        loadData();
      } else {
        const data = await response.json();
        alert(data.error || '生成に失敗しました');
      }
    } catch (error) {
      console.error('Error creating QR code:', error);
      alert('生成に失敗しました');
    }
  };

  const handleToggleActive = async (qrCode: QRCode) => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;

      const userData = JSON.parse(userStr);
      const response = await fetch(`/api/facility/qrcodes/${qrCode.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userData.id,
        },
        body: JSON.stringify({ isActive: !qrCode.isActive }),
      });

      if (response.ok) {
        loadData();
      } else {
        const data = await response.json();
        alert(data.error || '更新に失敗しました');
      }
    } catch (error) {
      console.error('Error toggling QR code:', error);
      alert('更新に失敗しました');
    }
  };

  const handleDownloadQRCode = (qrCode: QRCode) => {
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCode.qrCodeUrl)}`;
    window.open(qrImageUrl, '_blank');
  };

  const handleDeleteQRCode = async (qrCode: QRCode) => {
    if (!confirm('このQRコードを削除してもよろしいですか？')) return;

    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;

      const userData = JSON.parse(userStr);
      const response = await fetch(`/api/facility/qrcodes/${qrCode.id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': userData.id },
      });

      if (response.ok) {
        alert('QRコードを削除しました');
        loadData();
      } else {
        const data = await response.json();
        alert(data.error || '削除に失敗しました');
      }
    } catch (error) {
      console.error('Error deleting QR code:', error);
      alert('削除に失敗しました');
    }
  };

  if (!user) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <DashboardLayout user={user}>
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="border-b px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">QRコード管理</h1>
              <p className="mt-2 text-gray-600">
                商品のQRコードを生成・管理します
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              QRコード生成
            </button>
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">データを読み込んでいます...</p>
          </div>
        ) : (
          <div className="px-6 py-8">
            {qrCodes.length === 0 ? (
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
                    d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">QRコードがありません</h3>
                <p className="mt-1 text-sm text-gray-500">
                  商品配置からQRコードを生成してみましょう
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  最初のQRコードを生成
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {qrCodes.map((qrCode) => (
                  <div
                    key={qrCode.id}
                    className={`border rounded-lg p-4 ${
                      qrCode.isActive ? 'border-gray-200' : 'border-gray-300 bg-gray-50'
                    }`}
                  >
                    {/* QR Code Image */}
                    <div className="bg-white p-4 rounded-lg border mb-4 text-center">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode.qrCodeUrl)}`}
                        alt="QR Code"
                        className="w-full h-auto"
                      />
                    </div>

                    {/* Status Badge */}
                    <div className="mb-3">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                          qrCode.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {qrCode.isActive ? '有効' : '無効'}
                      </span>
                    </div>

                    {/* Product Info */}
                    <div className="mb-3">
                      <h3 className="font-semibold text-gray-900 text-sm">
                        {qrCode.facilityProductPlacement.product.name}
                      </h3>
                      <p className="text-xs text-gray-600 mt-1">
                        {qrCode.facilityProductPlacement.facilityCampaign.campaign.name}
                      </p>
                      {qrCode.label && (
                        <p className="text-xs text-blue-600 mt-1">📍 {qrCode.label}</p>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                      <div className="bg-blue-50 rounded p-2">
                        <p className="text-xs text-gray-600">スキャン</p>
                        <p className="text-lg font-bold text-blue-600">
                          {qrCode._count.qrScanEvents}
                        </p>
                      </div>
                      <div className="bg-purple-50 rounded p-2">
                        <p className="text-xs text-gray-600">クリック</p>
                        <p className="text-lg font-bold text-purple-600">
                          {qrCode._count.clickEvents}
                        </p>
                      </div>
                      <div className="bg-green-50 rounded p-2">
                        <p className="text-xs text-gray-600">購入</p>
                        <p className="text-lg font-bold text-green-600">
                          {qrCode._count.purchaseEvents}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleDownloadQRCode(qrCode)}
                        className="px-3 py-2 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        ダウンロード
                      </button>
                      <button
                        onClick={() => handleToggleActive(qrCode)}
                        className={`px-3 py-2 text-xs font-medium rounded ${
                          qrCode.isActive
                            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {qrCode.isActive ? '無効化' : '有効化'}
                      </button>
                    </div>

                    <button
                      onClick={() => handleDeleteQRCode(qrCode)}
                      className="w-full mt-2 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100"
                    >
                      削除
                    </button>

                    {/* Last scanned */}
                    {qrCode.lastScannedAt && (
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        最終スキャン:{' '}
                        {new Date(qrCode.lastScannedAt).toLocaleDateString('ja-JP')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create QR Code Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="border-b px-6 py-4">
              <h2 className="text-xl font-bold text-gray-900">QRコード生成</h2>
            </div>

            <form onSubmit={handleCreateQRCode} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  商品配置選択 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.facilityProductPlacementId}
                  onChange={(e) =>
                    setFormData({ ...formData, facilityProductPlacementId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">選択してください</option>
                  {placements.map((placement) => (
                    <option key={placement.id} value={placement.id}>
                      {placement.product.name} - {placement.locationLabel}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  ※ 商品配置がない場合は、先に商品を配置してください
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ラベル（オプション）
                </label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: フロント用, 客室用"
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-blue-800">
                  💡 QRコードを生成すると、自動的にダウンロード用の画面が開きます。
                  印刷して施設内に設置してください。
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ facilityProductPlacementId: '', label: '' });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  QRコードを生成
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Detail Modal */}
      {selectedQrCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4">
              <h2 className="text-xl font-bold text-gray-900">QRコード詳細</h2>
            </div>

            <div className="p-6">
              {/* Content here if needed */}
              <button
                onClick={() => setSelectedQrCode(null)}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
