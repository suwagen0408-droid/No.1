'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  manufacturer?: {
    id: string;
    companyName: string;
    phone?: string;
    approvedAt?: string;
    approvedBy?: string;
    rejectionReason?: string;
    approver?: {
      email: string;
    };
  };
  facility?: {
    id: string;
    facilityName: string;
    facilityType: string;
    phone?: string;
    approvedAt?: string;
    approvedBy?: string;
    rejectionReason?: string;
    approver?: {
      email: string;
    };
  };
}

interface Product {
  id: string;
  name: string;
  category: string;
  status: string;
  retailPrice: number;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  manufacturer: {
    companyName: string;
    user: {
      email: string;
    };
  };
  approver?: {
    email: string;
  };
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  totalUnits: number;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  manufacturer: {
    companyName: string;
    user: {
      email: string;
    };
  };
  approver?: {
    email: string;
  };
  campaignProducts?: Array<{
    product: {
      name: string;
    };
  }>;
}

export default function ApprovalsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'accounts' | 'products' | 'campaigns'>('accounts');
  
  const [accountsData, setAccountsData] = useState<{
    pending: { manufacturers: User[]; facilities: User[] };
    processed: User[];
  } | null>(null);
  
  const [productsData, setProductsData] = useState<{
    pending: Product[];
    processed: Product[];
  } | null>(null);
  
  const [campaignsData, setCampaignsData] = useState<{
    pending: Campaign[];
    processed: Campaign[];
  } | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<{
    type: string;
    id: string;
    name: string;
  } | null>(null);

  // Edit modal states
  const [showEditModal, setShowEditModal] = useState<{
    type: 'manufacturer' | 'facility' | 'product' | 'campaign';
    id: string;
    data: any;
  } | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }
    
    const userData = JSON.parse(userStr);
    if (userData.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    
    setUser(userData);
    loadData('accounts');
  }, [router]);

  const loadData = async (tab: 'accounts' | 'products' | 'campaigns') => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/approvals/${tab}`);
      if (response.ok) {
        const data = await response.json();
        if (tab === 'accounts') setAccountsData(data);
        else if (tab === 'products') setProductsData(data);
        else if (tab === 'campaigns') setCampaignsData(data);
      }
    } catch (error) {
      console.error(`Error loading ${tab}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: 'accounts' | 'products' | 'campaigns') => {
    setActiveTab(tab);
    if (tab === 'accounts' && !accountsData) loadData('accounts');
    else if (tab === 'products' && !productsData) loadData('products');
    else if (tab === 'campaigns' && !campaignsData) loadData('campaigns');
  };

  const handleApprove = async (type: 'account' | 'product' | 'campaign', id: string) => {
    if (!user) return;
    
    setProcessing(id);
    try {
      const endpoint =
        type === 'account'
          ? '/api/admin/approvals/accounts'
          : type === 'product'
          ? '/api/admin/approvals/products'
          : '/api/admin/approvals/campaigns';
      
      const bodyKey =
        type === 'account' ? 'userId' : type === 'product' ? 'productId' : 'campaignId';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [bodyKey]: id,
          action: 'approve',
          adminId: user.id,
        }),
      });

      if (response.ok) {
        alert('承認しました');
        loadData(activeTab);
      } else {
        const error = await response.json();
        console.error('Approval error:', error);
        alert(`エラー: ${error.error}${error.details ? '\n詳細: ' + error.details : ''}`);
      }
    } catch (error) {
      console.error('Error approving:', error);
      alert('承認に失敗しました');
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectClick = (type: string, id: string, name: string) => {
    setShowRejectModal({ type, id, name });
    setRejectionReason('');
  };

  const handleRejectConfirm = async () => {
    if (!showRejectModal || !user) return;
    
    const { type, id } = showRejectModal;
    setProcessing(id);
    
    try {
      const endpoint =
        type === 'account'
          ? '/api/admin/approvals/accounts'
          : type === 'product'
          ? '/api/admin/approvals/products'
          : '/api/admin/approvals/campaigns';
      
      const bodyKey =
        type === 'account' ? 'userId' : type === 'product' ? 'productId' : 'campaignId';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [bodyKey]: id,
          action: 'reject',
          rejectionReason,
          adminId: user.id,
        }),
      });

      if (response.ok) {
        alert('却下しました');
        setShowRejectModal(null);
        loadData(activeTab);
      } else {
        const error = await response.json();
        alert(`エラー: ${error.error}`);
      }
    } catch (error) {
      console.error('Error rejecting:', error);
      alert('却下に失敗しました');
    } finally {
      setProcessing(null);
    }
  };

  if (!user) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">承認管理</h1>
          <p className="mt-2 text-gray-600">
            アカウント・商品・キャンペーンの承認または却下を行います
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => handleTabChange('accounts')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'accounts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              アカウント
            </button>
            <button
              onClick={() => handleTabChange('products')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'products'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              商品
            </button>
            <button
              onClick={() => handleTabChange('campaigns')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'campaigns'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              キャンペーン
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="mt-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">読み込み中...</p>
            </div>
          ) : (
            <>
              {/* Accounts Tab */}
              {activeTab === 'accounts' && accountsData && (
                <div className="space-y-8">
                  {/* Pending Manufacturers */}
                  <div>
                    <h2 className="text-xl font-semibold mb-4">承認待ちメーカー</h2>
                    {accountsData.pending.manufacturers.length === 0 ? (
                      <p className="text-gray-500">承認待ちのメーカーはありません</p>
                    ) : (
                      <div className="bg-white shadow overflow-hidden rounded-lg">
                        <ul className="divide-y divide-gray-200">
                          {accountsData.pending.manufacturers.map((acc) => (
                            <li key={acc.id} className="p-6">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h3 className="text-lg font-medium text-gray-900">
                                    {acc.manufacturer?.companyName}
                                  </h3>
                                  <p className="text-sm text-gray-500">
                                    Email: {acc.email}
                                  </p>
                                  {acc.manufacturer?.phone && (
                                    <p className="text-sm text-gray-500">
                                      電話: {acc.manufacturer.phone}
                                    </p>
                                  )}
                                  <p className="text-sm text-gray-400 mt-1">
                                    登録日: {new Date(acc.createdAt).toLocaleDateString('ja-JP')}
                                  </p>
                                </div>
                                <div className="flex space-x-3">
                                  <button
                                    onClick={() => handleApprove('account', acc.id)}
                                    disabled={processing === acc.id}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                  >
                                    {processing === acc.id ? '処理中...' : '承認'}
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleRejectClick(
                                        'account',
                                        acc.id,
                                        acc.manufacturer?.companyName || acc.email
                                      )
                                    }
                                    disabled={processing === acc.id}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                                  >
                                    却下
                                  </button>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Pending Facilities */}
                  <div>
                    <h2 className="text-xl font-semibold mb-4">承認待ち施設</h2>
                    {accountsData.pending.facilities.length === 0 ? (
                      <p className="text-gray-500">承認待ちの施設はありません</p>
                    ) : (
                      <div className="bg-white shadow overflow-hidden rounded-lg">
                        <ul className="divide-y divide-gray-200">
                          {accountsData.pending.facilities.map((acc) => (
                            <li key={acc.id} className="p-6">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h3 className="text-lg font-medium text-gray-900">
                                    {acc.facility?.facilityName}
                                  </h3>
                                  <p className="text-sm text-gray-500">
                                    Email: {acc.email}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    種類: {acc.facility?.facilityType}
                                  </p>
                                  {acc.facility?.phone && (
                                    <p className="text-sm text-gray-500">
                                      電話: {acc.facility.phone}
                                    </p>
                                  )}
                                  <p className="text-sm text-gray-400 mt-1">
                                    登録日: {new Date(acc.createdAt).toLocaleDateString('ja-JP')}
                                  </p>
                                </div>
                                <div className="flex space-x-3">
                                  <button
                                    onClick={() => handleApprove('account', acc.id)}
                                    disabled={processing === acc.id}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                  >
                                    {processing === acc.id ? '処理中...' : '承認'}
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleRejectClick(
                                        'account',
                                        acc.id,
                                        acc.facility?.facilityName || acc.email
                                      )
                                    }
                                    disabled={processing === acc.id}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                                  >
                                    却下
                                  </button>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Processed Accounts */}
                  <div>
                    <h2 className="text-xl font-semibold mb-4">処理済みアカウント（最新20件）</h2>
                    {accountsData.processed.length === 0 ? (
                      <p className="text-gray-500">処理済みアカウントはありません</p>
                    ) : (
                      <div className="bg-white shadow overflow-hidden rounded-lg">
                        <ul className="divide-y divide-gray-200">
                          {accountsData.processed.map((acc) => (
                            <li key={acc.id} className="p-6">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h3 className="text-lg font-medium text-gray-900">
                                    {acc.manufacturer?.companyName || acc.facility?.facilityName}
                                  </h3>
                                  <p className="text-sm text-gray-500">Email: {acc.email}</p>
                                  <p className="text-sm text-gray-500">
                                    ロール: {acc.role === 'manufacturer' ? 'メーカー' : '施設'}
                                  </p>
                                  {(acc.manufacturer?.approver || acc.facility?.approver) && (
                                    <p className="text-sm text-gray-500">
                                      承認者:{' '}
                                      {acc.manufacturer?.approver?.email ||
                                        acc.facility?.approver?.email}
                                    </p>
                                  )}
                                  {(acc.manufacturer?.rejectionReason ||
                                    acc.facility?.rejectionReason) && (
                                    <p className="text-sm text-red-600 mt-1">
                                      却下理由:{' '}
                                      {acc.manufacturer?.rejectionReason ||
                                        acc.facility?.rejectionReason}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center space-x-3">
                                  <span
                                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                                      acc.status === 'active'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}
                                  >
                                    {acc.status === 'active' ? '承認済み' : '却下'}
                                  </span>
                                  {acc.manufacturer && (
                                    <>
                                      <button
                                        onClick={async () => {
                                          if (!acc.manufacturer) return;
                                          const response = await fetch(`/api/admin/manufacturers/${acc.manufacturer.id}`, {
                                            headers: { 'x-user-id': user.id },
                                          });
                                          if (response.ok) {
                                            const data = await response.json();
                                            setEditFormData(data.manufacturer);
                                            setShowEditModal({ type: 'manufacturer', id: acc.manufacturer.id, data: data.manufacturer });
                                          }
                                        }}
                                        className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded hover:bg-blue-50"
                                      >
                                        編集
                                      </button>
                                      <button
                                        onClick={async () => {
                                          if (!acc.manufacturer) return;
                                          if (confirm(`${acc.manufacturer.companyName}を削除しますか？`)) {
                                            try {
                                              const response = await fetch(`/api/admin/manufacturers/${acc.manufacturer.id}`, {
                                                method: 'DELETE',
                                                headers: { 'x-user-id': user.id },
                                              });
                                              if (response.ok) {
                                                alert('削除しました');
                                                loadData('accounts');
                                              } else {
                                                alert('削除に失敗しました');
                                              }
                                            } catch (error) {
                                              alert('削除に失敗しました');
                                            }
                                          }
                                        }}
                                        className="px-3 py-1 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded hover:bg-red-50"
                                      >
                                        削除
                                      </button>
                                    </>
                                  )}
                                  {acc.facility && (
                                    <>
                                      <button
                                        onClick={async () => {
                                          const response = await fetch(`/api/admin/facilities/${acc.facility.id}`, {
                                            headers: { 'x-user-id': user.id },
                                          });
                                          if (response.ok) {
                                            const data = await response.json();
                                            setEditFormData(data.facility);
                                            setShowEditModal({ type: 'facility', id: acc.facility.id, data: data.facility });
                                          }
                                        }}
                                        className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded hover:bg-blue-50"
                                      >
                                        編集
                                      </button>
                                      <button
                                        onClick={async () => {
                                          if (confirm(`${acc.facility?.facilityName}を削除しますか？`)) {
                                            try {
                                              const response = await fetch(`/api/admin/facilities/${acc.facility.id}`, {
                                                method: 'DELETE',
                                                headers: { 'x-user-id': user.id },
                                              });
                                              if (response.ok) {
                                                alert('削除しました');
                                                loadData('accounts');
                                              } else {
                                                alert('削除に失敗しました');
                                              }
                                            } catch (error) {
                                              alert('削除に失敗しました');
                                            }
                                          }
                                        }}
                                        className="px-3 py-1 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded hover:bg-red-50"
                                      >
                                        削除
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Products Tab */}
              {activeTab === 'products' && productsData && (
                <div className="space-y-8">
                  {/* Pending Products */}
                  <div>
                    <h2 className="text-xl font-semibold mb-4">承認待ち商品</h2>
                    {productsData.pending.length === 0 ? (
                      <p className="text-gray-500">承認待ちの商品はありません</p>
                    ) : (
                      <div className="bg-white shadow overflow-hidden rounded-lg">
                        <ul className="divide-y divide-gray-200">
                          {productsData.pending.map((product) => (
                            <li key={product.id} className="p-6">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h3 className="text-lg font-medium text-gray-900">
                                    {product.name}
                                  </h3>
                                  <p className="text-sm text-gray-500">
                                    メーカー: {product.manufacturer.companyName}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    カテゴリー: {product.category}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    価格: ¥{product.retailPrice.toLocaleString()}
                                  </p>
                                  <p className="text-sm text-gray-400 mt-1">
                                    登録日:{' '}
                                    {new Date(product.createdAt).toLocaleDateString('ja-JP')}
                                  </p>
                                </div>
                                <div className="flex space-x-3">
                                  <button
                                    onClick={() => handleApprove('product', product.id)}
                                    disabled={processing === product.id}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                  >
                                    {processing === product.id ? '処理中...' : '承認'}
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleRejectClick('product', product.id, product.name)
                                    }
                                    disabled={processing === product.id}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                                  >
                                    却下
                                  </button>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Processed Products */}
                  <div>
                    <h2 className="text-xl font-semibold mb-4">処理済み商品（最新20件）</h2>
                    {productsData.processed.length === 0 ? (
                      <p className="text-gray-500">処理済み商品はありません</p>
                    ) : (
                      <div className="bg-white shadow overflow-hidden rounded-lg">
                        <ul className="divide-y divide-gray-200">
                          {productsData.processed.map((product) => (
                            <li key={product.id} className="p-6">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h3 className="text-lg font-medium text-gray-900">
                                    {product.name}
                                  </h3>
                                  <p className="text-sm text-gray-500">
                                    メーカー: {product.manufacturer.companyName}
                                  </p>
                                  {product.approver && (
                                    <p className="text-sm text-gray-500">
                                      承認者: {product.approver.email}
                                    </p>
                                  )}
                                  {product.rejectionReason && (
                                    <p className="text-sm text-red-600 mt-1">
                                      却下理由: {product.rejectionReason}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center space-x-3">
                                  <span
                                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                                      product.status === 'approved'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}
                                  >
                                    {product.status === 'approved' ? '承認済み' : '却下'}
                                  </span>
                                  <button
                                    onClick={async () => {
                                      const response = await fetch(`/api/admin/products/${product.id}`, {
                                        headers: { 'x-user-id': user.id },
                                      });
                                      if (response.ok) {
                                        const data = await response.json();
                                        setEditFormData(data.product);
                                        setShowEditModal({ type: 'product', id: product.id, data: data.product });
                                      }
                                    }}
                                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded hover:bg-blue-50"
                                  >
                                    編集
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (confirm(`${product.name}を削除しますか？`)) {
                                        try {
                                          const response = await fetch(`/api/admin/products/${product.id}`, {
                                            method: 'DELETE',
                                            headers: { 'x-user-id': user.id },
                                          });
                                          if (response.ok) {
                                            alert('削除しました');
                                            loadData('products');
                                          } else {
                                            alert('削除に失敗しました');
                                          }
                                        } catch (error) {
                                          alert('削除に失敗しました');
                                        }
                                      }
                                    }}
                                    className="px-3 py-1 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded hover:bg-red-50"
                                  >
                                    削除
                                  </button>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Campaigns Tab */}
              {activeTab === 'campaigns' && campaignsData && (
                <div className="space-y-8">
                  {/* Pending Campaigns */}
                  <div>
                    <h2 className="text-xl font-semibold mb-4">承認待ちキャンペーン</h2>
                    {campaignsData.pending.length === 0 ? (
                      <p className="text-gray-500">承認待ちのキャンペーンはありません</p>
                    ) : (
                      <div className="bg-white shadow overflow-hidden rounded-lg">
                        <ul className="divide-y divide-gray-200">
                          {campaignsData.pending.map((campaign) => (
                            <li key={campaign.id} className="p-6">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h3 className="text-lg font-medium text-gray-900">
                                    {campaign.name}
                                  </h3>
                                  <p className="text-sm text-gray-500">
                                    メーカー: {campaign.manufacturer.companyName}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    期間: {new Date(campaign.startDate).toLocaleDateString('ja-JP')}{' '}
                                    - {new Date(campaign.endDate).toLocaleDateString('ja-JP')}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    総数: {campaign.totalUnits}個
                                  </p>
                                  {campaign.campaignProducts && campaign.campaignProducts.length > 0 && (
                                    <p className="text-sm text-gray-500">
                                      商品:{' '}
                                      {campaign.campaignProducts
                                        .map((cp) => cp.product.name)
                                        .join(', ')}
                                    </p>
                                  )}
                                  <p className="text-sm text-gray-400 mt-1">
                                    登録日:{' '}
                                    {new Date(campaign.createdAt).toLocaleDateString('ja-JP')}
                                  </p>
                                </div>
                                <div className="flex space-x-3">
                                  <button
                                    onClick={() => handleApprove('campaign', campaign.id)}
                                    disabled={processing === campaign.id}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                  >
                                    {processing === campaign.id ? '処理中...' : '承認'}
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleRejectClick('campaign', campaign.id, campaign.name)
                                    }
                                    disabled={processing === campaign.id}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                                  >
                                    却下
                                  </button>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Processed Campaigns */}
                  <div>
                    <h2 className="text-xl font-semibold mb-4">処理済みキャンペーン（最新20件）</h2>
                    {campaignsData.processed.length === 0 ? (
                      <p className="text-gray-500">処理済みキャンペーンはありません</p>
                    ) : (
                      <div className="bg-white shadow overflow-hidden rounded-lg">
                        <ul className="divide-y divide-gray-200">
                          {campaignsData.processed.map((campaign) => (
                            <li key={campaign.id} className="p-6">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h3 className="text-lg font-medium text-gray-900">
                                    {campaign.name}
                                  </h3>
                                  <p className="text-sm text-gray-500">
                                    メーカー: {campaign.manufacturer.companyName}
                                  </p>
                                  {campaign.approver && (
                                    <p className="text-sm text-gray-500">
                                      承認者: {campaign.approver.email}
                                    </p>
                                  )}
                                  {campaign.rejectionReason && (
                                    <p className="text-sm text-red-600 mt-1">
                                      却下理由: {campaign.rejectionReason}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center space-x-3">
                                  <span
                                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                                      campaign.status === 'approved' || campaign.status === 'active'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}
                                  >
                                    {campaign.status === 'approved' || campaign.status === 'active'
                                      ? '承認済み'
                                      : '却下'}
                                  </span>
                                  <button
                                    onClick={async () => {
                                      const response = await fetch(`/api/admin/campaigns/${campaign.id}`, {
                                        headers: { 'x-user-id': user.id },
                                      });
                                      if (response.ok) {
                                        const data = await response.json();
                                        setEditFormData(data.campaign);
                                        setShowEditModal({ type: 'campaign', id: campaign.id, data: data.campaign });
                                      }
                                    }}
                                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded hover:bg-blue-50"
                                  >
                                    編集
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (confirm(`${campaign.name}を削除しますか？`)) {
                                        try {
                                          const response = await fetch(`/api/admin/campaigns/${campaign.id}`, {
                                            method: 'DELETE',
                                            headers: { 'x-user-id': user.id },
                                          });
                                          if (response.ok) {
                                            alert('削除しました');
                                            loadData('campaigns');
                                          } else {
                                            alert('削除に失敗しました');
                                          }
                                        } catch (error) {
                                          alert('削除に失敗しました');
                                        }
                                      }
                                    }}
                                    className="px-3 py-1 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded hover:bg-red-50"
                                  >
                                    削除
                                  </button>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">却下理由を入力してください</h3>
            <p className="text-sm text-gray-600 mb-4">
              対象: {showRejectModal.name}
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="却下理由を入力..."
              className="w-full border border-gray-300 rounded-lg p-3 mb-4 h-32"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowRejectModal(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={!rejectionReason.trim() || processing === showRejectModal.id}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {processing === showRejectModal.id ? '処理中...' : '却下する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 my-8">
            <h3 className="text-lg font-semibold mb-4">
              {showEditModal.type === 'manufacturer' && 'メーカー情報を編集'}
              {showEditModal.type === 'facility' && '施設情報を編集'}
              {showEditModal.type === 'product' && '商品情報を編集'}
              {showEditModal.type === 'campaign' && 'キャンペーン情報を編集'}
            </h3>
            
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Manufacturer Form */}
              {showEditModal.type === 'manufacturer' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">会社名</label>
                    <input
                      type="text"
                      value={editFormData.companyName || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, companyName: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">代表者名</label>
                    <input
                      type="text"
                      value={editFormData.representativeName || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, representativeName: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">住所</label>
                    <input
                      type="text"
                      value={editFormData.address || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
                    <input
                      type="tel"
                      value={editFormData.phoneNumber || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, phoneNumber: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">事業内容</label>
                    <textarea
                      value={editFormData.businessDescription || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, businessDescription: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2 h-24"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ウェブサイト</label>
                    <input
                      type="url"
                      value={editFormData.website || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, website: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2"
                    />
                  </div>
                </>
              )}

              {/* Facility Form */}
              {showEditModal.type === 'facility' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">施設名</label>
                    <input
                      type="text"
                      value={editFormData.facilityName || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, facilityName: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">施設タイプ</label>
                    <select
                      value={editFormData.facilityType || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, facilityType: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2"
                    >
                      <option value="hotel">ホテル</option>
                      <option value="ryokan">旅館</option>
                      <option value="onsen">温泉</option>
                      <option value="cafe">カフェ</option>
                      <option value="restaurant">レストラン</option>
                      <option value="gym">ジム</option>
                      <option value="salon">サロン</option>
                      <option value="other">その他</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">月間利用者数</label>
                    <input
                      type="number"
                      value={editFormData.avgMonthlyGuests || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, avgMonthlyGuests: parseInt(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">住所</label>
                    <input
                      type="text"
                      value={editFormData.address || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
                    <input
                      type="tel"
                      value={editFormData.phoneNumber || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, phoneNumber: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ウェブサイト</label>
                    <input
                      type="url"
                      value={editFormData.website || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, website: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2"
                    />
                  </div>
                </>
              )}

              {/* Product Form */}
              {showEditModal.type === 'product' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">商品名</label>
                    <input
                      type="text"
                      value={editFormData.name || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリー</label>
                    <select
                      value={editFormData.category || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2"
                    >
                      <option value="skincare">スキンケア</option>
                      <option value="haircare">ヘアケア</option>
                      <option value="bodycare">ボディケア</option>
                      <option value="cosmetics">化粧品</option>
                      <option value="health">健康食品</option>
                      <option value="beverage">飲料</option>
                      <option value="food">食品</option>
                      <option value="lifestyle">ライフスタイル</option>
                      <option value="other">その他</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                    <textarea
                      value={editFormData.description || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2 h-24"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">小売価格</label>
                    <input
                      type="number"
                      value={editFormData.retailPrice || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, retailPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">容量/サイズ</label>
                    <input
                      type="text"
                      value={editFormData.volume || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, volume: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2"
                    />
                  </div>
                </>
              )}

              {/* Campaign Form */}
              {showEditModal.type === 'campaign' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">キャンペーン名</label>
                    <input
                      type="text"
                      value={editFormData.name || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                    <textarea
                      value={editFormData.description || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2 h-24"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">開始日</label>
                    <input
                      type="date"
                      value={editFormData.startDate ? new Date(editFormData.startDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">終了日</label>
                    <input
                      type="date"
                      value={editFormData.endDate ? new Date(editFormData.endDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => setEditFormData({ ...editFormData, endDate: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">総数</label>
                    <input
                      type="number"
                      value={editFormData.totalUnits || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, totalUnits: parseInt(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">配布方法</label>
                    <select
                      value={editFormData.distributionType || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, distributionType: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2"
                    >
                      <option value="qr">QRコード</option>
                      <option value="staff">スタッフ配布</option>
                      <option value="both">両方</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(null);
                  setEditFormData({});
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={async () => {
                  if (!showEditModal) return;
                  
                  try {
                    const endpoint = {
                      manufacturer: `/api/admin/manufacturers/${showEditModal.id}`,
                      facility: `/api/admin/facilities/${showEditModal.id}`,
                      product: `/api/admin/products/${showEditModal.id}`,
                      campaign: `/api/admin/campaigns/${showEditModal.id}`,
                    }[showEditModal.type];

                    const response = await fetch(endpoint, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        'x-user-id': user.id,
                      },
                      body: JSON.stringify(editFormData),
                    });

                    if (response.ok) {
                      alert('更新しました');
                      setShowEditModal(null);
                      setEditFormData({});
                      
                      // Reload appropriate data
                      if (showEditModal.type === 'manufacturer' || showEditModal.type === 'facility') {
                        loadData('accounts');
                      } else if (showEditModal.type === 'product') {
                        loadData('products');
                      } else if (showEditModal.type === 'campaign') {
                        loadData('campaigns');
                      }
                    } else {
                      const errorData = await response.json();
                      alert(`更新に失敗しました: ${errorData.error || '不明なエラー'}`);
                    }
                  } catch (error) {
                    console.error('Update error:', error);
                    alert('更新に失敗しました');
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
