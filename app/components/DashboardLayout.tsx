'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
  user: {
    id: string;
    email: string;
    role: 'manufacturer' | 'facility' | 'admin';
    profile?: any;
  };
}

export default function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600"></div>
            <span className="text-xl font-bold text-gray-900">ESSC</span>
          </Link>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {user.profile?.companyName || user.profile?.facilityName || user.email}
            </span>
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
        <aside className="w-64 rounded-lg bg-white p-4 shadow-sm h-fit sticky top-20">
          <nav className="space-y-2">
            <Link
              href={
                user.role === 'manufacturer'
                  ? '/dashboard/manufacturer'
                  : user.role === 'facility'
                  ? '/dashboard/facility'
                  : '/dashboard'
              }
              className="block rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600"
            >
              ダッシュボード
            </Link>

            {user.role === 'manufacturer' && (
              <>
                <Link
                  href="/dashboard/products"
                  className="block rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                >
                  商品管理
                </Link>
                <Link
                  href="/dashboard/campaigns/new"
                  className="block rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                >
                  キャンペーン作成
                </Link>
                <Link
                  href="/dashboard/reports"
                  className="block rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                >
                  レポート
                </Link>
              </>
            )}

            {user.role === 'facility' && (
              <>
                <Link
                  href="/dashboard/campaigns"
                  className="block rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                >
                  キャンペーン一覧
                </Link>
                <Link
                  href="/dashboard/placements"
                  className="block rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                >
                  導入商品
                </Link>
                <Link
                  href="/dashboard/qrcodes"
                  className="block rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                >
                  QRコード
                </Link>
              </>
            )}

            {user.role === 'admin' && (
              <>
                <Link
                  href="/dashboard/approvals"
                  className="block rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                >
                  承認管理
                </Link>
                <Link
                  href="/dashboard/analytics"
                  className="block rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                >
                  全体分析
                </Link>
              </>
            )}

            <Link
              href="/dashboard/settings"
              className="block rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600"
            >
              設定
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="ml-6 flex-1">{children}</main>
      </div>
    </div>
  );
}
