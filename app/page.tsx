import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600"></div>
            <span className="text-xl font-bold text-gray-900">ESSC</span>
          </div>
          <nav className="flex items-center space-x-6">
            <Link href="/login" className="text-gray-600 hover:text-gray-900">
              ログイン
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              新規登録
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="mb-6 text-5xl font-bold text-gray-900">
            体験型広告プラットフォーム
          </h1>
          <p className="mb-8 text-xl text-gray-600">
            メーカー・施設・消費者をつなぐ、新しい商品体験の形
          </p>
          
          <div className="flex justify-center space-x-4">
            <Link
              href="/signup?role=manufacturer"
              className="rounded-lg bg-blue-600 px-8 py-3 text-lg font-semibold text-white hover:bg-blue-700"
            >
              メーカーとして登録
            </Link>
            <Link
              href="/signup?role=facility"
              className="rounded-lg border-2 border-blue-600 px-8 py-3 text-lg font-semibold text-blue-600 hover:bg-blue-50"
            >
              施設として登録
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mx-auto mt-20 grid max-w-6xl gap-8 md:grid-cols-3">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="mb-4 h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-semibold">メーカー向け</h3>
            <p className="text-gray-600">
              商品を施設に無償/原価提供。実際の利用データと購入データで効果を計測。
            </p>
          </div>

          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="mb-4 h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-semibold">施設向け</h3>
            <p className="text-gray-600">
              無料で高品質なアメニティを導入。顧客満足度向上とコスト削減を同時に実現。
            </p>
          </div>

          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="mb-4 h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-semibold">消費者向け</h3>
            <p className="text-gray-600">
              実際に使って気に入った商品を、QRコードからすぐにオンライン購入可能。
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mx-auto mt-20 max-w-4xl">
          <div className="rounded-lg bg-white p-8 shadow-sm">
            <div className="grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600">-</div>
                <div className="mt-2 text-gray-600">登録メーカー数</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600">-</div>
                <div className="mt-2 text-gray-600">登録施設数</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600">-</div>
                <div className="mt-2 text-gray-600">アクティブキャンペーン</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>&copy; 2024 ESSC Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
