'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';

interface Manufacturer {
  id: string;
  companyName: string;
  representativeName?: string;
  phone?: string;
  user: {
    email: string;
  };
}

interface Product {
  id: string;
  name: string;
  category: string;
  status: string;
  retailPrice: number;
  manufacturer: {
    companyName: string;
  };
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  manufacturer: {
    companyName: string;
  };
}

export default function MasterManagementPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'manufacturers' | 'products' | 'campaigns'>('manufacturers');
  const [loading, setLoading] = useState(true);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

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
    loadData();
  }, [router]);

  const loadData = async () => {
    // For now, load from approvals API
    // In production, create dedicated master list APIs
    setLoading(false);
  };

  const handleDelete = async (type: 'manufacturer' | 'product' | 'campaign', id: string, name: string) => {
    if (!confirm(`「${name}」を削除してもよろしいですか？この操作は取り消せません。`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/${type === 'manufacturer' ? 'manufacturers' : type === 'product' ? 'products' : 'campaigns'}/${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user.id,
        },
      });

      if (response.ok) {
        alert('削除しました');
        loadData();
      } else {
        const data = await response.json();
        alert(data.error || '削除に失敗しました');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert('削除に失敗しました');
    }
  };

  if (!user) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <DashboardLayout user={user}>
      <div className="bg-white rounded-lg shadow">
        <div className="border-b px-6 py-6">
          <h1 className="text-3xl font-bold text-gray-900">マスター管理</h1>
          <p className="mt-2 text-gray-600">
            企業、商品、キャンペーンを編集・削除できます
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex space-x-4 px-6">
            {[
              { key: 'manufacturers', label: 'メーカー管理' },
              { key: 'products', label: '商品管理' },
              { key: 'campaigns', label: 'キャンペーン管理' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-4 px-4 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        ) : (
          <div className="px-6 py-8">
            {activeTab === 'manufacturers' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <p className="text-blue-800">
                  メーカー管理は承認管理画面から行ってください
                </p>
                <a
                  href="/dashboard/approvals"
                  className="text-blue-600 hover:underline font-medium"
                >
                  承認管理へ →
                </a>
              </div>
            )}

            {activeTab === 'products' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <p className="text-blue-800">
                  商品管理は承認管理画面から行ってください
                </p>
                <a
                  href="/dashboard/approvals"
                  className="text-blue-600 hover:underline font-medium"
                >
                  承認管理へ →
                </a>
              </div>
            )}

            {activeTab === 'campaigns' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <p className="text-blue-800">
                  キャンペーン管理は承認管理画面から行ってください
                </p>
                <a
                  href="/dashboard/approvals"
                  className="text-blue-600 hover:underline font-medium"
                >
                  承認管理へ →
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
