'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  relatedResourceType?: string;
  relatedResourceId?: string;
  readAt: string | null;
  createdAt: string;
}

interface User {
  id: string;
  email: string;
  role: 'manufacturer' | 'facility' | 'admin';
  profile?: any;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    loadNotifications(parsedUser.id);
  }, [router]);

  const loadNotifications = async (userId: string, filterType: 'all' | 'unread' = filter) => {
    setLoading(true);
    try {
      const url = filterType === 'unread' 
        ? `/api/notifications?unreadOnly=true`
        : '/api/notifications';

      const response = await fetch(url, {
        headers: { 'x-user-id': userId },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('通知の読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: { 'x-user-id': user.id },
      });

      if (response.ok) {
        loadNotifications(user.id);
      }
    } catch (error) {
      console.error('通知の既読エラー:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    const unreadNotifications = notifications.filter(n => !n.readAt);
    
    try {
      await Promise.all(
        unreadNotifications.map(notification =>
          fetch(`/api/notifications/${notification.id}/read`, {
            method: 'POST',
            headers: { 'x-user-id': user.id },
          })
        )
      );
      
      loadNotifications(user.id);
    } catch (error) {
      console.error('一括既読エラー:', error);
    }
  };

  const handleFilterChange = (newFilter: 'all' | 'unread') => {
    setFilter(newFilter);
    if (user) {
      loadNotifications(user.id, newFilter);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'account_approved':
        return '✅';
      case 'account_rejected':
        return '❌';
      case 'product_approved':
        return '📦';
      case 'product_rejected':
        return '📦';
      case 'campaign_approved':
        return '🎯';
      case 'campaign_rejected':
        return '🎯';
      case 'campaign_application':
        return '📝';
      case 'application_approved':
        return '✅';
      case 'application_rejected':
        return '❌';
      case 'purchase_made':
        return '🛒';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type: string) => {
    if (type.includes('approved')) return 'bg-green-50 border-green-200';
    if (type.includes('rejected')) return 'bg-red-50 border-red-200';
    if (type.includes('application')) return 'bg-blue-50 border-blue-200';
    if (type === 'purchase_made') return 'bg-purple-50 border-purple-200';
    return 'bg-gray-50 border-gray-200';
  };

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">読み込み中...</div>;
  }

  return (
    <DashboardLayout user={user}>
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="border-b px-6 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">通知</h1>
            {notifications.some(n => !n.readAt) && (
              <button
                onClick={markAllAsRead}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                すべて既読にする
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="mt-4 flex space-x-2">
            <button
              onClick={() => handleFilterChange('all')}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              すべて
            </button>
            <button
              onClick={() => handleFilterChange('unread')}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              未読のみ
            </button>
          </div>
        </div>

        {/* Notification List */}
        <div className="px-6 py-6">
          {loading ? (
            <div className="py-12 text-center text-gray-500">読み込み中...</div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-6xl mb-4">🔔</div>
              <p className="text-gray-500">
                {filter === 'unread' ? '未読の通知はありません' : '通知はありません'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`relative rounded-lg border p-4 ${getNotificationColor(
                    notification.type
                  )} ${!notification.readAt ? 'border-l-4' : ''}`}
                >
                  <div className="flex items-start space-x-4">
                    {/* Icon */}
                    <div className="text-3xl">{getNotificationIcon(notification.type)}</div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-base font-semibold text-gray-900">
                            {notification.title}
                          </h3>
                          <p className="mt-1 text-sm text-gray-700">{notification.message}</p>
                          <p className="mt-2 text-xs text-gray-500">
                            {formatDateTime(notification.createdAt)}
                          </p>
                        </div>

                        {/* Mark as Read Button */}
                        {!notification.readAt && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="ml-4 rounded-lg bg-white px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 border border-blue-300"
                          >
                            既読にする
                          </button>
                        )}
                      </div>

                      {/* Read Status Badge */}
                      {notification.readAt && (
                        <div className="mt-2">
                          <span className="inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                            既読
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
