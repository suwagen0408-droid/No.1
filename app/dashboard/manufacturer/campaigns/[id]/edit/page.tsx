'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/app/components/DashboardLayout';

interface Product {
  id: string;
  name: string;
  mainImageUrl?: string;
  category: string;
  retailPrice: number;
  status: string;
}

interface Campaign {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  totalUnits: number;
  maxUnitsPerFacility?: number;
  targetFacilityTypes: string[];
  targetFacilityTags: string[];
  minMonthlyGuests?: number;
  costModel: string;
  shippingCostCoveredBy: string;
  status: string;
  campaignProducts: Array<{
    product: {
      id: string;
    };
  }>;
}

const FACILITY_TYPES = [
  { value: 'hotel', label: 'ホテル' },
  { value: 'ryokan', label: '旅館' },
  { value: 'onsen', label: '温泉施設' },
  { value: 'cafe', label: 'カフェ' },
  { value: 'restaurant', label: 'レストラン' },
  { value: 'gym', label: 'ジム' },
  { value: 'salon', label: 'サロン' },
  { value: 'other', label: 'その他' },
];

const COST_MODELS = [
  { value: 'free', label: '無料提供' },
  { value: 'cost_price', label: '原価提供' },
  { value: 'discounted', label: '割引価格' },
];

const SHIPPING_OPTIONS = [
  { value: 'manufacturer', label: 'メーカー負担' },
  { value: 'facility', label: '施設負担' },
  { value: 'split', label: '折半' },
];

