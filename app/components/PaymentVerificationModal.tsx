'use client';

import { useState } from 'react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  total: number;
  currency: string;
  bankTransferProof?: string;
  bankTransferDate?: string;
  bankTransferNote?: string;
  manufacturer: {
    companyName: string;
    email: string;
  };
}

interface PaymentVerificationModalProps {
  invoice: Invoice;
  onComplete: () => void;
  onCancel: () => void;
}

export default function PaymentVerificationModal({
  invoice,
  onComplete,
  onCancel,
}: PaymentVerificationModalProps) {
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (amount: number, currency: string = 'JPY') => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('ja-JP');
  };

  const handleSubmit = async () => {
    if (!decision) {
      setError('承認または却下を選択してください');
      return;
    }

    if (decision === 'reject' && !reason.trim()) {
      setError('却下の場合は理由を入力してください');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        throw new Error('ログインが必要です');
      }

      const userData = JSON.parse(userStr);

      const response = await fetch('/api/payments/bank-transfer/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userData.id,
        },
        body: JSON.stringify({
          invoiceId: invoice.id,
          approved: decision === 'approve',
          reason: decision === 'reject' ? reason : undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message || '処理が完了しました');
        onComplete();
      } else {
        const errorData = await response.json();
        setError(errorData.error || '処理に失敗しました');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setError('処理に失敗しました。もう一度お試しください。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="border-b px-6 py-4 bg-gray-50">
          <h2 className="text-2xl font-bold text-gray-900">支払い証明の確認</h2>
          <p className="text-sm text-gray-600 mt-1">
            請求書 #{invoice.invoiceNumber}
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Invoice Details */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">請求情報</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">メーカー</p>
                <p className="font-medium">{invoice.manufacturer.companyName}</p>
              </div>
              <div>
                <p className="text-gray-600">メールアドレス</p>
                <p className="font-medium">{invoice.manufacturer.email}</p>
              </div>
              <div>
                <p className="text-gray-600">請求金額</p>
                <p className="text-lg font-bold text-blue-600">
                  {formatCurrency(invoice.total, invoice.currency)}
                </p>
              </div>
              <div>
                <p className="text-gray-600">振込日</p>
                <p className="font-medium">{formatDate(invoice.bankTransferDate)}</p>
              </div>
              {invoice.bankTransferNote && (
                <div className="col-span-2">
                  <p className="text-gray-600">備考</p>
                  <p className="font-medium">{invoice.bankTransferNote}</p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Proof */}
          {invoice.bankTransferProof && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">振込証明書</h3>
              <div className="border rounded-lg overflow-hidden">
                {invoice.bankTransferProof.endsWith('.pdf') ? (
                  <div className="bg-gray-100 p-8 text-center">
                    <svg
                      className="w-16 h-16 mx-auto text-red-500 mb-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-sm text-gray-600 mb-4">PDFファイル</p>
                    <a
                      href={invoice.bankTransferProof}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      📎 PDFを開く
                    </a>
                  </div>
                ) : (
                  <img
                    src={invoice.bankTransferProof}
                    alt="振込証明書"
                    className="w-full h-auto"
                  />
                )}
              </div>
            </div>
          )}

          {/* Decision Section */}
          <div className="border rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">確認結果</h3>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Decision Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    setDecision('approve');
                    setReason('');
                    setError(null);
                  }}
                  className={`flex-1 px-6 py-4 rounded-lg border-2 transition-all ${
                    decision === 'approve'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  <div className="text-center">
                    <div
                      className={`text-4xl mb-2 ${
                        decision === 'approve' ? 'text-green-600' : 'text-gray-400'
                      }`}
                    >
                      ✓
                    </div>
                    <div
                      className={`font-semibold ${
                        decision === 'approve' ? 'text-green-700' : 'text-gray-700'
                      }`}
                    >
                      承認する
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      支払いを完了にします
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setDecision('reject');
                    setError(null);
                  }}
                  className={`flex-1 px-6 py-4 rounded-lg border-2 transition-all ${
                    decision === 'reject'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-red-300'
                  }`}
                >
                  <div className="text-center">
                    <div
                      className={`text-4xl mb-2 ${
                        decision === 'reject' ? 'text-red-600' : 'text-gray-400'
                      }`}
                    >
                      ✕
                    </div>
                    <div
                      className={`font-semibold ${
                        decision === 'reject' ? 'text-red-700' : 'text-gray-700'
                      }`}
                    >
                      却下する
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      証明に問題があります
                    </div>
                  </div>
                </button>
              </div>

              {/* Rejection Reason */}
              {decision === 'reject' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    却下理由 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                    placeholder="却下の理由を入力してください（メーカーに通知されます）"
                    className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  <p className="mt-2 text-xs text-red-600">
                    ※ 却下理由はメーカーに通知されます。具体的な内容を記入してください。
                  </p>
                </div>
              )}

              {/* Approval Confirmation */}
              {decision === 'approve' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <svg
                      className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="text-sm text-green-800">
                      <p className="font-medium mb-1">承認の確認</p>
                      <ul className="space-y-1 list-disc list-inside">
                        <li>請求書の支払いステータスが「完了」になります</li>
                        <li>メーカーに支払い完了の通知が送信されます</li>
                        <li>この操作は取り消せません</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-gray-50 flex justify-end space-x-3">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 disabled:text-gray-400"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={!decision || submitting || (decision === 'reject' && !reason.trim())}
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
                処理中...
              </span>
            ) : (
              '確定する'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
