'use client';

export default function BankTransferInfo() {
  const bankInfo = {
    bankName: 'みずほ銀行',
    branchName: '渋谷支店',
    branchCode: '123',
    accountType: '普通',
    accountNumber: '1234567',
    accountHolder: 'カ）イーエスエスシー',
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label}をコピーしました`);
  };

  return (
    <div className="border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">振込先情報</h2>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-start space-x-2">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">振込時の注意事項</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>振込人名義は登録している会社名と一致させてください</li>
              <li>振込手数料はご負担ください</li>
              <li>振込後は必ず証明書をアップロードしてください</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center py-2 border-b">
          <span className="text-sm text-gray-600">銀行名</span>
          <div className="flex items-center space-x-2">
            <span className="font-medium">{bankInfo.bankName}</span>
            <button
              onClick={() => copyToClipboard(bankInfo.bankName, '銀行名')}
              className="text-gray-400 hover:text-gray-600"
              title="コピー"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center py-2 border-b">
          <span className="text-sm text-gray-600">支店名</span>
          <div className="flex items-center space-x-2">
            <span className="font-medium">{bankInfo.branchName}</span>
            <button
              onClick={() => copyToClipboard(bankInfo.branchName, '支店名')}
              className="text-gray-400 hover:text-gray-600"
              title="コピー"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center py-2 border-b">
          <span className="text-sm text-gray-600">支店コード</span>
          <div className="flex items-center space-x-2">
            <span className="font-medium">{bankInfo.branchCode}</span>
            <button
              onClick={() => copyToClipboard(bankInfo.branchCode, '支店コード')}
              className="text-gray-400 hover:text-gray-600"
              title="コピー"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center py-2 border-b">
          <span className="text-sm text-gray-600">口座種別</span>
          <span className="font-medium">{bankInfo.accountType}</span>
        </div>

        <div className="flex justify-between items-center py-2 border-b">
          <span className="text-sm text-gray-600">口座番号</span>
          <div className="flex items-center space-x-2">
            <span className="font-medium">{bankInfo.accountNumber}</span>
            <button
              onClick={() => copyToClipboard(bankInfo.accountNumber, '口座番号')}
              className="text-gray-400 hover:text-gray-600"
              title="コピー"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center py-2">
          <span className="text-sm text-gray-600">口座名義</span>
          <div className="flex items-center space-x-2">
            <span className="font-medium">{bankInfo.accountHolder}</span>
            <button
              onClick={() => copyToClipboard(bankInfo.accountHolder, '口座名義')}
              className="text-gray-400 hover:text-gray-600"
              title="コピー"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <p className="text-xs text-yellow-800">
          <span className="font-medium">⚠️ 重要:</span> 振込後は必ず下記のフォームから振込証明書をアップロードしてください。
          証明書の確認が完了次第、支払い完了となります。
        </p>
      </div>
    </div>
  );
}
