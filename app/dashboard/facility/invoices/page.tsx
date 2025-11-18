'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';

interface InvoiceItem {
  id: string;
  itemType: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  campaign?: {
    name: string;
    manufacturer: {
      companyName: string;
    };
  };
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  subtotal: number;
  shippingFee: number;
  tax: number;
  total: number;
  status: string;
  issuedAt: string;
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
  items: InvoiceItem[];
}

export default function FacilityInvoicesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }
    const userData = JSON.parse(userStr);
    setUser(userData);
  }, [router]);

  useEffect(() => {
    if (user) {
      loadInvoices();
    }
  }, [user]);

  const loadInvoices = async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/facility/invoices', {
        headers: {
          'x-user-id': user.id,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices || []);
      }
    } catch (error) {
      console.error('Failed to load invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      draft: { label: '下書き', className: 'bg-gray-100 text-gray-800' },
      issued: { label: '発行済み', className: 'bg-blue-100 text-blue-800' },
      sent: { label: '送信済み', className: 'bg-purple-100 text-purple-800' },
      paid: { label: '支払済み', className: 'bg-green-100 text-green-800' },
      overdue: { label: '期限切れ', className: 'bg-red-100 text-red-800' },
      cancelled: { label: 'キャンセル', className: 'bg-gray-100 text-gray-800' },
    };

    const statusInfo = statusMap[status] || statusMap.draft;
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const handleDownloadPDF = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const response = await fetch(`/api/facility/invoices/${invoiceId}/pdf`, {
        headers: {
          'x-user-id': user.id,
        },
      });

      if (!response.ok) {
        throw new Error('PDF生成に失敗しました');
      }

      // Get the HTML content
      const htmlContent = await response.text();

      // Create a blob and open in new window for printing
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      // Open in new window
      const printWindow = window.open(url, '_blank');
      
      if (printWindow) {
        // Clean up the URL after window opens
        printWindow.addEventListener('load', () => {
          URL.revokeObjectURL(url);
        });
      } else {
        // Fallback: download as HTML file
        const link = document.createElement('a');
        link.href = url;
        link.download = `${invoiceNumber}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to download PDF:', error);
      alert('PDFのダウンロードに失敗しました');
    }
  };

  if (!user) {
    return <div className="p-8">Loading...</div>;
  }

  if (loading) {
    return (
      <DashboardLayout user={user}>
        <div className="p-8">
          <div className="text-center">読み込み中...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">請求書管理</h1>
          <p className="text-gray-600">月次請求書の確認と支払い状況を管理</p>
        </div>

        {/* Invoices List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {invoices.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              請求書がありません
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
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
                      支払期限
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ステータス
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      アクション
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(invoice.billingPeriodStart)} - {formatDate(invoice.billingPeriodEnd)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">{formatCurrency(invoice.total)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(invoice.dueDate)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(invoice.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => setSelectedInvoice(invoice)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
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

        {/* Invoice Detail Modal */}
        {selectedInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">{selectedInvoice.invoiceNumber}</h2>
                    <p className="text-blue-100 text-sm">請求書詳細</p>
                  </div>
                  <button
                    onClick={() => setSelectedInvoice(null)}
                    className="text-white hover:text-gray-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-6">
                {/* Invoice Info */}
                <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b">
                  <div>
                    <p className="text-sm text-gray-600">請求期間</p>
                    <p className="font-medium">
                      {formatDate(selectedInvoice.billingPeriodStart)} - {formatDate(selectedInvoice.billingPeriodEnd)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">支払期限</p>
                    <p className="font-medium">{formatDate(selectedInvoice.dueDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">発行日</p>
                    <p className="font-medium">{formatDate(selectedInvoice.issuedAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">ステータス</p>
                    <div className="mt-1">{getStatusBadge(selectedInvoice.status)}</div>
                  </div>
                </div>

                {/* Invoice Items */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">明細</h3>
                  <div className="space-y-2">
                    {selectedInvoice.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-start py-2 border-b">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.description}</p>
                          {item.campaign && (
                            <p className="text-sm text-gray-600">
                              {item.campaign.manufacturer.companyName}
                            </p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-medium">{formatCurrency(item.amount)}</p>
                          <p className="text-xs text-gray-600">
                            {item.quantity} × {formatCurrency(item.unitPrice)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-gray-700">
                    <span>小計</span>
                    <span>{formatCurrency(selectedInvoice.subtotal)}</span>
                  </div>
                  {selectedInvoice.shippingFee > 0 && (
                    <div className="flex justify-between text-gray-700">
                      <span>配送料</span>
                      <span>{formatCurrency(selectedInvoice.shippingFee)}</span>
                    </div>
                  )}
                  {selectedInvoice.tax > 0 && (
                    <div className="flex justify-between text-gray-700">
                      <span>消費税</span>
                      <span>{formatCurrency(selectedInvoice.tax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t-2">
                    <span>合計金額</span>
                    <span>{formatCurrency(selectedInvoice.total)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleDownloadPDF(selectedInvoice.id, selectedInvoice.invoiceNumber)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                  >
                    📄 PDFダウンロード
                  </button>
                  {selectedInvoice.status === 'issued' && (
                    <button
                      onClick={() => alert('支払い機能は近日実装予定です')}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                      💳 支払う
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
