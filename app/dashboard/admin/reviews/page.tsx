'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';
import Link from 'next/link';

interface Review {
  id: string;
  rating: number;
  comment?: string;
  nickname?: string;
  email?: string;
  status: string;
  createdAt: string;
  approvedAt?: string;
  product: {
    id: string;
    name: string;
    manufacturer: {
      companyName: string;
    };
  };
  facility?: {
    facilityName: string;
  };
  approver?: {
    email: string;
  };
}

interface User {
  id: string;
  email: string;
  role: 'admin' | 'manufacturer' | 'facility';
  profile?: any;
}

export default function ReviewModerationPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    
    if (parsedUser.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    setUser(parsedUser);
    loadReviews(filter);
  }, [router]);

  const loadReviews = async (status: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/reviews?status=${status}`, {
        headers: { 'x-user-id': user?.id || '' },
      });

      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews);
      }
    } catch (error) {
      console.error('レビュー読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilter: 'pending' | 'approved' | 'rejected') => {
    setFilter(newFilter);
    loadReviews(newFilter);
  };

  const handleModerateReview = async (reviewId: string, action: 'approve' | 'reject') => {
    if (!user) return;
    
    if (!confirm(`このレビューを${action === 'approve' ? '承認' : '却下'}しますか？`)) {
      return;
    }

    setProcessing(reviewId);

    try {
      const response = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          reviewId,
          action,
          adminId: user.id,
        }),
      });

      if (response.ok) {
        alert(`レビューを${action === 'approve' ? '承認' : '却下'}しました`);
        loadReviews(filter);
      } else {
        const data = await response.json();
        alert(data.error || 'エラーが発生しました');
      }
    } catch (error) {
      alert('処理に失敗しました');
    } finally {
      setProcessing(null);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex text-lg">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={star <= rating ? 'text-yellow-400' : 'text-gray-300'}>
            ★
          </span>
        ))}
      </div>
    );
  };

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">読み込み中...</div>;
  }

  return (
    <DashboardLayout user={user}>
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="border-b px-6 py-6">
          <h1 className="text-2xl font-bold text-gray-900">レビュー管理</h1>
          <p className="mt-1 text-sm text-gray-600">
            商品レビューの承認・却下を行います
          </p>

          {/* Filter Tabs */}
          <div className="mt-4 flex space-x-2">
            <button
              onClick={() => handleFilterChange('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'pending'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              承認待ち
            </button>
            <button
              onClick={() => handleFilterChange('approved')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'approved'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              承認済み
            </button>
            <button
              onClick={() => handleFilterChange('rejected')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'rejected'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              却下済み
            </button>
          </div>
        </div>

        {/* Reviews List */}
        <div className="px-6 py-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500">読み込み中...</div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-gray-500">
                {filter === 'pending' ? '承認待ちのレビューはありません' : `${filter === 'approved' ? '承認済み' : '却下済み'}のレビューはありません`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="border rounded-lg p-6 hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      {/* Product Info */}
                      <div className="mb-3">
                        <Link
                          href={`/p/${review.product.id}`}
                          target="_blank"
                          className="text-lg font-semibold text-blue-600 hover:text-blue-700"
                        >
                          {review.product.name}
                        </Link>
                        <p className="text-sm text-gray-600">
                          {review.product.manufacturer.companyName}
                        </p>
                      </div>

                      {/* Rating */}
                      <div className="mb-3">
                        {renderStars(review.rating)}
                      </div>

                      {/* Comment */}
                      {review.comment && (
                        <p className="text-gray-700 mb-3 whitespace-pre-wrap">
                          {review.comment}
                        </p>
                      )}

                      {/* Reviewer Info */}
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>投稿者: {review.nickname || '匿名'}</span>
                        {review.email && <span>({review.email})</span>}
                        {review.facility && (
                          <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
                            {review.facility.facilityName}
                          </span>
                        )}
                        <span>
                          投稿日: {new Date(review.createdAt).toLocaleDateString('ja-JP')}
                        </span>
                      </div>

                      {/* Status Info */}
                      {review.status !== 'pending' && (
                        <div className="mt-3 text-sm">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded ${
                              review.status === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {review.status === 'approved' ? '承認済み' : '却下済み'}
                          </span>
                          {review.approver && (
                            <span className="ml-2 text-gray-600">
                              処理者: {review.approver.email}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {review.status === 'pending' && (
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleModerateReview(review.id, 'approve')}
                          disabled={processing === review.id}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm font-medium"
                        >
                          承認
                        </button>
                        <button
                          onClick={() => handleModerateReview(review.id, 'reject')}
                          disabled={processing === review.id}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400 text-sm font-medium"
                        >
                          却下
                        </button>
                      </div>
                    )}
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
