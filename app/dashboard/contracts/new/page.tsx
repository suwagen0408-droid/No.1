'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/app/components/DashboardLayout';

interface Manufacturer {
  id: string;
  companyName: string;
}

interface Facility {
  id: string;
  facilityName: string;
}

export default function NewContractPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [userRole, setUserRole] = useState<string>('');

  const [formData, setFormData] = useState({
    manufacturerId: '',
    facilityId: '',
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    autoRenew: false,
    renewalPeriod: 12,
    monthlyFee: '',
    setupFee: '',
    paymentTerms: '',
    deliveryTerms: '',
    terms: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch manufacturers
      const manuResponse = await fetch('/api/manufacturers');
      if (manuResponse.ok) {
        const manuData = await manuResponse.json();
        setManufacturers(manuData.manufacturers || []);
        setUserRole(manuData.userRole || '');
      }

      // Fetch facilities
      const facilityResponse = await fetch('/api/facilities');
      if (facilityResponse.ok) {
        const facilityData = await facilityResponse.json();
        setFacilities(facilityData.facilities || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.manufacturerId || !formData.facilityId) {
      alert('メーカーと施設を選択してください');
      return;
    }

    if (!formData.title || !formData.startDate || !formData.endDate) {
      alert('必須項目を入力してください');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          manufacturerId: formData.manufacturerId,
          facilityId: formData.facilityId,
          title: formData.title,
          description: formData.description || null,
          startDate: new Date(formData.startDate).toISOString(),
          endDate: new Date(formData.endDate).toISOString(),
          autoRenew: formData.autoRenew,
          renewalPeriod: formData.autoRenew ? parseInt(formData.renewalPeriod.toString()) : null,
          monthlyFee: formData.monthlyFee ? parseFloat(formData.monthlyFee) : null,
          setupFee: formData.setupFee ? parseFloat(formData.setupFee) : null,
          paymentTerms: formData.paymentTerms || null,
          deliveryTerms: formData.deliveryTerms || null,
          terms: formData.terms || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert('契約を作成しました');
        router.push(`/dashboard/contracts/${data.contract.id}`);
      } else {
        const data = await response.json();
        alert(data.message || '契約の作成に失敗しました');
      }
    } catch (error) {
      console.error('Failed to create contract:', error);
      alert('契約の作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
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
            <h1 className="text-2xl font-bold text-gray-900">新規契約作成</h1>
            <p className="mt-1 text-sm text-gray-500">
              メーカーと施設間の契約を作成します
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6 space-y-6">
            {/* Basic Information */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">基本情報</h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                    契約タイトル <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="title"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="manufacturerId" className="block text-sm font-medium text-gray-700">
                    メーカー <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="manufacturerId"
                    required
                    value={formData.manufacturerId}
                    onChange={(e) => setFormData({ ...formData, manufacturerId: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">選択してください</option>
                    {manufacturers.map((manufacturer) => (
                      <option key={manufacturer.id} value={manufacturer.id}>
                        {manufacturer.companyName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="facilityId" className="block text-sm font-medium text-gray-700">
                    施設 <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="facilityId"
                    required
                    value={formData.facilityId}
                    onChange={(e) => setFormData({ ...formData, facilityId: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">選択してください</option>
                    {facilities.map((facility) => (
                      <option key={facility.id} value={facility.id}>
                        {facility.facilityName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    説明
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Contract Period */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">契約期間</h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                    開始日 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                    終了日 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-center">
                    <input
                      id="autoRenew"
                      type="checkbox"
                      checked={formData.autoRenew}
                      onChange={(e) => setFormData({ ...formData, autoRenew: e.target.checked })}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="autoRenew" className="ml-2 block text-sm text-gray-700">
                      自動更新を有効にする
                    </label>
                  </div>
                </div>

                {formData.autoRenew && (
                  <div>
                    <label htmlFor="renewalPeriod" className="block text-sm font-medium text-gray-700">
                      更新期間（月数）
                    </label>
                    <input
                      type="number"
                      id="renewalPeriod"
                      min="1"
                      value={formData.renewalPeriod}
                      onChange={(e) => setFormData({ ...formData, renewalPeriod: parseInt(e.target.value) })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Financial Information */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">料金情報</h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="setupFee" className="block text-sm font-medium text-gray-700">
                    初期費用（円）
                  </label>
                  <input
                    type="number"
                    id="setupFee"
                    min="0"
                    step="1"
                    value={formData.setupFee}
                    onChange={(e) => setFormData({ ...formData, setupFee: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="monthlyFee" className="block text-sm font-medium text-gray-700">
                    月額料金（円）
                  </label>
                  <input
                    type="number"
                    id="monthlyFee"
                    min="0"
                    step="1"
                    value={formData.monthlyFee}
                    onChange={(e) => setFormData({ ...formData, monthlyFee: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="paymentTerms" className="block text-sm font-medium text-gray-700">
                    支払条件
                  </label>
                  <textarea
                    id="paymentTerms"
                    rows={3}
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="例: 月末締め翌月末払い"
                  />
                </div>
              </div>
            </div>

            {/* Terms */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">契約条件</h2>
              <div className="space-y-6">
                <div>
                  <label htmlFor="deliveryTerms" className="block text-sm font-medium text-gray-700">
                    納品条件
                  </label>
                  <textarea
                    id="deliveryTerms"
                    rows={3}
                    value={formData.deliveryTerms}
                    onChange={(e) => setFormData({ ...formData, deliveryTerms: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="terms" className="block text-sm font-medium text-gray-700">
                    契約条項
                  </label>
                  <textarea
                    id="terms"
                    rows={6}
                    value={formData.terms}
                    onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Link
              href="/dashboard/contracts"
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              キャンセル
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? '作成中...' : '作成'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
