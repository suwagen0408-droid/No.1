'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';

interface Facility {
  id: string;
  facilityName: string;
  facilityType: string;
  campaigns?: number;
}

interface Review {
  id: string;
  createdAt: string;
  newValues: string;
}

interface ReviewData {
  rating: number;
  comment?: string;
  facilityName: string;
  campaignId?: string;
}

export default function ManufacturerReviewsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      // Load facilities that manufacturer has worked with
      const facilitiesRes = await fetch('/api/manufacturer/facility-collaborations', {
        headers: {
          'x-user-id': user.id,
        },
      });
      
      if (facilitiesRes.ok) {
        const facilitiesData = await facilitiesRes.json();
        setFacilities(facilitiesData.facilities || []);
      }

      // Load existing reviews
      const reviewsRes = await fetch('/api/manufacturer/facility-reviews', {
        headers: {
          'x-user-id': user.id,
        },
      });
      
      if (reviewsRes.ok) {
        const reviewsData = await reviewsRes.json();
        setReviews(reviewsData.reviews || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedFacility || !user) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/manufacturer/facility-reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          facilityId: selectedFacility.id,
          rating,
          comment: comment.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('レビューを投稿しました');
        setShowReviewModal(false);
        setSelectedFacility(null);
        setRating(5);
        setComment('');
        loadData(); // Reload reviews
      } else {
        alert(data.error || 'レビューの投稿に失敗しました');
      }
    } catch (error) {
      console.error('Submit review error:', error);
      alert('レビューの投稿に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const parseReviewData = (review: Review): ReviewData | null => {
    try {
      return JSON.parse(review.newValues);
    } catch {
      return null;
    }
  };

  const renderStars = (count: number, interactive: boolean = false, onSelect?: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => interactive && onSelect && onSelect(star)}
            disabled={!interactive}
            className={`text-2xl ${
              star <= count ? 'text-yellow-400' : 'text-gray-300'
            } ${interactive ? 'hover:text-yellow-500 cursor-pointer' : ''}`}
          >
            ⭐
          </button>
        ))}
      </div>
    );
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

  return (
    <DashboardLayout user={user}>
      <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">施設レビュー</h1>
        <p className="text-gray-600">取引のある施設を評価してください</p>
      </div>

      {/* Facilities to Review */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">レビュー可能な施設</h2>
        
        {facilities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            取引のある施設がありません
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {facilities.map((facility) => (
              <div key={facility.id} className="border rounded-lg p-4 hover:border-blue-500 transition-colors">
                <h3 className="font-bold text-gray-900 mb-2">{facility.facilityName}</h3>
                <p className="text-sm text-gray-600 mb-3">{facility.facilityType}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedFacility(facility);
                      setShowReviewModal(true);
                    }}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
                  >
                    レビューを書く
                  </button>
                  <button
                    onClick={() => router.push(`/dashboard/manufacturer/reviews/facility/${facility.id}`)}
                    className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 text-sm"
                  >
                    評価を見る
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Reviews */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">投稿したレビュー</h2>
        
        {reviews.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            まだレビューを投稿していません
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => {
              const data = parseReviewData(review);
              if (!data) return null;

              return (
                <div key={review.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-gray-900">{data.facilityName}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(review.createdAt).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                    {renderStars(data.rating)}
                  </div>
                  {data.comment && (
                    <p className="text-gray-700 mt-2">{data.comment}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedFacility && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              レビューを投稿
            </h2>
            
            <div className="mb-4">
              <p className="text-gray-700 font-medium">{selectedFacility.facilityName}</p>
              <p className="text-sm text-gray-500">{selectedFacility.facilityType}</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                評価
              </label>
              {renderStars(rating, true, setRating)}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                コメント（任意）
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="施設に対する評価やフィードバックを入力してください"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedFacility(null);
                  setRating(5);
                  setComment('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                disabled={submitting}
              >
                キャンセル
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {submitting ? '送信中...' : '投稿する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}
