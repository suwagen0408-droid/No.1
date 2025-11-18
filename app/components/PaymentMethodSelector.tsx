'use client';

interface PaymentMethodSelectorProps {
  onSelect: (method: 'stripe' | 'bank_transfer') => void;
}

export default function PaymentMethodSelector({ onSelect }: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-3">
      <button
        onClick={() => onSelect('stripe')}
        className="w-full border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition-all group"
      >
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div className="flex-1 text-left">
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">
              クレジットカード決済
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              即時決済・コンビニ払いにも対応
            </p>
            <div className="flex items-center space-x-2 mt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                推奨
              </span>
              <span className="text-xs text-gray-500">
                Stripe決済
              </span>
            </div>
          </div>
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </button>

      <button
        onClick={() => onSelect('bank_transfer')}
        className="w-full border-2 border-gray-200 rounded-lg p-4 hover:border-green-500 hover:bg-green-50 transition-all group"
      >
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
          </div>
          <div className="flex-1 text-left">
            <h3 className="font-semibold text-gray-900 group-hover:text-green-600">
              銀行振込
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              振込後に証明書をアップロード
            </p>
            <div className="flex items-center space-x-2 mt-2">
              <span className="text-xs text-gray-500">
                管理者確認後に完了
              </span>
            </div>
          </div>
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-gray-400 group-hover:text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </button>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs text-gray-600">
            <p className="font-medium mb-1">支払方法について</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>クレジットカード: 即時決済で処理が早い（推奨）</li>
              <li>銀行振込: 振込証明の確認に1-2営業日かかります</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
