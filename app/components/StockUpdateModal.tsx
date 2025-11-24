'use client';

import { useState } from 'react';

interface Placement {
  id: string;
  locationLabel: string;
  currentUnits: number;
  reorderThreshold: number;
  product: {
    name: string;
    mainImageUrl?: string;
  };
}

interface StockUpdateModalProps {
  placement: Placement;
  onComplete: () => void;
  onCancel: () => void;
}

const CHANGE_TYPES = [
  { value: 'usage', label: '使用', icon: '📉', description: '商品の使用・消費' },
  { value: 'restock', label: '補充', icon: '📦', description: '在庫の補充・追加' },
  { value: 'adjustment', label: '調整', icon: '🔧', description: '在庫数の調整' },
  { value: 'damage', label: '破損', icon: '💔', description: '破損・廃棄' },
];

export default function StockUpdateModal({
  placement,
  onComplete,
  onCancel,
}: StockUpdateModalProps) {
  const [changeType, setChangeType] = useState<'usage' | 'restock' | 'adjustment' | 'damage'>('usage');
  const [quantity, setQuantity] = useState<string>('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateNewStock = () => {
    const qty = parseInt(quantity) || 0;
    switch (changeType) {
      case 'usage':
      case 'damage':
        return Math.max(0, placement.currentUnits - Math.abs(qty));
      case 'restock':
        return placement.currentUnits + Math.abs(qty);
      case 'adjustment':
        return Math.max(0, placement.currentUnits + qty);
      default:
        return placement.currentUnits;
    }
  };

  const newStock = calculateNewStock();
  const isLowStock = newStock <= placement.reorderThreshold;
  const isOutOfStock = newStock === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty === 0) {
      setError('数量を入力してください');
      return;
    }

    if (changeType === 'adjustment' && qty < 0 && Math.abs(qty) > placement.currentUnits) {
      setError('調整後の在庫数が負の値になります');
      return;
    }

    setSubmitting(true);

    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        throw new Error('ログインが必要です');
      }

      const userData = JSON.parse(userStr);

      const response = await fetch(`/api/facility/placements/${placement.id}/update-stock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userData.id,
        },
        body: JSON.stringify({
          changeType,
          quantity: qty,
          note: note.trim() || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message || '在庫を更新しました');
        onComplete();
      } else {
        const errorData = await response.json();
        setError(errorData.error || '更新に失敗しました');
      }
    } catch (error) {
      console.error('Stock update error:', error);
      setError('更新に失敗しました。もう一度お試しください。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="border-b px-6 py-4 bg-gray-50">
          <h2 className="text-2xl font-bold text-gray-900">在庫更新</h2>
          <p className="text-sm text-gray-600 mt-1">
            {placement.product.name} - {placement.locationLabel}
          </p>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="px-6 py-6 overflow-y-auto max-h-[calc(90vh-150px)]">
          {/* Current Stock Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">現在の在庫</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-blue-600">{placement.currentUnits}個</p>
                <p className="text-sm text-gray-600 mt-1">
                  補充目安: {placement.reorderThreshold}個
                </p>
              </div>
              {placement.currentUnits <= placement.reorderThreshold && (
                <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                  ⚠️ 要補充
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Change Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              更新タイプ <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {CHANGE_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => {
                    setChangeType(type.value as any);
                    setError(null);
                  }}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    changeType === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-2xl">{type.icon}</span>
                    <span className={`font-semibold ${
                      changeType === type.value ? 'text-blue-700' : 'text-gray-700'
                    }`}>
                      {type.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{type.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              数量 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  setError(null);
                }}
                min={changeType === 'adjustment' ? -placement.currentUnits : 1}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                placeholder={
                  changeType === 'adjustment'
                    ? '±数量を入力'
                    : '数量を入力'
                }
                required
              />
              <div className="absolute right-3 top-3 text-gray-400 text-lg">個</div>
            </div>
            {changeType === 'adjustment' && (
              <p className="mt-1 text-xs text-gray-500">
                ※ 調整の場合は正の値（増加）または負の値（減少）を入力してください
              </p>
            )}
          </div>

          {/* Preview */}
          {quantity && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-3">更新後の在庫予測</h4>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">現在</p>
                    <p className="text-2xl font-bold text-gray-700">{placement.currentUnits}</p>
                  </div>
                  <div className="text-2xl text-gray-400">→</div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">更新後</p>
                    <p className={`text-2xl font-bold ${
                      isOutOfStock ? 'text-red-600' :
                      isLowStock ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {newStock}
                    </p>
                  </div>
                </div>
                {isOutOfStock && (
                  <div className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                    🚨 在庫切れ
                  </div>
                )}
                {!isOutOfStock && isLowStock && (
                  <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                    ⚠️ 要補充
                  </div>
                )}
              </div>
              {(isLowStock || isOutOfStock) && (
                <div className="mt-3 text-xs text-gray-600">
                  ℹ️ 更新後、施設とメーカーに通知が送信されます
                </div>
              )}
            </div>
          )}

          {/* Note */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              備考（任意）
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="必要に応じてメモを記入してください"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <svg
                className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="text-xs text-blue-800">
                <p className="font-medium mb-1">更新について</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>在庫の変更履歴は記録されます</li>
                  <li>在庫が少なくなると自動でアラートが送信されます</li>
                  <li>メーカーにも在庫状況が共有されます</li>
                </ul>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-gray-50 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 disabled:text-gray-400"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={!quantity || submitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
          >
            {submitting ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                更新中...
              </span>
            ) : (
              '✓ 在庫を更新'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
