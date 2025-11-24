'use client';

import { useState } from 'react';

interface BankTransferUploadFormProps {
  invoiceId: string;
  onUploadComplete: () => void;
  onCancel: () => void;
}

export default function BankTransferUploadForm({
  invoiceId,
  onUploadComplete,
  onCancel,
}: BankTransferUploadFormProps) {
  const [transferDate, setTransferDate] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setError('JPG、PNG、WEBP、またはPDFファイルのみアップロード可能です');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('ファイルサイズは5MB以下にしてください');
      return;
    }

    setError(null);
    setProofFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!transferDate) {
      setError('振込日を入力してください');
      return;
    }

    if (!proofFile) {
      setError('振込証明書をアップロードしてください');
      return;
    }

    setUploading(true);

    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        throw new Error('ログインが必要です');
      }

      const userData = JSON.parse(userStr);

      // Create FormData
      const formData = new FormData();
      formData.append('invoiceId', invoiceId);
      formData.append('transferDate', transferDate);
      formData.append('transferNote', transferNote);
      formData.append('proofFile', proofFile);

      const response = await fetch('/api/payments/bank-transfer/upload-proof', {
        method: 'POST',
        headers: {
          'x-user-id': userData.id,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message || '振込証明書をアップロードしました。管理者の確認をお待ちください。');
        onUploadComplete();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'アップロードに失敗しました');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError('アップロードに失敗しました。もう一度お試しください。');
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setProofFile(null);
    setPreviewUrl(null);
    setError(null);
  };

  return (
    <div className="border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">振込証明書のアップロード</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Transfer Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            振込日 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={transferDate}
            onChange={(e) => setTransferDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Note */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            備考（任意）
          </label>
          <textarea
            value={transferNote}
            onChange={(e) => setTransferNote(e.target.value)}
            rows={3}
            placeholder="振込に関するメモがあれば記入してください"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            振込証明書 <span className="text-red-500">*</span>
          </label>
          <div className="mt-1">
            {!proofFile ? (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg
                    className="w-8 h-8 mb-2 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="mb-1 text-sm text-gray-600">
                    <span className="font-semibold">クリックしてアップロード</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    JPG, PNG, WEBP, PDF (最大5MB)
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <svg
                      className="w-5 h-5 text-green-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">
                      {proofFile.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    削除
                  </button>
                </div>
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="mt-2 max-w-full h-auto rounded border"
                  />
                )}
                {proofFile.type === 'application/pdf' && (
                  <div className="mt-2 bg-gray-50 rounded p-3 flex items-center justify-center">
                    <svg className="w-12 h-12 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                    <span className="ml-2 text-sm text-gray-600">PDFファイル</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            ネットバンキングのスクリーンショットまたは振込明細書の写真
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <svg
              className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="text-xs text-blue-800">
              <p className="font-medium mb-1">証明書について</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>振込日、振込先、金額が確認できるもの</li>
                <li>管理者の確認には1-2営業日かかります</li>
                <li>確認完了後、支払い完了となります</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-2">
          <button
            type="submit"
            disabled={uploading || !transferDate || !proofFile}
            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
          >
            {uploading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                アップロード中...
              </span>
            ) : (
              '📤 証明書を提出する'
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={uploading}
            className="px-4 py-3 text-gray-600 hover:text-gray-900 disabled:text-gray-400"
          >
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}
