'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/app/components/DashboardLayout';
import PaymentVerificationModal from '@/app/components/PaymentVerificationModal';

interface Invoice {
  id: string;
  invoiceNumber: string;
  total: number;
  currency: string;
  paymentStatus: string;
  paymentMethod?: string;
  bankTransferProof?: string;
  bankTransferDate?: string;
  bankTransferNote?: string;
  createdAt: string;
  manufacturer: {
    companyName: string;
    email: string;
  };
}

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: '未払い', color: 'bg-yellow-100 text-yellow-800' },
  processing: { label: '確認中', color: 'bg-blue-100 text-blue-800' },
  completed: { label: '支払済み', color: 'bg-green-100 text-green-800' },
  failed: { label: '失敗', color: 'bg-red-100 text-red-800' },
  cancelled: { label: 'キャンセル', color: 'bg-gray-100 text-gray-800' },
};

export default function AdminPaymentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('processing');

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }

    const userData = JSON.parse(userStr);
    if (userData.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    setUser(userData);
    loadInvoices();
  }, [router, filterStatus]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;

      const userData = JSON.parse(userStr);
      
      let url = '/api/admin/payments';
      if (filterStatus) {
        url += `?status=${filterStatus}`;
      }

      const response = await fetch(url, {
        headers: { 'x-user-id': userData.id },
      });

      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices);
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const openVerificationModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowVerificationModal(true);
  };

  const handleVerificationComplete = () => {
    setShowVerificationModal(false);
    setSelectedInvoice(null);
    loadInvoices();
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

  const pendingCount = invoices.filter(inv => inv.paymentStatus === 'processing').length;

  if (!user) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <DashboardLayout user={user}>
      <div className="bg-white rounded-lg shadow">
        <div className="border-b px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">支払い管理</h1>
              <p className="mt-2 text-gray-600">
                振込証明の確認と支払いステータスの管理
              </p>
              {pendingCount > 0 && (
                <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  🔔 {pendingCount}件の確認待ち
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="border-b px-6 py-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 font-medium">絞り込み:</span>
            <button
              onClick={() => setFilterStatus('')}
              className={`px-3 py-1 text-sm rounded-lg ${
                filterStatus === ''
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              すべて
            </button>
            <button
              onClick={() => setFilterStatus('processing')}
              className={`px-3 py-1 text-sm rounded-lg ${
                filterStatus === 'processing'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              確認待ち
            </button>
            <button
              onClick={() => setFilterStatus('completed')}
              className={`px-3 py-1 text-sm rounded-lg ${
                filterStatus === 'completed'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              完了
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-3 py-1 text-sm rounded-lg ${
                filterStatus === 'pending'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              未払い
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
            {invoices.length === 0 ? (
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  該当する請求書がありません
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {filterStatus === 'processing' && '確認待ちの支払いはありません'}
                  {filterStatus === 'completed' && '完了した支払いはありません'}
                  {filterStatus === 'pending' && '未払いの請求書はありません'}
                  {filterStatus === '' && '請求書が見つかりません'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="border rounded-lg p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            請求書 #{invoice.invoiceNumber}
                          </h3>
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              PAYMENT_STATUS_LABELS[invoice.paymentStatus]?.color ||
                              'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {PAYMENT_STATUS_LABELS[invoice.paymentStatus]?.label ||
                              invoice.paymentStatus}
                          </span>
                        </div>

                        <div className="space-y-1 text-sm text-gray-600">
                          <p>
                            <span className="font-medium">メーカー:</span>{' '}
                            {invoice.manufacturer.companyName}
                          </p>
                          <p>
                            <span className="font-medium">金額:</span>{' '}
                            <span className="text-lg font-bold text-gray-900">
                              {formatCurrency(invoice.total, invoice.currency)}
                            </span>
                          </p>
                          {invoice.paymentMethod && (
                            <p>
                              <span className="font-medium">支払方法:</span>{' '}
                              {invoice.paymentMethod === 'stripe' && 'クレジットカード'}
                              {invoice.paymentMethod === 'bank_transfer' && '銀行振込'}
                            </p>
                          )}
                          {invoice.bankTransferDate && (
                            <p>
                              <span className="font-medium">振込日:</span>{' '}
                              {formatDate(invoice.bankTransferDate)}
                            </p>
                          )}
                          {invoice.bankTransferNote && (
                            <p>
                              <span className="font-medium">備考:</span>{' '}
                              {invoice.bankTransferNote}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="ml-6 flex flex-col items-end space-y-2">
                        {invoice.paymentStatus === 'processing' &&
                          invoice.paymentMethod === 'bank_transfer' &&
                          invoice.bankTransferProof && (
                            <button
                              onClick={() => openVerificationModal(invoice)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                            >
                              🔍 証明書を確認
                            </button>
                          )}
                        {invoice.bankTransferProof && (
                          <a
                            href={invoice.bankTransferProof}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            📎 証明書を表示
                          </a>
                        )}
                      </div>
                    </div>

                    {invoice.paymentStatus === 'processing' && (
                      <div className="mt-4 pt-4 border-t bg-blue-50 -mx-6 -mb-6 px-6 py-3 rounded-b-lg">
                        <p className="text-sm text-blue-800">
                          ⏰ この支払いは管理者の確認待ちです
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Verification Modal */}
      {showVerificationModal && selectedInvoice && (
        <PaymentVerificationModal
          invoice={selectedInvoice}
          onComplete={handleVerificationComplete}
          onCancel={() => {
            setShowVerificationModal(false);
            setSelectedInvoice(null);
          }}
        />
      )}
    </DashboardLayout>
  );
}
