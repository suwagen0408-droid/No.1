'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  const [user, setUser] = useState<any>(null);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
  });

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
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      // Load manufacturers
      const mfgRes = await fetch('/api/admin/manufacturers', {
        headers: { 'x-user-id': user.id },
      });
      if (mfgRes.ok) {
        const mfgData = await mfgRes.json();
        setManufacturers(mfgData.manufacturers || []);
      }

      // Load facilities
      const facRes = await fetch('/api/admin/facilities', {
        headers: { 'x-user-id': user.id },
      });
      if (facRes.ok) {
        const facData = await facRes.json();
        setFacilities(facData.facilities || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          ...formData,
          monthlyFee: formData.monthlyFee ? parseFloat(formData.monthlyFee) : null,
          setupFee: formData.setupFee ? parseFloat(formData.setupFee) : null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('契約を作成しました');
        router.push('/dashboard/contracts');
      } else {
        alert(data.error || '契約の作成に失敗しました');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('契約の作成に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return <div className="p-8">Loading...</div>;
  }

  if (user.role !== 'manufacturer' && user.role !== 'admin') {
    return (
      <DashboardLayout user={user}>
        <div className="p-8">
          <div className="text-center text-red-600">契約を作成する権限がありません</div>
        </div>
      </DashboardLayout>
    );
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
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">新規契約作成</h1>
          <p className="text-gray-600">施設とメーカー間の契約を作成します</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">基本情報</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Manufacturer */}
              {user.role === 'admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    メーカー <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.manufacturerId}
                    onChange={(e) => setFormData({ ...formData, manufacturerId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">選択してください</option>
                    {manufacturers.map((mfg) => (
                      <option key={mfg.id} value={mfg.id}>
                        {mfg.companyName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Facility */}
              <div className={user.role === 'admin' ? '' : 'md:col-span-2'}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  施設 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.facilityId}
                  onChange={(e) => setFormData({ ...formData, facilityId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">選択してください</option>
                  {facilities.map((fac) => (
                    <option key={fac.id} value={fac.id}>
                      {fac.facilityName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  契約名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: 2024年度 商品供給契約"
                  required
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  契約説明
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="契約の概要を記載してください"
                />
              </div>
            </div>
          </div>

          {/* Contract Period */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">契約期間</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  開始日 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  終了日 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.autoRenew}
                    onChange={(e) => setFormData({ ...formData, autoRenew: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">自動更新を有効にする</span>
                </label>
              </div>

              {formData.autoRenew && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    更新期間（ヶ月）
                  </label>
                  <input
                    type="number"
                    value={formData.renewalPeriod}
                    onChange={(e) => setFormData({ ...formData, renewalPeriod: parseInt(e.target.value) })}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Financial Terms */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">料金設定</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  月額料金（円）
                </label>
                <input
                  type="number"
                  value={formData.monthlyFee}
                  onChange={(e) => setFormData({ ...formData, monthlyFee: e.target.value })}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  初期費用（円）
                </label>
                <input
                  type="number"
                  value={formData.setupFee}
                  onChange={(e) => setFormData({ ...formData, setupFee: e.target.value })}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  支払い条件
                </label>
                <textarea
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: 月末締め翌月末払い"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  納品条件
                </label>
                <textarea
                  value={formData.deliveryTerms}
                  onChange={(e) => setFormData({ ...formData, deliveryTerms: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: 注文から7営業日以内に納品"
                />
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
            >
              {submitting ? '作成中...' : '契約を作成'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
