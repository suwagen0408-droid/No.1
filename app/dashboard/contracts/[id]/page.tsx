'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';

interface Contract {
  id: string;
  contractNumber: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  renewalDate: string | null;
  autoRenew: boolean;
  renewalPeriod: number | null;
  status: string;
  monthlyFee: number | null;
  setupFee: number | null;
  currency: string;
  paymentTerms: string | null;
  deliveryTerms: string | null;
  documentUrl: string | null;
  signedAt: string | null;
  manufacturerSignedAt: string | null;
  facilitySignedAt: string | null;
  terminatedAt: string | null;
  terminatedBy: string | null;
  terminationReason: string | null;
  createdAt: string;
  manufacturer: {
    companyName: string;
  };
  facility: {
    facilityName: string;
  };
}

export default function ContractDetailPage() {
  const router = useRouter();
  const params = useParams();
  const contractId = params.id as string;
  
  const [user, setUser] = useState<any>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);

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
    if (user && contractId) {
      loadContract();
    }
  }, [user, contractId]);

  const loadContract = async () => {
    if (!user || !contractId) return;
    
    try {
      const response = await fetch(`/api/contracts/${contractId}`, {
        headers: {
          'x-user-id': user.id,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setContract(data.contract);
      } else {
        alert('契約が見つかりません');
        router.push('/dashboard/contracts');
      }
    } catch (error) {
      console.error('Failed to load contract:', error);
      alert('契約の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      draft: { label: '下書き', className: 'bg-gray-100 text-gray-800' },
      active: { label: '有効', className: 'bg-green-100 text-green-800' },
      expired: { label: '期限切れ', className: 'bg-red-100 text-red-800' },
      terminated: { label: '終了', className: 'bg-gray-100 text-gray-800' },
      renewed: { label: '更新済み', className: 'bg-blue-100 text-blue-800' },
    };

    const statusInfo = statusMap[status] || statusMap.draft;
    return (
      <span className={`px-3 py-1 text-sm font-semibold rounded ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-';
    return `¥${amount.toLocaleString()}`;
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

  if (!contract) {
    return (
      <DashboardLayout user={user}>
        <div className="p-8">
          <div className="text-center text-red-600">契約が見つかりません</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              戻る
            </button>
            {getStatusBadge(contract.status)}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{contract.title}</h1>
          <p className="text-gray-600">契約番号: {contract.contractNumber}</p>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">基本情報</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600">メーカー</p>
                <p className="font-medium text-gray-900">{contract.manufacturer.companyName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">施設</p>
                <p className="font-medium text-gray-900">{contract.facility.facilityName}</p>
              </div>
              {contract.description && (
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600 mb-2">契約説明</p>
                  <p className="text-gray-900">{contract.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Contract Period */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">契約期間</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600">開始日</p>
                <p className="font-medium text-gray-900">{formatDate(contract.startDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">終了日</p>
                <p className="font-medium text-gray-900">{formatDate(contract.endDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">自動更新</p>
                <p className="font-medium text-gray-900">
                  {contract.autoRenew ? (
                    <span className="text-green-600">✓ 有効（{contract.renewalPeriod}ヶ月毎）</span>
                  ) : (
                    <span className="text-gray-500">無効</span>
                  )}
                </p>
              </div>
              {contract.renewalDate && (
                <div>
                  <p className="text-sm text-gray-600">次回更新日</p>
                  <p className="font-medium text-gray-900">{formatDate(contract.renewalDate)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Financial Terms */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">料金設定</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600">月額料金</p>
                <p className="font-medium text-gray-900 text-lg">{formatCurrency(contract.monthlyFee)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">初期費用</p>
                <p className="font-medium text-gray-900 text-lg">{formatCurrency(contract.setupFee)}</p>
              </div>
              {contract.paymentTerms && (
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600 mb-2">支払い条件</p>
                  <p className="text-gray-900">{contract.paymentTerms}</p>
                </div>
              )}
              {contract.deliveryTerms && (
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600 mb-2">納品条件</p>
                  <p className="text-gray-900">{contract.deliveryTerms}</p>
                </div>
              )}
            </div>
          </div>

          {/* Signing Status */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">署名状況</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600">メーカー署名日</p>
                <p className="font-medium text-gray-900">
                  {contract.manufacturerSignedAt ? (
                    <span className="text-green-600">✓ {formatDate(contract.manufacturerSignedAt)}</span>
                  ) : (
                    <span className="text-gray-500">未署名</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">施設署名日</p>
                <p className="font-medium text-gray-900">
                  {contract.facilitySignedAt ? (
                    <span className="text-green-600">✓ {formatDate(contract.facilitySignedAt)}</span>
                  ) : (
                    <span className="text-gray-500">未署名</span>
                  )}
                </p>
              </div>
              {contract.signedAt && (
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600">契約締結日</p>
                  <p className="font-medium text-green-600">✓ {formatDate(contract.signedAt)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Termination Info */}
          {contract.status === 'terminated' && contract.terminatedAt && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-xl font-bold text-red-900 mb-4">終了情報</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-red-700">終了日</p>
                  <p className="font-medium text-red-900">{formatDate(contract.terminatedAt)}</p>
                </div>
                {contract.terminationReason && (
                  <div>
                    <p className="text-sm text-red-700 mb-2">終了理由</p>
                    <p className="text-red-900">{contract.terminationReason}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Document */}
          {contract.documentUrl && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">契約書類</h2>
              <a
                href={contract.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                契約書をダウンロード
              </a>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 justify-end">
            <button
              onClick={() => router.push('/dashboard/contracts')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              一覧に戻る
            </button>
            {contract.status === 'draft' && (user.role === 'manufacturer' || user.role === 'admin') && (
              <button
                onClick={() => alert('編集機能は近日実装予定です')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                編集
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
