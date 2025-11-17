'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';

interface ProductData {
  product: {
    id: string;
    name: string;
    nameEn?: string;
    description?: string;
    mainImageUrl?: string;
    additionalImageUrls?: string[];
    category: string;
    retailPrice: number;
    ecUrl: string;
    features?: string[];
    manufacturer: {
      companyName: string;
      logoUrl?: string;
    };
  };
  facility: {
    facilityName: string;
    facilityType: string;
    address?: string;
  };
  campaign?: {
    name: string;
    description?: string;
  };
  qrCode: {
    id: string;
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

export default function ProductLandingPage() {
  const params = useParams();
  const qrId = params.qrId as string;
  const [data, setData] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scanEventId, setScanEventId] = useState<string | null>(null);

  useEffect(() => {
    if (qrId) {
      loadProductData();
      recordScanEvent();
    }
  }, [qrId]);

  const loadProductData = async () => {
    try {
      const response = await fetch(`/api/product/${qrId}`);
      
      if (!response.ok) {
        setError('商品情報が見つかりません');
        setLoading(false);
        return;
      }

      const productData = await response.json();
      setData(productData);
    } catch (err) {
      console.error('Error loading product:', err);
      setError('商品情報の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const recordScanEvent = async () => {
    try {
      const response = await fetch('/api/events/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          qrCodeId: qrId,
          userAgent: navigator.userAgent,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setScanEventId(data.scanEvent.id);
      }
    } catch (err) {
      console.error('Error recording scan:', err);
    }
  };

  const handlePurchaseClick = async () => {
    if (!data) return;

    try {
      // Record click event
      const response = await fetch('/api/events/click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          qrCodeId: qrId,
          productId: data.product.id,
          scanEventId,
          userAgent: navigator.userAgent,
        }),
      });

      if (response.ok) {
        const clickData = await response.json();
        // Redirect to EC site
        window.location.href = clickData.redirectUrl;
      }
    } catch (err) {
      console.error('Error recording click:', err);
      // Still redirect even if tracking fails
      window.location.href = data.product.ecUrl;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">😔</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            商品が見つかりません
          </h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-blue-600"></div>
              <span className="text-xl font-bold text-gray-900">ESSC</span>
            </div>
            {data.manufacturer.logoUrl && (
              <img
                src={data.manufacturer.logoUrl}
                alt={data.manufacturer.companyName}
                className="h-8 object-contain"
              />
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Product Images */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
          {data.product.mainImageUrl && (
            <div className="relative w-full h-96 bg-gray-100">
              <img
                src={data.product.mainImageUrl}
                alt={data.product.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          {data.product.additionalImageUrls && data.product.additionalImageUrls.length > 0 && (
            <div className="flex overflow-x-auto p-4 space-x-4">
              {data.product.additionalImageUrls.map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`${data.product.name} ${index + 1}`}
                  className="h-24 w-24 object-cover rounded flex-shrink-0"
                />
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="mb-4">
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
              {CATEGORY_LABELS[data.product.category] || data.product.category}
            </span>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {data.product.name}
          </h1>
          
          {data.product.nameEn && (
            <p className="text-lg text-gray-600 mb-4">{data.product.nameEn}</p>
          )}

          <div className="flex items-baseline mb-6">
            <span className="text-4xl font-bold text-gray-900">
              ¥{data.product.retailPrice.toLocaleString()}
            </span>
            <span className="ml-2 text-gray-600">（税込）</span>
          </div>

          {data.product.description && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">商品説明</h2>
              <p className="text-gray-700 whitespace-pre-wrap">
                {data.product.description}
              </p>
            </div>
          )}

          {data.product.features && data.product.features.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">特徴</h2>
              <ul className="space-y-2">
                {data.product.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <svg
                      className="w-5 h-5 text-green-500 mr-2 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="border-t pt-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">メーカー</h3>
            <p className="text-gray-700">{data.manufacturer.companyName}</p>
          </div>

          {/* Purchase Button */}
          <button
            onClick={handlePurchaseClick}
            className="w-full bg-blue-600 text-white font-bold py-4 px-6 rounded-lg hover:bg-blue-700 transition-colors text-lg"
          >
            購入する →
          </button>

          <p className="text-center text-sm text-gray-500 mt-4">
            ※ メーカーのECサイトに移動します
          </p>
        </div>

        {/* Facility Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            体験した施設
          </h2>
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {data.facility.facilityName}
              </h3>
              <p className="text-sm text-gray-600">{data.facility.facilityType}</p>
              {data.facility.address && (
                <p className="text-sm text-gray-500 mt-1">{data.facility.address}</p>
              )}
            </div>
          </div>
        </div>

        {/* Campaign Info */}
        {data.campaign && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              キャンペーン情報
            </h2>
            <h3 className="font-medium text-gray-800 mb-2">{data.campaign.name}</h3>
            {data.campaign.description && (
              <p className="text-sm text-gray-600">{data.campaign.description}</p>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center">
          <p className="text-sm text-gray-600">
            Powered by ESSC Platform - 体験型広告プラットフォーム
          </p>
        </div>
      </footer>
    </div>
  );
}
