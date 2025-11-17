'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  tagline?: string;
  description?: string;
  retailPrice: number;
  ecUrl: string;
  mainImageUrl?: string;
  manufacturer: {
    companyName: string;
    websiteUrl?: string;
  };
}

interface Review {
  id: string;
  rating: number;
  comment?: string;
  nickname?: string;
  createdAt: string;
  facility?: {
    facilityName: string;
  };
}

function ProductLandingContent() {
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState({ averageRating: 0, totalReviews: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Review form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: '',
    nickname: '',
  });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');

  useEffect(() => {
    loadProduct();
    loadReviews();
  }, [productId]);

  const loadProduct = async () => {
    try {
      const response = await fetch(`/api/products/${productId}`);
      if (response.ok) {
        const data = await response.json();
        setProduct(data.product);
        setReviewStats(data.reviewStats);
      } else {
        setError('商品が見つかりません');
      }
    } catch (err) {
      setError('商品情報の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async () => {
    try {
      const response = await fetch(`/api/products/${productId}/reviews`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews);
      }
    } catch (err) {
      console.error('レビューの読み込みエラー:', err);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReview(true);
    setReviewMessage('');

    try {
      const response = await fetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewForm),
      });

      const data = await response.json();

      if (response.ok) {
        setReviewMessage(data.message);
        setReviewForm({ rating: 5, comment: '', nickname: '' });
        setShowReviewForm(false);
      } else {
        setReviewMessage(data.error || 'レビューの投稿に失敗しました');
      }
    } catch (err) {
      setReviewMessage('レビューの投稿に失敗しました');
    } finally {
      setSubmittingReview(false);
    }
  };

  const renderStars = (rating: number, size: 'small' | 'large' = 'small') => {
    const sizeClass = size === 'large' ? 'text-2xl' : 'text-base';
    return (
      <div className={`flex ${sizeClass}`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={star <= rating ? 'text-yellow-400' : 'text-gray-300'}>
            ★
          </span>
        ))}
      </div>
    );
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>;
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{error || '商品が見つかりません'}</h1>
          <Link href="/" className="text-blue-600 hover:text-blue-700">
            トップページに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 pb-12">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600"></div>
            <span className="text-xl font-bold text-gray-900">ESSC</span>
          </Link>
        </div>
      </header>

      {/* Product Details */}
      <main className="container mx-auto px-4 py-8 overflow-visible">
        <div className="mx-auto max-w-4xl overflow-visible">
          <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Product Image */}
              <div>
                {product.mainImageUrl ? (
                  <img
                    src={product.mainImageUrl}
                    alt={product.name}
                    className="w-full h-auto rounded-lg"
                  />
                ) : (
                  <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-gray-400">画像なし</span>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
                {product.tagline && (
                  <p className="text-lg text-gray-600 mb-4">{product.tagline}</p>
                )}

                {/* Rating */}
                <div className="flex items-center space-x-2 mb-4">
                  {renderStars(Math.round(reviewStats.averageRating), 'large')}
                  <span className="text-lg font-semibold">{reviewStats.averageRating}</span>
                  <span className="text-gray-600">({reviewStats.totalReviews} レビュー)</span>
                </div>

                <div className="mb-6">
                  <span className="text-3xl font-bold text-gray-900">
                    ¥{product.retailPrice.toLocaleString()}
                  </span>
                </div>

                {/* Purchase Button */}
                <a
                  href={product.ecUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-blue-600 text-white text-center py-4 rounded-lg font-bold text-lg hover:bg-blue-700 mb-4"
                >
                  購入する →
                </a>

                {/* Manufacturer */}
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600 mb-1">販売元</p>
                  <p className="font-semibold text-gray-900">{product.manufacturer.companyName}</p>
                </div>

                {/* Review Link */}
                <div className="mt-4 pt-4 border-t">
                  <a
                    href="#reviews"
                    className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    ⭐ レビューを見る / 書く →
                  </a>
                </div>
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div className="mt-8 border-t pt-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">商品説明</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{product.description}</p>
              </div>
            )}
          </div>

          {/* Reviews Section */}
          <div id="reviews" className="bg-white rounded-lg shadow-sm p-4 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                カスタマーレビュー ({reviewStats.totalReviews})
              </h2>
              <button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium w-full sm:w-auto"
              >
                {showReviewForm ? 'キャンセル' : 'レビューを書く'}
              </button>
            </div>

            {/* Review Success Message */}
            {reviewMessage && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                {reviewMessage}
              </div>
            )}

            {/* Review Form */}
            {showReviewForm && (
              <form onSubmit={handleSubmitReview} className="mb-8 p-6 bg-gray-50 rounded-lg">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    評価 *
                  </label>
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                        className="text-3xl focus:outline-none"
                      >
                        <span className={star <= reviewForm.rating ? 'text-yellow-400' : 'text-gray-300'}>
                          ★
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    コメント
                  </label>
                  <textarea
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    maxLength={1000}
                    placeholder="商品についてのご感想をお聞かせください"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ニックネーム（任意）
                  </label>
                  <input
                    type="text"
                    value={reviewForm.nickname}
                    onChange={(e) => setReviewForm({ ...reviewForm, nickname: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    maxLength={50}
                    placeholder="表示名"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {submittingReview ? '投稿中...' : 'レビューを投稿'}
                </button>
              </form>
            )}

            {/* Reviews List */}
            <div className="space-y-6">
              {reviews.length === 0 ? (
                <p className="text-center text-gray-500 py-8">まだレビューがありません</p>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="border-b pb-6 last:border-b-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          {renderStars(review.rating)}
                          <span className="font-semibold text-gray-900">
                            {review.nickname || '匿名'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(review.createdAt).toLocaleDateString('ja-JP')}
                        </p>
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-gray-700 mt-2">{review.comment}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ProductLandingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">読み込み中...</div>}>
      <ProductLandingContent />
    </Suspense>
  );
}
