'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';

interface Payment {
  id: string;
  amount: number;
  shippingFee: number;
  totalAmount: number;
  currency: string;
  paymentStatus: string;
  createdAt: string;
  facilityCampaign: {
    id: string;
    requestedUnits: number;
    approvedUnits: number;
    campaign: {
      id: string;
      name: string;
      description?: string;
      unitPrice?: number;
      manufacturer: {
        companyName: string;
      };
    };
  };
}

export default function FacilityPaymentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

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
    loadPayments(userData);
  }, [router]);

  const loadPayments = async (userData: any) => {
    setLoading(true);
    try {
      const response = await fetch('/api/facility/payments', {
        headers: {
          'x-user-id': userData.id,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPayments(data.payments || []);
      } else {
        console.error('Failed to load payments');
      }
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (paymentId: string) => {
    if (!user) return;

    if (!confirm('支払いを実行しますか？\n（現在はテストモードです。実際の支払いは行われません）')) {
      return;
    }

    setProcessing(paymentId);
    try {
      const response = await fetch('/api/facility/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          paymentId,
          paymentMethod: 'mock',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('支払いが完了しました！');
        loadPayments(user);
      } else {
        alert(data.error || '支払い処理に失敗しました');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('支払い処理中にエラーが発生しました');
    } finally {
      setProcessing(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!user) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <DashboardLayout user={user}>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">💳 支払い管理</h1>
          <p className="text-gray-600">
            承認されたキャンペーンの支払いを管理します
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : payments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg
                className="mx-auto h-16 w-16"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              支払い待ちのキャンペーンはありません
            </h3>
            <p className="text-gray-600">
              有料キャンペーンが承認されると、ここに表示されます。
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="bg-white rounded-lg shadow-md overflow-hidden"
              >
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-white bg-opacity-20 rounded-lg p-2">
                        <svg
                          className="w-6 h-6 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">
                          {payment.facilityCampaign.campaign.name}
                        </h2>
                        <p className="text-blue-100 text-sm">
                          {payment.facilityCampaign.campaign.manufacturer.companyName}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-white">
                        {formatCurrency(payment.totalAmount)}
                      </div>
                      <div className="text-blue-100 text-sm">
                        税込合計金額
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">
                        📦 商品代金
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">単価</span>
                          <span className="font-medium">
                            {formatCurrency(payment.facilityCampaign.campaign.unitPrice || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">数量</span>
                          <span className="font-medium">
                            {payment.facilityCampaign.approvedUnits || 0} ユニット
                          </span>
                        </div>
                        <div className="flex justify-between text-sm pt-2 border-t">
                          <span className="text-gray-700 font-medium">小計</span>
                          <span className="font-semibold">
                            {formatCurrency(payment.amount)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">
                        🚚 配送料
                      </h3>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">配送費用</span>
                        <span className="font-medium">
                          {formatCurrency(payment.shippingFee)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {payment.facilityCampaign.campaign.description && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">
                        キャンペーン詳細
                      </h3>
                      <p className="text-sm text-gray-600">
                        {payment.facilityCampaign.campaign.description}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-6 border-t">
                    <div className="text-sm text-gray-500">
                      承認日: {formatDate(payment.createdAt)}
                    </div>
                    <button
                      onClick={() => handlePayment(payment.id)}
                      disabled={processing === payment.id}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                    >
                      {processing === payment.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          処理中...
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                            />
                          </svg>
                          支払いを実行
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-900 mb-1">
                テストモードについて
              </h3>
              <p className="text-sm text-blue-700">
                現在はテストモードです。「支払いを実行」ボタンをクリックすると、実際の決済は行われずにキャンペーンが承認状態になります。
                Phase 2でStripe決済が統合される予定です。
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
