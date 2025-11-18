'use client';

import { useState } from 'react';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  totalUnits: number;
  status: string;
  _count: {
    facilityCampaigns: number;
  };
}

interface CampaignActivateModalProps {
  campaign: Campaign;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export default function CampaignActivateModal({ 
  campaign, 
  onConfirm, 
  onCancel 
}: CampaignActivateModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const now = new Date();
  const startDate = new Date(campaign.startDate);
  const isEarlyStart = now < startDate;
  const daysEarly = isEarlyStart 
    ? Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) 
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEarlyStart && !reason.trim()) {
      alert('早期開始の理由を入力してください');
      return;
    }

    setLoading(true);
    try {
      await onConfirm(reason);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">
            {isEarlyStart ? '⚡ キャンペーン早期開始の確認' : '🚀 キャンペーン開始の確認'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Campaign Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-3">{campaign.name}</h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">予定開始日:</span>
                <span className="font-medium text-gray-900">
                  {new Date(campaign.startDate).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-700">予定終了日:</span>
                <span className="font-medium text-gray-900">
                  {new Date(campaign.endDate).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-700">参加施設数:</span>
                <span className="font-medium text-gray-900">
                  {campaign._count.facilityCampaigns}施設
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-700">配布予定数:</span>
                <span className="font-medium text-gray-900">
                  {campaign.totalUnits.toLocaleString()}個
                </span>
              </div>
            </div>
          </div>

          {/* Early Start Warning */}
          {isEarlyStart && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <svg 
                  className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" 
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
                <div className="flex-1">
                  <h4 className="font-semibold text-yellow-900 mb-1">
                    早期開始の確認
                  </h4>
                  <p className="text-sm text-yellow-800">
                    このキャンペーンは予定開始日より<strong>{daysEarly}日早く</strong>開始されます。
                    参加している全施設に通知が送信されますが、準備が整っていない可能性があります。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Impact Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">
              📢 通知される対象
            </h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>
                  <strong>{campaign._count.facilityCampaigns}施設</strong>に開始通知が送信されます
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>
                  施設は商品の配置準備を開始できます
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>
                  キャンペーンのステータスが「実施中」に変更されます
                </span>
              </li>
            </ul>
          </div>

          {/* Reason Input (required for early start) */}
          {isEarlyStart && (
            <div>
              <label className="block text-base font-semibold text-gray-900 mb-3">
                早期開始の理由 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="例: 急遽、プロモーション施策を前倒しすることになったため"
                required
              />
              <p className="mt-2 text-sm text-gray-600">
                この理由は監査ログに記録され、後から確認できます。
              </p>
            </div>
          )}

          {/* Optional Reason (for scheduled start) */}
          {!isEarlyStart && (
            <div>
              <label className="block text-base font-semibold text-gray-900 mb-3">
                開始の理由（任意）
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="例: すべての施設の準備が整ったため"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-6 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 ${
                isEarlyStart
                  ? 'bg-yellow-600 hover:bg-yellow-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  処理中...
                </span>
              ) : isEarlyStart ? (
                `${daysEarly}日早く開始する`
              ) : (
                'キャンペーンを開始'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
