'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';
import Link from 'next/link';

interface InvoiceItem {
  id: string;
  itemType: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  campaign?: { name: string };
  facility?: { facilityName: string };
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  issuedAt?: string;
  dueDate?: string;
  paidAt?: string;
  createdAt: string;
  invoiceItems: InvoiceItem[];
}

interface User {
  id: string;
  email: string;
  role: 'manufacturer' | 'facility' | 'admin';
  profile?: any;
}

export default function InvoicesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    
    if (parsedUser.role !== 'manufacturer') {
      router.push('/dashboard');
      return;
    }

    setUser(parsedUser);
    loadInvoices(parsedUser.id);
  }, [router]);

  const loadInvoices = async (userId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/manufacturer/invoices', {
        headers: { 'x-user-id': userId },
      });

      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices);
      }
    } catch (error) {
      console.error('請求書読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (invoiceId: string, newStatus: string) => {
    if (!user) return;

    if (!confirm(`ステータスを「${getStatusLabel(newStatus)}」に変更しますか？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/manufacturer/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        alert('ステータスを更新しました');
        loadInvoices(user.id);
        setShowDetail(false);
      } else {
        const data = await response.json();
        alert(data.error || 'エラーが発生しました');
      }
    } catch (error) {
      alert('更新に失敗しました');
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!user) return;

    if (!confirm('この請求書を削除しますか？')) {
      return;
    }

    try {
      const response = await fetch(`/api/manufacturer/invoices/${invoiceId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user.id },
      });

      if (response.ok) {
        alert('請求書を削除しました');
        loadInvoices(user.id);
        setShowDetail(false);
      } else {
        const data = await response.json();
        alert(data.error || 'エラーが発生しました');
      }
    } catch (error) {
      alert('削除に失敗しました');
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      draft: '下書き',
      issued: '発行済み',
      paid: '支払済み',
      cancelled: 'キャンセル',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      draft: 'bg-gray-100 text-gray-800',
      issued: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">読み込み中...</div>;
  }

  return (
    <DashboardLayout user={user}>
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="border-b px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">請求書管理</h1>
              <p className="mt-1 text-sm text-gray-600">
                キャンペーンや商品の請求書を管理します
              </p>
            </div>
          </div>
        </div>

        {/* Invoice List */}
        <div className="px-6 py-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500">読み込み中...</div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📄</div>
              <p className="text-gray-500">請求書がありません</p>
              <p className="text-sm text-gray-400 mt-2">
                ※ 請求書機能は準備中です
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      請求書番号
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      請求期間
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      金額
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      ステータス
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      発行日
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {formatDate(invoice.billingPeriodStart)} 〜 {formatDate(invoice.billingPeriodEnd)}
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                        {formatCurrency(invoice.total)}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                          {getStatusLabel(invoice.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {invoice.issuedAt ? formatDate(invoice.issuedAt) : '-'}
                      </td>
                      <td className="px-4 py-4 text-right text-sm">
                        <button
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setShowDetail(true);
                          }}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          詳細
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Detail Modal */}
      {showDetail && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b px-6 py-4 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-bold">請求書詳細</h2>
              <button
                onClick={() => setShowDetail(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-6">
              {/* Invoice Info */}
              <div className="mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">請求書番号</p>
                    <p className="font-semibold">{selectedInvoice.invoiceNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">ステータス</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedInvoice.status)}`}>
                      {getStatusLabel(selectedInvoice.status)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">請求期間</p>
                    <p className="font-medium">
                      {formatDate(selectedInvoice.billingPeriodStart)} 〜 {formatDate(selectedInvoice.billingPeriodEnd)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">発行日</p>
                    <p className="font-medium">
                      {selectedInvoice.issuedAt ? formatDate(selectedInvoice.issuedAt) : '未発行'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Invoice Items */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">請求明細</h3>
                <table className="w-full border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-sm">品目</th>
                      <th className="px-3 py-2 text-right text-sm">数量</th>
                      <th className="px-3 py-2 text-right text-sm">単価</th>
                      <th className="px-3 py-2 text-right text-sm">金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.invoiceItems.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-3 py-2 text-sm">{item.description}</td>
                        <td className="px-3 py-2 text-sm text-right">{item.quantity}</td>
                        <td className="px-3 py-2 text-sm text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-3 py-2 text-sm text-right font-medium">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2">
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-sm text-right font-medium">小計</td>
                      <td className="px-3 py-2 text-sm text-right font-medium">{formatCurrency(selectedInvoice.subtotal)}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-sm text-right font-medium">消費税 (10%)</td>
                      <td className="px-3 py-2 text-sm text-right font-medium">{formatCurrency(selectedInvoice.tax)}</td>
                    </tr>
                    <tr className="font-bold">
                      <td colSpan={3} className="px-3 py-2 text-sm text-right">合計</td>
                      <td className="px-3 py-2 text-sm text-right">{formatCurrency(selectedInvoice.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center border-t pt-4">
                <div>
                  {selectedInvoice.status === 'draft' && (
                    <button
                      onClick={() => handleDeleteInvoice(selectedInvoice.id)}
                      className="text-red-600 hover:text-red-700 font-medium text-sm"
                    >
                      削除
                    </button>
                  )}
                </div>
                <div className="flex space-x-2">
                  {selectedInvoice.status === 'draft' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedInvoice.id, 'issued')}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                    >
                      発行する
                    </button>
                  )}
                  {selectedInvoice.status === 'issued' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedInvoice.id, 'paid')}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
                    >
                      支払済みにする
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
