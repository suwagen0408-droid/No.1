'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';

interface NotificationPreferences {
  emailEnabled: boolean;
  emailOnCampaignApproval: boolean;
  emailOnApplicationStatus: boolean;
  emailOnMessage: boolean;
  emailOnReview: boolean;
  emailOnPayment: boolean;
  pushEnabled: boolean;
  pushOnCampaignApproval: boolean;
  pushOnApplicationStatus: boolean;
  pushOnMessage: boolean;
  pushOnReview: boolean;
  pushOnPayment: boolean;
  dailyDigestEnabled: boolean;
  dailyDigestTime: string | null;
  weeklyDigestEnabled: boolean;
  weeklyDigestDay: number | null;
}

export default function NotificationSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }
    const userData = JSON.parse(userStr);
    setUser(userData);
  }, [router]);

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/notifications/preferences', {
        headers: {
          'x-user-id': user.id,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
      setMessage({ type: 'error', text: '設定の読み込みに失敗しました' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !preferences) return;

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify(preferences),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: '設定を保存しました' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.error || '設定の保存に失敗しました' });
      }
    } catch (error) {
      console.error('Save preferences error:', error);
      setMessage({ type: 'error', text: '設定の保存に失敗しました' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (field: keyof NotificationPreferences) => {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      [field]: !preferences[field],
    });
  };

  const handleTextChange = (field: keyof NotificationPreferences, value: string | number | null) => {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      [field]: value,
    });
  };

  if (!user) {
    return <div className="p-8">Loading...</div>;
  }

  if (loading) {
    return (
      <DashboardLayout user={user}>
        <div className="p-8">
          <div className="text-center">読み込み中...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!preferences) {
    return (
      <DashboardLayout user={user}>
        <div className="p-8">
          <div className="text-center text-red-600">設定の読み込みに失敗しました</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="p-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">通知設定</h1>
          <p className="text-gray-600">通知の受信方法をカスタマイズできます</p>
        </div>

        {/* Success/Error Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Email Notifications */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4 pb-4 border-b">
            <div>
              <h2 className="text-xl font-bold text-gray-900">メール通知</h2>
              <p className="text-sm text-gray-600">重要な更新をメールで受け取る</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.emailEnabled}
                onChange={() => handleToggle('emailEnabled')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {preferences.emailEnabled && (
            <div className="space-y-3">
              {[
                { key: 'emailOnCampaignApproval', label: 'キャンペーン承認時', icon: '🎯' },
                { key: 'emailOnApplicationStatus', label: '申請ステータス変更時', icon: '📝' },
                { key: 'emailOnMessage', label: '新しいメッセージ受信時', icon: '✉️' },
                { key: 'emailOnReview', label: 'レビュー受信時', icon: '⭐' },
                { key: 'emailOnPayment', label: '支払い関連の更新', icon: '💳' },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <span className="flex items-center gap-2 text-gray-700">
                    <span className="text-xl">{item.icon}</span>
                    {item.label}
                  </span>
                  <input
                    type="checkbox"
                    checked={preferences[item.key as keyof NotificationPreferences] as boolean}
                    onChange={() => handleToggle(item.key as keyof NotificationPreferences)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Push Notifications */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4 pb-4 border-b">
            <div>
              <h2 className="text-xl font-bold text-gray-900">プッシュ通知</h2>
              <p className="text-sm text-gray-600">ブラウザで即座に通知を受け取る（近日対応予定）</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.pushEnabled}
                onChange={() => handleToggle('pushEnabled')}
                className="sr-only peer"
                disabled
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 opacity-50"></div>
            </label>
          </div>

          <div className="text-center py-4 text-gray-500 text-sm">
            🚧 プッシュ通知機能は近日中に追加予定です
          </div>
        </div>

        {/* Digest Settings */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="mb-4 pb-4 border-b">
            <h2 className="text-xl font-bold text-gray-900">ダイジェスト配信</h2>
            <p className="text-sm text-gray-600">通知をまとめて定期的に受け取る</p>
          </div>

          <div className="space-y-4">
            {/* Daily Digest */}
            <div className="p-4 border rounded-lg">
              <label className="flex items-center justify-between mb-3 cursor-pointer">
                <span className="font-medium text-gray-900">📅 日次ダイジェスト</span>
                <input
                  type="checkbox"
                  checked={preferences.dailyDigestEnabled}
                  onChange={() => handleToggle('dailyDigestEnabled')}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
              </label>
              {preferences.dailyDigestEnabled && (
                <div className="ml-6">
                  <label className="block text-sm text-gray-600 mb-2">配信時刻</label>
                  <input
                    type="time"
                    value={preferences.dailyDigestTime || '09:00'}
                    onChange={(e) => handleTextChange('dailyDigestTime', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Weekly Digest */}
            <div className="p-4 border rounded-lg">
              <label className="flex items-center justify-between mb-3 cursor-pointer">
                <span className="font-medium text-gray-900">📊 週次ダイジェスト</span>
                <input
                  type="checkbox"
                  checked={preferences.weeklyDigestEnabled}
                  onChange={() => handleToggle('weeklyDigestEnabled')}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
              </label>
              {preferences.weeklyDigestEnabled && (
                <div className="ml-6">
                  <label className="block text-sm text-gray-600 mb-2">配信曜日</label>
                  <select
                    value={preferences.weeklyDigestDay ?? 0}
                    onChange={(e) => handleTextChange('weeklyDigestDay', parseInt(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>日曜日</option>
                    <option value={1}>月曜日</option>
                    <option value={2}>火曜日</option>
                    <option value={3}>水曜日</option>
                    <option value={4}>木曜日</option>
                    <option value={5}>金曜日</option>
                    <option value={6}>土曜日</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {saving ? '保存中...' : '設定を保存'}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
