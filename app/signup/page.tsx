'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = searchParams.get('role') || 'manufacturer';

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: defaultRole as 'manufacturer' | 'facility',
    companyName: '',
    facilityName: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    if (formData.password.length < 8) {
      setError('パスワードは8文字以上で入力してください');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          role: formData.role,
          companyName: formData.role === 'manufacturer' ? formData.companyName : undefined,
          facilityName: formData.role === 'facility' ? formData.facilityName : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '登録に失敗しました');
      }

      alert(data.message);
      router.push('/login');
    } catch (err: any) {
      setError(err.message || '登録中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600"></div>
            <span className="text-xl font-bold text-gray-900">ESSC</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-md">
          <div className="rounded-lg bg-white p-8 shadow-sm">
            <h1 className="mb-6 text-2xl font-bold text-gray-900">新規登録</h1>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Role Selection */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  登録種別
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'manufacturer' })}
                    className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                      formData.role === 'manufacturer'
                        ? 'border-blue-600 bg-blue-50 text-blue-600'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    メーカー
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'facility' })}
                    className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                      formData.role === 'facility'
                        ? 'border-blue-600 bg-blue-50 text-blue-600'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    施設
                  </button>
                </div>
              </div>

              {/* Company/Facility Name */}
              {formData.role === 'manufacturer' ? (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    会社名
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) =>
                      setFormData({ ...formData, companyName: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                    placeholder="株式会社◯◯"
                  />
                </div>
              ) : (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    施設名
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.facilityName}
                    onChange={(e) =>
                      setFormData({ ...formData, facilityName: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                    placeholder="ホテル◯◯"
                  />
                </div>
              )}

              {/* Email */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  メールアドレス
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="example@company.com"
                />
              </div>

              {/* Password */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  パスワード（8文字以上）
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  パスワード（確認）
                </label>
                <input
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? '登録中...' : '登録する'}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-gray-600">
              既にアカウントをお持ちの方は
              <Link href="/login" className="text-blue-600 hover:underline">
                ログイン
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
