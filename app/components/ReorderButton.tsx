'use client';

import { useState } from 'react';

interface ReorderButtonProps {
  placementId: string;
  productName: string;
  currentUnits: number;
  threshold: number;
  onSuccess: () => void;
}

export default function ReorderButton({
  placementId,
  productName,
  currentUnits,
  threshold,
  onSuccess,
}: ReorderButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const requestedUnits = parseInt(formData.get('requestedUnits') as string);
      const reason = formData.get('reason') as string;
      const urgency = formData.get('urgency') as string;

      const userStr = localStorage.getItem('user');
      if (!userStr) return;
      const userData = JSON.parse(userStr);

      const response = await fetch('/api/facility/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userData.id,
        },
        body: JSON.stringify({
          facilityProductPlacementId: placementId,
          requestedUnits,
          reason,
          urgency,
        }),
      });

      if (response.ok) {
        alert('追加発注リクエストを送信しました');
        setShowModal(false);
        onSuccess();
      } else {
        const error = await response.json();
        alert(error.error || '発注に失敗しました');
      }
    } catch (error) {
      console.error('Error creating reorder:', error);
      alert('発注に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium text-sm whitespace-nowrap"
      >
        📦 追加発注
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-xl font-bold mb-4">追加発注リクエスト</h3>
            <p className="text-sm text-gray-600 mb-4">
              商品: <span className="font-semibold">{productName}</span>
            </p>
            <p className="text-sm text-gray-600 mb-4">
              現在在庫: <span className="font-semibold text-red-600">{currentUnits}個</span> / 
              閾値: <span className="font-semibold">{threshold}個</span>
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  発注数量 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="requestedUnits"
                  required
                  min="1"
                  defaultValue={threshold - currentUnits}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  緊急度
                </label>
                <select
                  name="urgency"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="normal">通常</option>
                  <option value="high">優先</option>
                  <option value="emergency">緊急</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  発注理由
                </label>
                <textarea
                  name="reason"
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  placeholder="在庫不足の理由や状況を記入してください..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium disabled:bg-gray-400"
                >
                  {loading ? '送信中...' : '発注リクエスト送信'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
