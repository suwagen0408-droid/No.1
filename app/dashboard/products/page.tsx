'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';

interface Product {
  id: string;
  name: string;
  nameEn?: string;
  category: string;
  status: string;
  costPrice: number;
  retailPrice: number;
  ecUrl: string;
  mainImageUrl?: string;
  createdAt: string;
  approvedAt?: string;
  rejectionReason?: string;
  _count?: {
    campaignProducts: number;
    qrScanEvents: number;
    purchaseEvents: number;
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  shampoo: 'シャンプー',
  conditioner: 'コンディショナー',
  body_soap: 'ボディソープ',
  face_wash: '洗顔料',
  lotion: '化粧水',
  cream: 'クリーム',
  serum: '美容液',
  sunscreen: '日焼け止め',
  toothbrush: '歯ブラシ',
  toothpaste: '歯磨き粉',
  drink: 'ドリンク',
  food: '食品',
  supplement: 'サプリメント',
  amenity: 'アメニティ',
  other: 'その他',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: '下書き', color: 'bg-gray-100 text-gray-800' },
  pending: { label: '承認待ち', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: '承認済み', color: 'bg-green-100 text-green-800' },
  rejected: { label: '却下', color: 'bg-red-100 text-red-800' },
  archived: { label: 'アーカイブ', color: 'bg-gray-100 text-gray-600' },
};

export default function ProductsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<any>({
    name: '',
    category: 'other',
    costPrice: 0,
    retailPrice: 0,
    ecUrl: '',
    shortDescription: '',
  });

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
    loadProducts();
  }, [router]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;

      const userData = JSON.parse(userStr);
      const response = await fetch('/api/manufacturer/products', {
        headers: {
          'x-user-id': userData.id,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/manufacturer/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('商品を登録しました。管理者の承認をお待ちください。');
        setShowCreateModal(false);
        setFormData({
          name: '',
          category: 'other',
          costPrice: 0,
          retailPrice: 0,
          ecUrl: '',
          shortDescription: '',
        });
        loadProducts();
      } else {
        const error = await response.json();
        alert(`エラー: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating product:', error);
      alert('商品の登録に失敗しました');
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('本当にこの商品を削除しますか？')) return;

    try {
      const response = await fetch(`/api/manufacturer/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user.id,
        },
      });

      if (response.ok) {
        alert('商品を削除しました');
        loadProducts();
      } else {
        const error = await response.json();
        alert(`エラー: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('商品の削除に失敗しました');
    }
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
              <h1 className="text-3xl font-bold text-gray-900">商品管理</h1>
              <p className="mt-2 text-gray-600">商品の登録・編集・削除を行います</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              + 新規商品登録
            </button>
          </div>
        </div>

        <div className="px-6 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
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
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">商品がありません</h3>
            <p className="mt-2 text-gray-500">最初の商品を登録してみましょう</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              商品を登録する
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                {/* Product Image */}
                <div className="h-48 bg-gray-200 relative">
                  {product.mainImageUrl ? (
                    <img
                      src={product.mainImageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <svg
                        className="w-16 h-16 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                        />
                      </svg>
                    </div>
                  )}
                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        STATUS_LABELS[product.status]?.color || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {STATUS_LABELS[product.status]?.label || product.status}
                    </span>
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">
                    {product.name}
                  </h3>
                  <p className="text-sm text-gray-500 mb-3">
                    {CATEGORY_LABELS[product.category] || product.category}
                  </p>

                  {/* Pricing */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs text-gray-500">原価</p>
                      <p className="text-sm font-medium">¥{product.costPrice.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">販売価格</p>
                      <p className="text-sm font-medium">¥{product.retailPrice.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Stats (if approved) */}
                  {product.status === 'approved' && product._count && (
                    <div className="grid grid-cols-3 gap-2 mb-4 pt-4 border-t">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">キャンペーン</p>
                        <p className="text-lg font-bold text-blue-600">
                          {product._count.campaignProducts}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">スキャン</p>
                        <p className="text-lg font-bold text-green-600">
                          {product._count.qrScanEvents}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">購入</p>
                        <p className="text-lg font-bold text-purple-600">
                          {product._count.purchaseEvents}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Rejection Reason */}
                  {product.status === 'rejected' && product.rejectionReason && (
                    <div className="mb-4 p-3 bg-red-50 rounded-lg">
                      <p className="text-xs font-medium text-red-800 mb-1">却下理由:</p>
                      <p className="text-sm text-red-700">{product.rejectionReason}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <a
                      href={product.ecUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 px-4 py-2 text-center border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                    >
                      EC確認
                    </a>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Product Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">新規商品登録</h2>
              
              <form onSubmit={handleCreate} className="space-y-4">
                {/* Product Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    商品名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="例: プレミアム シャンプー"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    カテゴリー <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Short Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    簡単な説明
                  </label>
                  <textarea
                    value={formData.shortDescription}
                    onChange={(e) =>
                      setFormData({ ...formData, shortDescription: e.target.value })
                    }
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="商品の特徴を簡潔に説明してください"
                  />
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      原価 (円) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.costPrice}
                      onChange={(e) =>
                        setFormData({ ...formData, costPrice: parseFloat(e.target.value) })
                      }
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      販売価格 (円) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.retailPrice}
                      onChange={(e) =>
                        setFormData({ ...formData, retailPrice: parseFloat(e.target.value) })
                      }
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* EC URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    EC購入URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    value={formData.ecUrl}
                    onChange={(e) => setFormData({ ...formData, ecUrl: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://example.com/product/..."
                  />
                </div>

                {/* Image URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    商品画像URL
                  </label>
                  <input
                    type="url"
                    value={formData.mainImageUrl || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, mainImageUrl: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    登録する
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}
