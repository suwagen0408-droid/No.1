'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        // Show reset link in development mode
        if (data.resetUrl) {
          console.log('Development Reset URL:', data.resetUrl);
        }
      } else {
        // Even on error, show success message to prevent email enumeration
        setSuccess(true);
      }
    } catch (error) {
      setError('ネットワークエラーが発生しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-blue-600 mb-2">ESSC Platform</h1>
          </div>

          {/* Success Card */}
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                メールを送信しました
              </h2>
              <p className="text-gray-600 mb-6">
                パスワードリセットの手順を記載したメールを送信しました。
                <br />
                メールをご確認ください。
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left mb-6">
                <p className="text-sm text-blue-800">
                  <strong className="block mb-2">📧 次のステップ:</strong>
                </p>
                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                  <li>メールボックスを確認してください</li>
                  <li>「パスワードリセット」のメールを開く</li>
                  <li>メール内のリンクをクリック</li>
                  <li>新しいパスワードを設定</li>
                </ol>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                メールが届かない場合は、迷惑メールフォルダもご確認ください。
                <br />
                リンクの有効期限は1時間です。
              </p>
              <Link
                href="/login"
                className="inline-block w-full py-3 px-4 border border-transparent rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-medium transition-colors"
              >
                ログインページに戻る
              </Link>
            </div>
          </div>

          {/* Resend */}
          <div className="text-center">
            <button
              onClick={() => {
                setSuccess(false);
                setEmail('');
              }}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              別のメールアドレスで再送信
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-blue-600 mb-2">ESSC Platform</h1>
          <h2 className="text-2xl font-bold text-gray-900">パスワードをお忘れですか？</h2>
          <p className="mt-2 text-sm text-gray-600">
            登録されているメールアドレスを入力してください。
            <br />
            パスワードリセット用のリンクをお送りします。
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="example@company.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 border border-transparent rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'メール送信中...' : 'リセットリンクを送信'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <Link href="/login" className="block text-sm text-blue-600 hover:text-blue-800">
              ← ログインページに戻る
            </Link>
            <p className="text-xs text-gray-500">
              アカウントをお持ちでない方は
              {' '}
              <Link href="/signup" className="text-blue-600 hover:text-blue-800 underline">
                新規登録
              </Link>
            </p>
          </div>
        </div>

        {/* Security Info */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <svg
              className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">セキュリティについて</p>
              <p className="text-xs">
                パスワードリセットのリンクは、セキュリティ保護のため1時間で無効になります。
                万が一、このリクエストに心当たりがない場合は、このメールを無視してください。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
