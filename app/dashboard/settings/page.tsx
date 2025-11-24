'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';

const facilityTypes = [
  { value: 'hotel', label: 'ホテル' },
  { value: 'ryokan', label: '旅館' },
  { value: 'onsen', label: '温泉施設' },
  { value: 'cafe', label: 'カフェ' },
  { value: 'restaurant', label: 'レストラン' },
  { value: 'gym', label: 'ジム' },
  { value: 'salon', label: 'サロン' },
  { value: 'other', label: 'その他' },
];

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

  // Profile data
  const [facilityProfile, setFacilityProfile] = useState<any>(null);
  const [manufacturerProfile, setManufacturerProfile] = useState<any>(null);

  // Password data
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }

    const userData = JSON.parse(userStr);
    setUser(userData);

    // Load profile data based on role
    if (userData.role === 'facility') {
      await loadFacilityProfile(userData.id);
    } else if (userData.role === 'manufacturer') {
      await loadManufacturerProfile(userData.id);
    }

    setLoading(false);
  };

  const loadFacilityProfile = async (userId: string) => {
    try {
      const response = await fetch('/api/facility/profile', {
        headers: {
          'x-user-id': userId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFacilityProfile(data.facility);
      }
    } catch (error) {
      console.error('Error loading facility profile:', error);
    }
  };

  const loadManufacturerProfile = async (userId: string) => {
    try {
      const response = await fetch('/api/manufacturer/profile', {
        headers: {
          'x-user-id': userId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setManufacturerProfile(data.manufacturer);
      }
    } catch (error) {
      console.error('Error loading manufacturer profile:', error);
    }
  };

  const handleFacilityProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      console.log('Submitting facility profile:', facilityProfile);
      
      const response = await fetch('/api/facility/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify(facilityProfile),
      });

      if (response.ok) {
        alert('プロフィールを更新しました');
      } else {
        const error = await response.json();
        console.error('API error:', error);
        if (error.details) {
          const messages = error.details.map((d: any) => `${d.path.join('.')}: ${d.message}`).join('\n');
          alert(`バリデーションエラー:\n${messages}`);
        } else {
          alert(`エラー: ${error.error}`);
        }
      }
    } catch (error) {
      console.error('Error updating facility profile:', error);
      alert('プロフィールの更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleManufacturerProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch('/api/manufacturer/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify(manufacturerProfile),
      });

      if (response.ok) {
        alert('プロフィールを更新しました');
      } else {
        const error = await response.json();
        alert(`エラー: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating manufacturer profile:', error);
      alert('プロフィールの更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

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
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('パスワードを変更しました');
        // Clear form
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        alert(data.error || 'パスワードの変更に失敗しました');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      alert('パスワードの変更に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (!user || loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <DashboardLayout user={user}>
      <div className="bg-white rounded-lg shadow">
        <div className="border-b px-6 py-6">
          <h1 className="text-3xl font-bold text-gray-900">設定</h1>
          <p className="mt-2 text-gray-600">
            アカウント設定とプロフィールを管理します
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="px-6">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'profile'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                プロフィール
              </button>
              <button
                onClick={() => setActiveTab('password')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'password'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                パスワード変更
              </button>
            </nav>
          </div>
        </div>

        <div className="px-6 py-8">
          {activeTab === 'profile' && (
            <div className="space-y-8">
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

              {/* Facility Profile Form */}
              {user.role === 'facility' && facilityProfile && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    施設情報
                  </h2>
                  <form onSubmit={handleFacilityProfileSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Facility Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          施設名 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={facilityProfile.facilityName || ''}
                          onChange={(e) => setFacilityProfile({...facilityProfile, facilityName: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>

                      {/* Facility Name Kana */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          施設名（カナ）
                        </label>
                        <input
                          type="text"
                          value={facilityProfile.facilityNameKana || ''}
                          onChange={(e) => setFacilityProfile({...facilityProfile, facilityNameKana: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Facility Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          施設タイプ <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={facilityProfile.facilityType || ''}
                          onChange={(e) => setFacilityProfile({...facilityProfile, facilityType: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          {facilityTypes.map(type => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Postal Code */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          郵便番号
                        </label>
                        <input
                          type="text"
                          value={facilityProfile.postalCode || ''}
                          onChange={(e) => setFacilityProfile({...facilityProfile, postalCode: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="123-4567"
                        />
                      </div>

                      {/* Address */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          住所
                        </label>
                        <input
                          type="text"
                          value={facilityProfile.address || ''}
                          onChange={(e) => setFacilityProfile({...facilityProfile, address: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          電話番号
                        </label>
                        <input
                          type="tel"
                          value={facilityProfile.phone || ''}
                          onChange={(e) => setFacilityProfile({...facilityProfile, phone: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Website URL */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ウェブサイトURL
                        </label>
                        <input
                          type="url"
                          value={facilityProfile.websiteUrl || ''}
                          onChange={(e) => setFacilityProfile({...facilityProfile, websiteUrl: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="https://example.com"
                        />
                      </div>

                      {/* Total Rooms */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          客室数
                        </label>
                        <input
                          type="number"
                          value={facilityProfile.totalRooms || ''}
                          onChange={(e) => setFacilityProfile({...facilityProfile, totalRooms: parseInt(e.target.value) || null})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="0"
                        />
                      </div>

                      {/* Total Beds */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ベッド数
                        </label>
                        <input
                          type="number"
                          value={facilityProfile.totalBeds || ''}
                          onChange={(e) => setFacilityProfile({...facilityProfile, totalBeds: parseInt(e.target.value) || null})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="0"
                        />
                      </div>

                      {/* Avg Daily Guests */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          平均日間利用者数
                        </label>
                        <input
                          type="number"
                          value={facilityProfile.avgDailyGuests || ''}
                          onChange={(e) => setFacilityProfile({...facilityProfile, avgDailyGuests: parseInt(e.target.value) || null})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="0"
                        />
                      </div>

                      {/* Avg Monthly Guests */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          平均月間利用者数
                        </label>
                        <input
                          type="number"
                          value={facilityProfile.avgMonthlyGuests || ''}
                          onChange={(e) => setFacilityProfile({...facilityProfile, avgMonthlyGuests: parseInt(e.target.value) || null})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="0"
                        />
                      </div>

                      {/* Description */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          施設の説明
                        </label>
                        <textarea
                          value={facilityProfile.description || ''}
                          onChange={(e) => setFacilityProfile({...facilityProfile, description: e.target.value})}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                      >
                        {saving ? '保存中...' : '保存する'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Manufacturer Profile Form */}
              {user.role === 'manufacturer' && manufacturerProfile && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    メーカー情報
                  </h2>
                  <form onSubmit={handleManufacturerProfileSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Company Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          会社名 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={manufacturerProfile.companyName || ''}
                          onChange={(e) => setManufacturerProfile({...manufacturerProfile, companyName: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>

                      {/* Company Name Kana */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          会社名（カナ）
                        </label>
                        <input
                          type="text"
                          value={manufacturerProfile.companyNameKana || ''}
                          onChange={(e) => setManufacturerProfile({...manufacturerProfile, companyNameKana: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Representative Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          代表者名
                        </label>
                        <input
                          type="text"
                          value={manufacturerProfile.representativeName || ''}
                          onChange={(e) => setManufacturerProfile({...manufacturerProfile, representativeName: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Business License Number */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          事業者登録番号
                        </label>
                        <input
                          type="text"
                          value={manufacturerProfile.businessLicenseNumber || ''}
                          onChange={(e) => setManufacturerProfile({...manufacturerProfile, businessLicenseNumber: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Postal Code */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          郵便番号
                        </label>
                        <input
                          type="text"
                          value={manufacturerProfile.postalCode || ''}
                          onChange={(e) => setManufacturerProfile({...manufacturerProfile, postalCode: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="123-4567"
                        />
                      </div>

                      {/* Address */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          住所
                        </label>
                        <input
                          type="text"
                          value={manufacturerProfile.address || ''}
                          onChange={(e) => setManufacturerProfile({...manufacturerProfile, address: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          電話番号
                        </label>
                        <input
                          type="tel"
                          value={manufacturerProfile.phone || ''}
                          onChange={(e) => setManufacturerProfile({...manufacturerProfile, phone: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Website URL */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ウェブサイトURL
                        </label>
                        <input
                          type="url"
                          value={manufacturerProfile.websiteUrl || ''}
                          onChange={(e) => setManufacturerProfile({...manufacturerProfile, websiteUrl: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="https://example.com"
                        />
                      </div>

                      {/* Logo URL */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ロゴURL
                        </label>
                        <input
                          type="url"
                          value={manufacturerProfile.logoUrl || ''}
                          onChange={(e) => setManufacturerProfile({...manufacturerProfile, logoUrl: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="https://example.com/logo.png"
                        />
                      </div>

                      {/* Description */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          会社の説明
                        </label>
                        <textarea
                          value={manufacturerProfile.description || ''}
                          onChange={(e) => setManufacturerProfile({...manufacturerProfile, description: e.target.value})}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                      >
                        {saving ? '保存中...' : '保存する'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Admin has no profile form */}
              {user.role === 'admin' && (
                <div className="text-center py-12 text-gray-500">
                  管理者アカウントにはプロフィール設定はありません
                </div>
              )}
            </div>
          )}

          {activeTab === 'password' && (
            <div className="max-w-2xl">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                パスワード変更
              </h2>
              <form onSubmit={handlePasswordChange} className="bg-gray-50 rounded-lg p-6 space-y-4">
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

              {/* Danger Zone */}
              <div className="mt-8">
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
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