export default function EditCampaignPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    totalUnits: 0,
    maxUnitsPerFacility: 10,
    targetFacilityTypes: [] as string[],
    targetFacilityTags: [] as string[],
    minMonthlyGuests: 0,
    costModel: 'free' as 'free' | 'cost_price' | 'discounted',
    shippingCostCoveredBy: 'manufacturer' as 'manufacturer' | 'facility' | 'split',
    productIds: [] as string[],
  });

  const [tagInput, setTagInput] = useState('');

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
    loadData(userData.id);
  }, [router, campaignId]);

  const loadData = async (userId: string) => {
    setLoading(true);
    try {
      // Load campaign and products in parallel
      const [campaignRes, productsRes] = await Promise.all([
        fetch(`/api/manufacturer/campaigns/${campaignId}`, {
          headers: { 'x-user-id': userId },
        }),
        fetch('/api/manufacturer/products', {
          headers: { 'x-user-id': userId },
        }),
      ]);

      if (!campaignRes.ok) {
        setError('キャンペーンの読み込みに失敗しました');
        setLoading(false);
        return;
      }

      const campaignData = await campaignRes.json();
      const campaignInfo = campaignData.campaign;
      setCampaign(campaignInfo);

      // Check if campaign can be edited
      if (
        campaignInfo.status !== 'draft' &&
        campaignInfo.status !== 'rejected' &&
        campaignInfo.status !== 'pending'
      ) {
        setError(
          'このキャンペーンは編集できません。下書き、却下済み、または承認待ちのキャンペーンのみ編集可能です。'
        );
      }

      // Set form data from campaign
      setFormData({
        name: campaignInfo.name,
        description: campaignInfo.description || '',
        startDate: campaignInfo.startDate.split('T')[0],
        endDate: campaignInfo.endDate.split('T')[0],
        totalUnits: campaignInfo.totalUnits,
        maxUnitsPerFacility: campaignInfo.maxUnitsPerFacility || 10,
        targetFacilityTypes: campaignInfo.targetFacilityTypes || [],
        targetFacilityTags: campaignInfo.targetFacilityTags || [],
        minMonthlyGuests: campaignInfo.minMonthlyGuests || 0,
        costModel: campaignInfo.costModel,
        shippingCostCoveredBy: campaignInfo.shippingCostCoveredBy,
        productIds: campaignInfo.campaignProducts.map((cp: any) => cp.product.id),
      });

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        // Only show approved products
        setProducts(
          productsData.products.filter((p: Product) => p.status === 'approved')
        );
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (!user) return;

      // Validation
      if (!formData.name.trim()) {
        setError('キャンペーン名を入力してください');
        setSubmitting(false);
        return;
      }

      if (!formData.startDate || !formData.endDate) {
        setError('開始日と終了日を入力してください');
        setSubmitting(false);
        return;
      }

      if (new Date(formData.endDate) <= new Date(formData.startDate)) {
        setError('終了日は開始日より後にしてください');
        setSubmitting(false);
        return;
      }

      if (formData.totalUnits <= 0) {
        setError('総数量は1以上にしてください');
        setSubmitting(false);
        return;
      }

      if (formData.productIds.length === 0) {
        setError('最低1つの商品を選択してください');
        setSubmitting(false);
        return;
      }

      const response = await fetch(`/api/manufacturer/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'キャンペーンの更新に失敗しました');
        setSubmitting(false);
        return;
      }

      alert('キャンペーンを更新しました');
      router.push(`/dashboard/manufacturer/campaigns`);
    } catch (error) {
      console.error('Error updating campaign:', error);
      setError('キャンペーンの更新に失敗しました');
      setSubmitting(false);
    }
  };

  const toggleFacilityType = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      targetFacilityTypes: prev.targetFacilityTypes.includes(type)
        ? prev.targetFacilityTypes.filter((t) => t !== type)
        : [...prev.targetFacilityTypes, type],
    }));
  };

  const toggleProduct = (productId: string) => {
    setFormData((prev) => ({
      ...prev,
      productIds: prev.productIds.includes(productId)
        ? prev.productIds.filter((id) => id !== productId)
        : [...prev.productIds, productId],
    }));
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.targetFacilityTags.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        targetFacilityTags: [...prev.targetFacilityTags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      targetFacilityTags: prev.targetFacilityTags.filter((t) => t !== tag),
    }));
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
              <Link
                href="/dashboard/manufacturer/campaigns"
                className="text-blue-600 hover:underline text-sm mb-2 inline-block"
              >
                ← キャンペーン一覧に戻る
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">キャンペーン編集</h1>
              <p className="mt-2 text-gray-600">
                キャンペーンの内容を編集します
              </p>
              {campaign && (
                <p className="mt-1 text-sm text-gray-500">
                  ステータス: {campaign.status}
                </p>
              )}
            </div>
            <Link
              href={`/dashboard/manufacturer/campaigns/${campaignId}`}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              キャンセル
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">データを読み込んでいます...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Basic Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    キャンペーン名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="例：春の新商品体験キャンペーン"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    キャンペーン説明
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="キャンペーンの詳細を記載してください"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      開始日 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) =>
                        setFormData({ ...formData, startDate: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      終了日 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) =>
                        setFormData({ ...formData, endDate: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Product Selection */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                商品選択 <span className="text-red-500">*</span>
              </h2>
              {products.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-600">承認済みの商品がありません</p>
                  <Link
                    href="/dashboard/products"
                    className="mt-4 inline-block text-blue-600 hover:underline"
                  >
                    商品を登録する →
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => toggleProduct(product.id)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.productIds.includes(product.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        {product.mainImageUrl && (
                          <img
                            src={product.mainImageUrl}
                            alt={product.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{product.name}</h3>
                          <p className="text-sm text-gray-500 mt-1">{product.category}</p>
                          <p className="text-sm text-gray-700 mt-1 font-medium">
                            ¥{product.retailPrice.toLocaleString()}
                          </p>
                        </div>
                        {formData.productIds.includes(product.id) && (
                          <svg
                            className="w-6 h-6 text-blue-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Units Configuration */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">数量設定</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    総数量 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.totalUnits}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        totalUnits: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    施設あたり最大数
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxUnitsPerFacility}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxUnitsPerFacility: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Target Facilities */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">ターゲット施設</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    施設タイプ（複数選択可）
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {FACILITY_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => toggleFacilityType(type.value)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg border ${
                          formData.targetFacilityTypes.includes(type.value)
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    未選択の場合、すべての施設タイプが対象になります
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    施設タグ（キーワード）
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                      placeholder="タグを入力してEnter"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      追加
                    </button>
                  </div>
                  {formData.targetFacilityTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.targetFacilityTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-2 text-blue-500 hover:text-blue-700"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    最低月間来客数
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minMonthlyGuests}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        minMonthlyGuests: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0 = 制限なし"
                  />
                </div>
              </div>
            </div>

            {/* Cost Model */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">コストモデル</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    商品提供モデル
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {COST_MODELS.map((model) => (
                      <button
                        key={model.value}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, costModel: model.value as any })
                        }
                        className={`px-4 py-3 text-sm font-medium rounded-lg border ${
                          formData.costModel === model.value
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {model.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    配送費負担
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {SHIPPING_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            shippingCostCoveredBy: option.value as any,
                          })
                        }
                        className={`px-4 py-3 text-sm font-medium rounded-lg border ${
                          formData.shippingCostCoveredBy === option.value
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Link
                href={`/dashboard/manufacturer/campaigns/${campaignId}`}
                className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                キャンセル
              </Link>
              <button
                type="submit"
                disabled={submitting || !!error}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? '更新中...' : 'キャンペーンを更新'}
              </button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
