'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  role: 'manufacturer' | 'facility' | 'admin';
  status: string;
  profile?: any;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check if user is logged in
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }

    const userData = JSON.parse(userStr);
    
    // Redirect manufacturer to their dedicated dashboard
    if (userData.role === 'manufacturer') {
      router.push('/dashboard/manufacturer');
      return;
    }
    
    // Redirect facility to their dedicated dashboard
    if (userData.role === 'facility') {
      router.push('/dashboard/facility');
      return;
    }

    setUser(userData);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600"></div>
            <span className="text-xl font-bold text-gray-900">ESSC</span>
          </Link>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{user.email}</span>
            <button
              onClick={handleLogout}
              className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar + Main Content */}
      <div className="container mx-auto flex px-4 py-6">
        {/* Sidebar */}
        <aside className="w-64 rounded-lg bg-white p-4 shadow-sm">
          <nav className="space-y-2">
            <Link
              href="/dashboard"
              className="block rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600"
            >
              ダッシュボード
            </Link>
            
            {user.role === 'manufacturer' && (
              <>
                <Link
                  href="/dashboard/products"
                  className="block rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  商品管理
                </Link>
                <Link
                  href="/dashboard/campaigns"
                  className="block rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  キャンペーン
                </Link>
                <Link
                  href="/dashboard/reports"
                  className="block rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  レポート
                </Link>
              </>
            )}

            {user.role === 'facility' && (
              <>
                <Link
                  href="/dashboard/campaigns"
                  className="block rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  キャンペーン一覧
                </Link>
                <Link
                  href="/dashboard/placements"
                  className="block rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  導入商品
                </Link>
                <Link
                  href="/dashboard/qrcodes"
                  className="block rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  QRコード
                </Link>
              </>
            )}

            {user.role === 'admin' && (
              <>
                <Link
                  href="/dashboard/approvals"
                  className="block rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  承認管理
                </Link>
                <Link
                  href="/dashboard/analytics"
                  className="block rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  全体分析
                </Link>
              </>
            )}

            <Link
              href="/dashboard/settings"
              className="block rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              設定
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="ml-6 flex-1">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h1 className="mb-6 text-2xl font-bold text-gray-900">
              ダッシュボード
            </h1>

            {/* Welcome Message */}
            <div className="mb-6 rounded-lg bg-blue-50 p-4">
              <h2 className="font-semibold text-blue-900">
                {user.role === 'manufacturer' && 'メーカー'}
                {user.role === 'facility' && '施設'}
                {user.role === 'admin' && '管理者'}
                アカウントでログイン中
              </h2>
              <p className="mt-1 text-sm text-blue-700">
                {user.profile?.companyName || user.profile?.facilityName || user.email}
              </p>
            </div>

            {/* Status Check */}
            {user.status === 'pending' && (
              <div className="mb-6 rounded-lg bg-yellow-50 p-4">
                <h3 className="font-semibold text-yellow-900">審査中</h3>
                <p className="mt-1 text-sm text-yellow-700">
                  管理者による審査が完了するまでお待ちください。承認後、全ての機能がご利用いただけます。
                </p>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-lg border p-4">
                <div className="text-sm font-medium text-gray-600">
                  {user.role === 'manufacturer' && '登録商品数'}
                  {user.role === 'facility' && '導入キャンペーン数'}
                  {user.role === 'admin' && '登録ユーザー数'}
                </div>
                <div className="mt-2 text-3xl font-bold text-gray-900">0</div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="text-sm font-medium text-gray-600">
                  {user.role === 'manufacturer' && 'アクティブキャンペーン'}
                  {user.role === 'facility' && 'QRスキャン数'}
                  {user.role === 'admin' && 'アクティブキャンペーン'}
                </div>
                <div className="mt-2 text-3xl font-bold text-gray-900">0</div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="text-sm font-medium text-gray-600">
                  {user.role === 'manufacturer' && 'QRスキャン数'}
                  {user.role === 'facility' && '在庫アラート'}
                  {user.role === 'admin' && '承認待ち'}
                </div>
                <div className="mt-2 text-3xl font-bold text-gray-900">0</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-8">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                クイックアクション
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {user.role === 'manufacturer' && (
                  <>
                    <Link
                      href="/dashboard/products/new"
                      className="rounded-lg border-2 border-dashed border-gray-300 p-4 text-center hover:border-blue-500 hover:bg-blue-50"
                    >
                      <div className="text-sm font-medium text-gray-700">
                        新しい商品を登録
                      </div>
                    </Link>
                    <Link
                      href="/dashboard/campaigns/new"
                      className="rounded-lg border-2 border-dashed border-gray-300 p-4 text-center hover:border-blue-500 hover:bg-blue-50"
                    >
                      <div className="text-sm font-medium text-gray-700">
                        キャンペーンを作成
                      </div>
                    </Link>
                  </>
                )}

                {user.role === 'facility' && (
                  <>
                    <Link
                      href="/dashboard/campaigns"
                      className="rounded-lg border-2 border-dashed border-gray-300 p-4 text-center hover:border-blue-500 hover:bg-blue-50"
                    >
                      <div className="text-sm font-medium text-gray-700">
                        キャンペーンを探す
                      </div>
                    </Link>
                    <Link
                      href="/dashboard/qrcodes"
                      className="rounded-lg border-2 border-dashed border-gray-300 p-4 text-center hover:border-blue-500 hover:bg-blue-50"
                    >
                      <div className="text-sm font-medium text-gray-700">
                        QRコードを生成
                      </div>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
