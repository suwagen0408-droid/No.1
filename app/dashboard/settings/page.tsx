'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }

    const userData = JSON.parse(userStr);
    setUser(userData);
    setLoading(false);
  }, [router]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('新しいパスワードが一致しません');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      alert('パスワードは6文字以上にしてください');
      return;
    }

    setSaving(true);
    try {
      // Password change API would go here
      alert('パスワード変更機能は実装予定です');
    } catch (error) {
      console.error('Error changing password:', error);
      alert('パスワードの変更に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  if (!user) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <DashboardLayout user={user}>
      <div className="bg-white rounded-lg shadow">
        <div className="border-b px-6 py-6">
          <h1 className="text-3xl font-bold text-gray-900">設定</h1>
          <p className="mt-2 text-gray-600">
            アカウント設定を管理します
          </p>
        </div>

        <div className="px-6 py-8 space-y-8">
          {/* Account Info */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              アカウント情報
            </h2>
            <div className="bg-gray-50 rounded-lg p-6 space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">
                  メールアドレス
                </label>
                <p className="text-gray-900">{user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  ロール
                </label>
                <p className="text-gray-900">
                  {user.role === 'manufacturer' && 'メーカー'}
                  {user.role === 'facility' && '施設'}
                  {user.role === 'admin' && '管理者'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  ステータス
                </label>
                <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                  user.status === 'active' 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {user.status === 'active' ? '有効' : '審査中'}
                </span>
              </div>
            </div>
          </div>

          {/* Password Change */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              パスワード変更
            </h2>
            <form onSubmit={handlePasswordChange} className="bg-gray-50 rounded-lg p-6 space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  現在のパスワード
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  新しいパスワード
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  新しいパスワード（確認）
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '変更中...' : 'パスワードを変更'}
              </button>
            </form>
          </div>

          {/* Danger Zone */}
          <div>
            <h2 className="text-xl font-semibold text-red-900 mb-4">
              危険な操作
            </h2>
            <div className="border-2 border-red-200 rounded-lg p-6 bg-red-50">
              <h3 className="font-semibold text-red-900 mb-2">
                アカウント削除
              </h3>
              <p className="text-sm text-red-700 mb-4">
                アカウントを削除すると、すべてのデータが失われます。この操作は取り消せません。
              </p>
              <button
                onClick={() => alert('アカウント削除機能は実装予定です')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
              >
                アカウントを削除
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
