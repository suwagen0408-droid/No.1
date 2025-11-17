'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';
import Link from 'next/link';

interface Feedback {
  id: string;
  feedbackType: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
    mainImageUrl?: string;
  };
  facility?: {
    facilityName: string;
    facilityType: string;
  };
  qrScanEvent?: {
    scannedAt: string;
  };
}

interface User {
  id: string;
  email: string;
  role: 'manufacturer' | 'facility' | 'admin';
  profile?: any;
}

export default function FeedbackPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [statistics, setStatistics] = useState<{ [key: string]: { [key: string]: number } }>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    
    if (parsedUser.role !== 'manufacturer') {
      router.push('/dashboard');
      return;
    }

    setUser(parsedUser);
    loadFeedback(parsedUser.id);
  }, [router]);

  const loadFeedback = async (userId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/manufacturer/feedback', {
        headers: { 'x-user-id': userId },
      });

      if (response.ok) {
        const data = await response.json();
        setFeedback(data.feedback);
        setStatistics(data.statistics);
      }
    } catch (error) {
      console.error('フィードバック読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFeedbackIcon = (type: string) => {
    switch (type) {
      case 'like':
        return '👍';
      case 'dislike':
        return '👎';
      case 'question':
        return '❓';
      case 'suggestion':
        return '💡';
      default:
        return '📝';
    }
  };

  const getFeedbackLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      like: '良い',
      dislike: '改善希望',
      question: '質問',
      suggestion: '提案',
    };
    return labels[type] || type;
  };

  const getFeedbackColor = (type: string) => {
    const colors: { [key: string]: string } = {
      like: 'bg-green-100 text-green-800',
      dislike: 'bg-red-100 text-red-800',
      question: 'bg-blue-100 text-blue-800',
      suggestion: 'bg-purple-100 text-purple-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filter feedback
  const filteredFeedback = filter === 'all' 
    ? feedback 
    : feedback.filter(f => f.feedbackType === filter);

  // Group feedback by product
  const feedbackByProduct = filteredFeedback.reduce((acc, item) => {
    if (!acc[item.product.id]) {
      acc[item.product.id] = {
        product: item.product,
        items: [],
      };
    }
    acc[item.product.id].items.push(item);
    return acc;
  }, {} as { [key: string]: { product: Feedback['product'], items: Feedback[] } });

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">読み込み中...</div>;
  }

  return (
    <DashboardLayout user={user}>
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="border-b px-6 py-6">
          <h1 className="text-2xl font-bold text-gray-900">商品フィードバック</h1>
          <p className="mt-1 text-sm text-gray-600">
            施設や顧客からの商品フィードバックを確認します
          </p>

          {/* Filter */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              すべて
            </button>
            <button
              onClick={() => setFilter('like')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'like'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              👍 良い
            </button>
            <button
              onClick={() => setFilter('dislike')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'dislike'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              👎 改善希望
            </button>
            <button
              onClick={() => setFilter('question')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'question'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ❓ 質問
            </button>
            <button
              onClick={() => setFilter('suggestion')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'suggestion'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              💡 提案
            </button>
          </div>
        </div>

        {/* Feedback List */}
        <div className="px-6 py-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500">読み込み中...</div>
          ) : filteredFeedback.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💬</div>
              <p className="text-gray-500">
                {filter === 'all' ? 'フィードバックがありません' : `${getFeedbackLabel(filter)}のフィードバックがありません`}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.values(feedbackByProduct).map(({ product, items }) => (
                <div key={product.id} className="border rounded-lg p-6">
                  {/* Product Header */}
                  <div className="flex items-start mb-4 pb-4 border-b">
                    <div className="flex-shrink-0 w-16 h-16 bg-gray-200 rounded-lg mr-4">
                      {product.mainImageUrl ? (
                        <img
                          src={product.mainImageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          📦
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <Link
                        href={`/p/${product.id}`}
                        target="_blank"
                        className="text-lg font-semibold text-blue-600 hover:text-blue-700"
                      >
                        {product.name}
                      </Link>
                      
                      {/* Statistics */}
                      {statistics[product.id] && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {Object.entries(statistics[product.id]).map(([type, count]) => (
                            <span
                              key={type}
                              className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${getFeedbackColor(type)}`}
                            >
                              {getFeedbackIcon(type)} {count}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Feedback Items */}
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-start bg-gray-50 rounded-lg p-3">
                        <div className="text-2xl mr-3">
                          {getFeedbackIcon(item.feedbackType)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${getFeedbackColor(item.feedbackType)}`}>
                              {getFeedbackLabel(item.feedbackType)}
                            </span>
                            {item.facility && (
                              <span className="text-sm text-gray-600">
                                {item.facility.facilityName}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(item.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
