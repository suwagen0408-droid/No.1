'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  terms: string | null;
  paymentTerms: string | null;
  deliveryTerms: string | null;
  documentUrl: string | null;
  monthlyFee: number | null;
  setupFee: number | null;
  currency: string;
  manufacturer: {
    id: string;
    companyName: string;
    address: string | null;
    phone: string | null;
  };
  facility: {
    id: string;
    facilityName: string;
    address: string | null;
    phone: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export default function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);

  useEffect(() => {
    params.then((p) => setResolvedParams(p));
  }, [params]);

  useEffect(() => {
    if (resolvedParams) {
      fetchContract();
    }
  }, [resolvedParams]);

  const fetchContract = async () => {
    if (!resolvedParams) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/contracts/${resolvedParams.id}`);
      if (response.ok) {
        const data = await response.json();
        setContract(data.contract);
      } else {
        alert('契約の取得に失敗しました');
        router.push('/dashboard/contracts');
      }
    } catch (error) {
      console.error('Failed to fetch contract:', error);
      alert('契約の取得に失敗しました');
      router.push('/dashboard/contracts');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: '下書き' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '承認待ち' },
      active: { bg: 'bg-green-100', text: 'text-green-800', label: '有効' },
      expired: { bg: 'bg-red-100', text: 'text-red-800', label: '期限切れ' },
      terminated: { bg: 'bg-gray-100', text: 'text-gray-600', label: '終了' },
    };

    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number | null, currency: string = 'JPY') => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  if (loading || !contract) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-sm text-gray-500">読み込み中...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard/contracts"
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{contract.title}</h1>
              <p className="mt-1 text-sm text-gray-500">契約番号: {contract.contractNumber}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {getStatusBadge(contract.status)}
            {contract.status === 'draft' && (
              <Link
                href={`/dashboard/contracts/${contract.id}/edit`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                編集
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Contract Information */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">契約情報</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">契約期間</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDate(contract.startDate)} 〜 {formatDate(contract.endDate)}
                  </dd>
                </div>
                {contract.autoRenew && (
                  <>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">自動更新</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        有効 ({contract.renewalPeriod || '-'}ヶ月毎)
                      </dd>
                    </div>
                    {contract.renewalDate && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">次回更新日</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {formatDate(contract.renewalDate)}
                        </dd>
                      </div>
                    )}
                  </>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">説明</dt>
                  <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                    {contract.description || '-'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Financial Information */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">料金情報</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">初期費用</dt>
                  <dd className="mt-1 text-lg font-semibold text-gray-900">
                    {formatCurrency(contract.setupFee, contract.currency)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">月額料金</dt>
                  <dd className="mt-1 text-lg font-semibold text-gray-900">
                    {formatCurrency(contract.monthlyFee, contract.currency)}
                  </dd>
                </div>
                {contract.paymentTerms && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">支払条件</dt>
                    <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                      {contract.paymentTerms}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Manufacturer Information */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">メーカー情報</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">会社名</dt>
                  <dd className="mt-1 text-sm text-gray-900">{contract.manufacturer.companyName}</dd>
                </div>
                {contract.manufacturer.address && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">住所</dt>
                    <dd className="mt-1 text-sm text-gray-900">{contract.manufacturer.address}</dd>
                  </div>
                )}
                {contract.manufacturer.phone && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">電話番号</dt>
                    <dd className="mt-1 text-sm text-gray-900">{contract.manufacturer.phone}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Facility Information */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">施設情報</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">施設名</dt>
                  <dd className="mt-1 text-sm text-gray-900">{contract.facility.facilityName}</dd>
                </div>
                {contract.facility.address && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">住所</dt>
                    <dd className="mt-1 text-sm text-gray-900">{contract.facility.address}</dd>
                  </div>
                )}
                {contract.facility.phone && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">電話番号</dt>
                    <dd className="mt-1 text-sm text-gray-900">{contract.facility.phone}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>

        {/* Terms and Conditions */}
        {(contract.terms || contract.deliveryTerms) && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">契約条件</h2>
            <div className="space-y-4">
              {contract.terms && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">契約条項</h3>
                  <div className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded">
                    {contract.terms}
                  </div>
                </div>
              )}
              {contract.deliveryTerms && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">納品条件</h3>
                  <div className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded">
                    {contract.deliveryTerms}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Document */}
        {contract.documentUrl && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">契約書類</h2>
            <a
              href={contract.documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="mr-2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              契約書をダウンロード
            </a>
          </div>
        )}

        {/* Metadata */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-xs text-gray-500 space-y-1">
            <p>作成日: {formatDate(contract.createdAt)}</p>
            <p>最終更新: {formatDate(contract.updatedAt)}</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
