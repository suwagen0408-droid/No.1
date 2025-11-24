'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';

interface FacilityRatingData {
  facility: {
    id: string;
    name: string;
    type: string;
  };
  rating: {
    average: number;
    count: number;
    distribution: {
      5: number;
      4: number;
      3: number;
      2: number;
      1: number;
    };
  };
  reviews: Array<{
    id: string;
    rating: number;
    comment?: string;
    manufacturerName: string;
    createdAt: string;
  }>;
}

export default function FacilityRatingPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [data, setData] = useState<FacilityRatingData | null>(null);
  const [loading, setLoading] = useState(true);

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
    params.then((p) => setFacilityId(p.id));
  }, [params]);

  useEffect(() => {
    if (facilityId && user) {
      loadRating();
    }
  }, [facilityId, user]);

  const loadRating = async () => {
    if (!facilityId) return;

    try {
      const response = await fetch(`/api/facilities/${facilityId}/rating`, {
        headers: {
          'x-user-id': localStorage.getItem('userId') || '',
        },
      });

      if (response.ok) {
        const ratingData = await response.json();
        setData(ratingData);
      } else {
        alert('評価データの取得に失敗しました');
      }
    } catch (error) {
      console.error('Failed to load rating:', error);
      alert('評価データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (count: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`text-2xl ${
              star <= count ? 'text-yellow-400' : 'text-gray-300'
            }`}
          >
            ⭐
          </span>
        ))}
      </div>
    );
  };

  const renderDistributionBar = (stars: number, count: number, total: number) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700 w-12">
          {stars}⭐
        </span>
        <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-yellow-400 h-full transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-sm text-gray-600 w-12 text-right">
          {count}
        </span>
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

  if (!data) {
    return (
      <DashboardLayout user={user}>
        <div className="p-8">
          <div className="text-center text-gray-500">データが見つかりません</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="p-8">
      {/* Back Button */}
      <button
        onClick={() => router.push('/dashboard/manufacturer/reviews')}
        className="mb-6 text-blue-600 hover:text-blue-700 flex items-center gap-2"
      >
        ← レビュー一覧に戻る
      </button>

      {/* Facility Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{data.facility.name}</h1>
        <p className="text-gray-600">{data.facility.type}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Rating Summary */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">総合評価</h2>
          
          <div className="text-center mb-6">
            <div className="text-5xl font-bold text-gray-900 mb-2">
              {data.rating.average.toFixed(1)}
            </div>
            <div className="flex justify-center mb-2">
              {renderStars(Math.round(data.rating.average))}
            </div>
            <p className="text-sm text-gray-600">
              {data.rating.count} 件のレビュー
            </p>
          </div>

          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => (
              <div key={stars}>
                {renderDistributionBar(
                  stars,
                  data.rating.distribution[stars as keyof typeof data.rating.distribution],
                  data.rating.count
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Reviews List */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">レビュー</h2>
          
          {data.reviews.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              まだレビューがありません
            </div>
          ) : (
            <div className="space-y-6">
              {data.reviews.map((review) => (
                <div key={review.id} className="border-b pb-6 last:border-b-0 last:pb-0">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900">{review.manufacturerName}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(review.createdAt).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    {renderStars(review.rating)}
                  </div>
                  
                  {review.comment && (
                    <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    </DashboardLayout>
  );
}
