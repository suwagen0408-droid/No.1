'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';

interface ProductData {
  product: {
    id: string;
    name: string;
    nameEn: string | null;
    description: string | null;
    mainImageUrl: string | null;
    category: string;
    retailPrice: number;
    ecUrl: string | null;
    manufacturer: {
      companyName: string;
      logoUrl: string | null;
    };
  };
  facility: {
    facilityName: string;
    facilityType: string;
    address: string | null;
  } | null;
  campaign: {
    name: string;
    description: string | null;
  } | null;
  qrCode: {
    id: string;
  };
}

export default function ProductLandingPage() {
  const params = useParams();
  const qrId = params.qrId as string;
  const [data, setData] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanEventId, setScanEventId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProductData = async () => {
      try {
        const response = await fetch(`/api/product/${qrId}`);
        if (!response.ok) {
          throw new Error('商品情報の取得に失敗しました');
        }
        const result = await response.json();
        setData(result);
        
        // Record scan event
        try {
          const scanResponse = await fetch('/api/events/scan', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              qrCodeId: qrId,
              userAgent: navigator.userAgent,
              ipAddress: '', // Will be handled by server
            }),
          });
          
          if (scanResponse.ok) {
            const scanData = await scanResponse.json();
            setScanEventId(scanData.scanEvent?.id);
            console.log('Scan event recorded:', scanData.scanEvent?.id);
          }
        } catch (scanError) {
          console.error('Failed to record scan event:', scanError);
          // Don't block the UI if scan recording fails
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラー');
      } finally {
        setLoading(false);
      }
    };

    if (qrId) {
      fetchProductData();
    }
  }, [qrId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">エラー</h1>
          <p className="text-gray-600">{error || 'データが見つかりません'}</p>
        </div>
      </div>
    );
  }

  const { product, facility, campaign } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-t-2xl shadow-lg p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {product.manufacturer.logoUrl && (
                <Image
                  src={product.manufacturer.logoUrl}
                  alt={product.manufacturer.companyName}
                  width={60}
                  height={60}
                  className="rounded-lg"
                />
              )}
              <div>
                <p className="text-sm text-gray-500">提供元</p>
                <h2 className="text-lg font-semibold text-gray-800">
                  {product.manufacturer.companyName}
                </h2>
              </div>
            </div>
            {campaign && (
              <div className="text-right">
                <p className="text-sm text-gray-500">キャンペーン</p>
                <p className="text-sm font-medium text-blue-600">{campaign.name}</p>
              </div>
            )}
          </div>
        </div>

        {/* Product Image */}
        <div className="bg-white shadow-lg">
          {product.mainImageUrl ? (
            <div className="relative h-96 w-full">
              <Image
                src={product.mainImageUrl}
                alt={product.name}
                fill
                className="object-contain"
              />
            </div>
          ) : (
            <div className="h-96 flex items-center justify-center bg-gray-100">
              <p className="text-gray-400">画像なし</p>
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="bg-white rounded-b-2xl shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
          {product.nameEn && (
            <p className="text-lg text-gray-500 mb-4">{product.nameEn}</p>
          )}

          <div className="flex items-center space-x-4 mb-6">
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {product.category}
            </span>
            <span className="text-2xl font-bold text-green-600">
              ¥{product.retailPrice.toLocaleString()}
            </span>
          </div>

          {product.description && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">商品説明</h3>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                {product.description}
              </p>
            </div>
          )}

          {facility && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">設置施設</h3>
              <p className="text-gray-700 font-medium">{facility.facilityName}</p>
              {facility.address && (
                <p className="text-gray-600 text-sm mt-1">{facility.address}</p>
              )}
            </div>
          )}

          {campaign?.description && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                キャンペーン詳細
              </h3>
              <p className="text-gray-600 leading-relaxed">{campaign.description}</p>
            </div>
          )}

          {/* CTA Button */}
          {product.ecUrl && (
            <div className="mt-8">
              <a
                href={product.ecUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={async (e) => {
                  // Record click event
                  try {
                    await fetch('/api/events/click', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        qrCodeId: qrId,
                        productId: product.id,
                        scanEventId: scanEventId,
                        userAgent: navigator.userAgent,
                      }),
                    });
                    console.log('Click event recorded');
                  } catch (clickError) {
                    console.error('Failed to record click event:', clickError);
                  }
                }}
                className="block w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                🛒 この商品を購入する
              </a>
              <p className="text-center text-sm text-gray-500 mt-2">
                外部サイトに移動します
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>ESSC Platform - 体験サンプリング連携システム</p>
        </div>
      </div>
    </div>
  );
}
