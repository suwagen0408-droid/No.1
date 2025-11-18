'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/app/components/DashboardLayout';

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
  invoiceItems: Array<{
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
  }>;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: '下書き', color: 'bg-gray-100 text-gray-800' },
  issued: { label: '発行済み', color: 'bg-blue-100 text-blue-800' },
};

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: '未払い', color: 'bg-yellow-100 text-yellow-800' },
  processing: { label: '確認中', color: 'bg-blue-100 text-blue-800' },
  completed: { label: '支払済み', color: 'bg-green-100 text-green-800' },
  failed: { label: '失敗', color: 'bg-red-100 text-red-800' },
  cancelled: { label: 'キャンセル', color: 'bg-gray-100 text-gray-800' },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  stripe: 'クレジットカード',
  bank_transfer: '銀行振込',
};

export default function ManufacturerInvoicesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

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
    loadInvoices();
  }, [router]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;

      const userData = JSON.parse(userStr);
      const response = await fetch('/api/manufacturer/invoices', {
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

  if (!user) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <DashboardLayout user={user}>
      <div className="bg-white rounded-lg shadow">
        <div className="border-b px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">請求書管理</h1>
              <p className="mt-2 text-gray-600">
                請求書の確認と支払い処理を行います
              </p>
            </div>
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
                  請求書がありません
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  請求書が発行されるとここに表示されます
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        請求書番号
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        請求期間
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        金額
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        支払状況
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        支払方法
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        期限
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {invoice.invoiceNumber}
                          </div>
                          <div className="text-xs text-gray-500">
                            発行日: {formatDate(invoice.issuedAt)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(invoice.billingPeriodStart)} 〜{' '}
                          {formatDate(invoice.billingPeriodEnd)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">
                            {formatCurrency(invoice.total, invoice.currency)}
                          </div>
                          <div className="text-xs text-gray-500">
                            (税込)
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              PAYMENT_STATUS_LABELS[invoice.paymentStatus]?.color ||
                              'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {PAYMENT_STATUS_LABELS[invoice.paymentStatus]?.label ||
                              invoice.paymentStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {invoice.paymentMethod
                            ? PAYMENT_METHOD_LABELS[invoice.paymentMethod] || invoice.paymentMethod
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDate(invoice.dueDate)}
                          </div>
                          {invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.paymentStatus === 'pending' && (
                            <div className="text-xs text-red-600 font-medium">
                              期限切れ
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            href={`/dashboard/manufacturer/invoices/${invoice.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            詳細
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
