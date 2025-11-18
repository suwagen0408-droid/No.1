'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/app/components/DashboardLayout';
import PaymentMethodSelector from '@/app/components/PaymentMethodSelector';
import BankTransferInfo from '@/app/components/BankTransferInfo';
import BankTransferUploadForm from '@/app/components/BankTransferUploadForm';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  campaign?: {
    name: string;
  };
  facility?: {
    facilityName: string;
  };
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  issuedAt?: string;
  dueDate?: string;
  paidAt?: string;
  bankTransferProof?: string;
  bankTransferDate?: string;
  bankTransferNote?: string;
  verifiedAt?: string;
  invoiceItems: InvoiceItem[];
}

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: '未払い', color: 'bg-yellow-100 text-yellow-800' },
  processing: { label: '確認中', color: 'bg-blue-100 text-blue-800' },
  completed: { label: '支払済み', color: 'bg-green-100 text-green-800' },
  failed: { label: '失敗', color: 'bg-red-100 text-red-800' },
  cancelled: { label: 'キャンセル', color: 'bg-gray-100 text-gray-800' },
};

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'stripe' | 'bank_transfer' | null>(null);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [showPaymentCancelled, setShowPaymentCancelled] = useState(false);

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
    loadInvoice();

    // Check payment status from URL params
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      setShowPaymentSuccess(true);
    } else if (paymentStatus === 'cancelled') {
      setShowPaymentCancelled(true);
    }
  }, [router, id, searchParams]);

  const loadInvoice = async () => {
    setLoading(true);
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;

      const userData = JSON.parse(userStr);
      const response = await fetch(`/api/manufacturer/invoices/${id}`, {
        headers: { 'x-user-id': userData.id },
      });

      if (response.ok) {
        const data = await response.json();
        setInvoice(data.invoice);
      } else {
        console.error('Failed to load invoice');
        router.push('/dashboard/manufacturer/invoices');
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStripePayment = async () => {
    if (!invoice) return;

    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;

      const userData = JSON.parse(userStr);
      const response = await fetch('/api/payments/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userData.id,
        },
        body: JSON.stringify({ invoiceId: invoice.id }),
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        const error = await response.json();
        alert(error.error || '決済ページの作成に失敗しました');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      alert('決済ページの作成に失敗しました');
    }
  };

  const handleBankTransferUploadComplete = () => {
    loadInvoice();
    setSelectedPaymentMethod(null);
  };

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

  const formatDateTime = (date: string | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('ja-JP');
  };

  const canPay = () => {
    return invoice && invoice.paymentStatus === 'pending' && invoice.status === 'issued';
  };

  const isOverdue = () => {
    if (!invoice || !invoice.dueDate) return false;
    return new Date(invoice.dueDate) < new Date() && invoice.paymentStatus === 'pending';
  };

  if (!user) {
    return <div className="p-8">Loading...</div>;
  }

  if (loading) {
    return (
      <DashboardLayout user={user}>
        <div className="px-6 py-12 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">データを読み込んでいます...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!invoice) {
    return (
      <DashboardLayout user={user}>
        <div className="text-center py-12">
          <p className="text-gray-600">請求書が見つかりません</p>
          <Link
            href="/dashboard/manufacturer/invoices"
            className="mt-4 inline-block text-blue-600 hover:text-blue-800"
          >
            請求書一覧に戻る
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user}>
      {/* Success/Cancelled Messages */}
      {showPaymentSuccess && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">決済が完了しました</h3>
              <p className="mt-1 text-sm text-green-700">
                お支払いありがとうございます。決済処理が完了しました。
              </p>
            </div>
            <button
              onClick={() => setShowPaymentSuccess(false)}
              className="ml-auto text-green-500 hover:text-green-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {showPaymentCancelled && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">決済がキャンセルされました</h3>
              <p className="mt-1 text-sm text-yellow-700">
                決済処理がキャンセルされました。再度お試しください。
              </p>
            </div>
            <button
              onClick={() => setShowPaymentCancelled(false)}
              className="ml-auto text-yellow-500 hover:text-yellow-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="border-b px-6 py-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-3xl font-bold text-gray-900">
                  請求書 #{invoice.invoiceNumber}
                </h1>
                <span
                  className={`px-3 py-1 text-sm font-semibold rounded-full ${
                    PAYMENT_STATUS_LABELS[invoice.paymentStatus]?.color ||
                    'bg-gray-100 text-gray-800'
                  }`}
                >
                  {PAYMENT_STATUS_LABELS[invoice.paymentStatus]?.label || invoice.paymentStatus}
                </span>
              </div>
              <p className="mt-2 text-gray-600">
                請求期間: {formatDate(invoice.billingPeriodStart)} 〜 {formatDate(invoice.billingPeriodEnd)}
              </p>
              {isOverdue() && (
                <p className="mt-1 text-red-600 font-medium">
                  ⚠️ 支払期限を過ぎています
                </p>
              )}
            </div>
            <Link
              href="/dashboard/manufacturer/invoices"
              className="text-gray-600 hover:text-gray-900"
            >
              ← 一覧に戻る
            </Link>
          </div>
        </div>

        <div className="px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Invoice Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Invoice Info */}
              <div className="border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">請求情報</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">発行日</p>
                    <p className="font-medium">{formatDate(invoice.issuedAt)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">支払期限</p>
                    <p className={`font-medium ${isOverdue() ? 'text-red-600' : ''}`}>
                      {formatDate(invoice.dueDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">支払日</p>
                    <p className="font-medium">{formatDate(invoice.paidAt)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">支払方法</p>
                    <p className="font-medium">
                      {invoice.paymentMethod === 'stripe' && 'クレジットカード'}
                      {invoice.paymentMethod === 'bank_transfer' && '銀行振込'}
                      {!invoice.paymentMethod && '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Invoice Items */}
              <div className="border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">明細</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          項目
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          数量
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          単価
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          金額
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {invoice.invoiceItems.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 text-sm">
                            <div className="font-medium text-gray-900">
                              {item.description}
                            </div>
                            {(item.campaign || item.facility) && (
                              <div className="text-xs text-gray-500 mt-1">
                                {item.campaign && `キャンペーン: ${item.campaign.name}`}
                                {item.facility && ` / 施設: ${item.facility.facilityName}`}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">
                            {formatCurrency(item.unitPrice, invoice.currency)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                            {formatCurrency(item.amount, invoice.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="mt-6 border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">小計</span>
                    <span className="font-medium">
                      {formatCurrency(invoice.subtotal, invoice.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">消費税 (10%)</span>
                    <span className="font-medium">
                      {formatCurrency(invoice.tax, invoice.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>合計</span>
                    <span className="text-blue-600">
                      {formatCurrency(invoice.total, invoice.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bank Transfer Proof (if uploaded) */}
              {invoice.paymentMethod === 'bank_transfer' && invoice.bankTransferProof && (
                <div className="border rounded-lg p-6">
                  <h2 className="text-lg font-semibold mb-4">振込証明</h2>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">振込日</p>
                      <p className="font-medium">{formatDate(invoice.bankTransferDate)}</p>
                    </div>
                    {invoice.bankTransferNote && (
                      <div>
                        <p className="text-sm text-gray-600">備考</p>
                        <p className="text-sm">{invoice.bankTransferNote}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-600 mb-2">証明書</p>
                      <img
                        src={invoice.bankTransferProof}
                        alt="振込証明"
                        className="max-w-full h-auto border rounded"
                      />
                    </div>
                    {invoice.verifiedAt && (
                      <div className="bg-green-50 border border-green-200 rounded p-3">
                        <p className="text-sm text-green-800">
                          ✓ 管理者により確認済み ({formatDateTime(invoice.verifiedAt)})
                        </p>
                      </div>
                    )}
                    {!invoice.verifiedAt && invoice.paymentStatus === 'processing' && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-3">
                        <p className="text-sm text-blue-800">
                          ℹ️ 管理者による確認待ちです
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Payment Actions */}
            <div className="space-y-6">
              {canPay() && !selectedPaymentMethod && (
                <div className="border rounded-lg p-6">
                  <h2 className="text-lg font-semibold mb-4">支払方法を選択</h2>
                  <PaymentMethodSelector
                    onSelect={(method) => setSelectedPaymentMethod(method)}
                  />
                </div>
              )}

              {canPay() && selectedPaymentMethod === 'stripe' && (
                <div className="border rounded-lg p-6">
                  <h2 className="text-lg font-semibold mb-4">クレジットカード決済</h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Stripeの安全な決済ページに移動します
                  </p>
                  <button
                    onClick={handleStripePayment}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    💳 Stripeで支払う
                  </button>
                  <button
                    onClick={() => setSelectedPaymentMethod(null)}
                    className="w-full mt-2 px-4 py-2 text-gray-600 hover:text-gray-900 text-sm"
                  >
                    戻る
                  </button>
                </div>
              )}

              {canPay() && selectedPaymentMethod === 'bank_transfer' && (
                <div className="space-y-6">
                  <BankTransferInfo />
                  <BankTransferUploadForm
                    invoiceId={invoice.id}
                    onUploadComplete={handleBankTransferUploadComplete}
                    onCancel={() => setSelectedPaymentMethod(null)}
                  />
                </div>
              )}

              {/* Payment Status Info */}
              {!canPay() && (
                <div className="border rounded-lg p-6">
                  <h2 className="text-lg font-semibold mb-4">支払状況</h2>
                  <div className="space-y-3">
                    {invoice.paymentStatus === 'completed' && (
                      <div className="bg-green-50 border border-green-200 rounded p-4">
                        <p className="text-sm font-medium text-green-800">
                          ✓ 支払済み
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          {formatDateTime(invoice.paidAt)}
                        </p>
                      </div>
                    )}
                    {invoice.paymentStatus === 'processing' && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-4">
                        <p className="text-sm font-medium text-blue-800">
                          ℹ️ 確認中
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          管理者による確認待ちです
                        </p>
                      </div>
                    )}
                    {invoice.paymentStatus === 'failed' && (
                      <div className="bg-red-50 border border-red-200 rounded p-4">
                        <p className="text-sm font-medium text-red-800">
                          ✕ 失敗
                        </p>
                        <p className="text-xs text-red-600 mt-1">
                          決済に失敗しました
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Quick Summary */}
              <div className="border rounded-lg p-6 bg-gray-50">
                <h3 className="font-semibold mb-3">支払概要</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">合計金額</span>
                    <span className="font-bold text-lg">
                      {formatCurrency(invoice.total, invoice.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">支払期限</span>
                    <span className={isOverdue() ? 'text-red-600 font-medium' : ''}>
                      {formatDate(invoice.dueDate)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
