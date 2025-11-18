'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';

interface User {
  id: string;
  email: string;
  role: string;
  manufacturer?: { companyName: string };
  facility?: { facilityName: string };
}

export default function ComposeMessagePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }
    const userData = JSON.parse(userStr);
    setCurrentUser(userData);
  }, [router]);

  useEffect(() => {
    if (currentUser) {
      loadUsers();
    }
    
    // Check if replying to a message
    const replyId = searchParams.get('reply');
    const recipientId = searchParams.get('recipient');
    
    if (recipientId) {
      setSelectedRecipientId(recipientId);
    }
    
    if (replyId) {
      setSubject('Re: '); // Placeholder, would need to fetch original subject
    }
  }, [searchParams]);

  const loadUsers = async () => {
    if (!currentUser) return;
    
    try {
      const currentUserId = currentUser.id;
      const currentUserRole = currentUser.role;

      // Load potential recipients based on user role
      let endpoint = '/api/admin/users'; // Default
      
      if (currentUserRole === 'manufacturer') {
        // Load facilities that manufacturer has worked with
        endpoint = '/api/manufacturer/facility-collaborations';
      } else if (currentUserRole === 'facility') {
        // Load manufacturers that facility has worked with
        endpoint = '/api/facility/manufacturer-collaborations';
      }

      const response = await fetch(endpoint, {
        headers: {
          'x-user-id': currentUserId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Handle different response formats
        if (data.users) {
          setUsers(data.users.filter((u: User) => u.id !== currentUserId));
        } else if (data.facilities) {
          // Convert facilities to user format
          const facilityUsers = data.facilities.map((f: any) => ({
            id: f.userId || f.id,
            email: f.facilityName,
            role: 'facility',
            facility: { facilityName: f.facilityName },
          }));
          setUsers(facilityUsers);
        } else if (data.manufacturers) {
          // Convert manufacturers to user format
          const manufacturerUsers = data.manufacturers.map((m: any) => ({
            id: m.userId || m.id,
            email: m.companyName,
            role: 'manufacturer',
            manufacturer: { companyName: m.companyName },
          }));
          setUsers(manufacturerUsers);
        }
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSend = async () => {
    if (!currentUser || !selectedRecipientId || !subject.trim() || !message.trim()) {
      alert('すべての項目を入力してください');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          recipientId: selectedRecipientId,
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('メッセージを送信しました');
        router.push('/dashboard/messages');
      } else {
        alert(data.error || 'メッセージの送信に失敗しました');
      }
    } catch (error) {
      console.error('Send message error:', error);
      alert('メッセージの送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const getUserDisplayName = (user: User): string => {
    if (user.manufacturer) return user.manufacturer.companyName;
    if (user.facility) return user.facility.facilityName;
    return user.email;
  };

  const getRoleBadge = (role: string) => {
    const badges = {
      manufacturer: { text: 'メーカー', color: 'bg-blue-100 text-blue-800' },
      facility: { text: '施設', color: 'bg-green-100 text-green-800' },
      admin: { text: '管理者', color: 'bg-purple-100 text-purple-800' },
    };
    
    const badge = badges[role as keyof typeof badges] || { text: role, color: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`text-xs px-2 py-1 rounded ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  if (!currentUser) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <DashboardLayout user={currentUser}>
      <div className="p-8">
      <div className="mb-8">
        <button
          onClick={() => router.push('/dashboard/messages')}
          className="mb-4 text-blue-600 hover:text-blue-700 flex items-center gap-2"
        >
          ← メッセージ一覧に戻る
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">新規メッセージ</h1>
        <p className="text-gray-600">パートナーにメッセージを送信</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 max-w-3xl">
        {/* Recipient Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            宛先 <span className="text-red-500">*</span>
          </label>
          {loadingUsers ? (
            <div className="text-sm text-gray-500">読み込み中...</div>
          ) : (
            <select
              value={selectedRecipientId}
              onChange={(e) => setSelectedRecipientId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">宛先を選択してください</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {getUserDisplayName(user)} ({user.role})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Subject */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            件名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="件名を入力してください"
            maxLength={200}
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            {subject.length} / 200文字
          </p>
        </div>

        {/* Message Body */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            メッセージ <span className="text-red-500">*</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={12}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="メッセージを入力してください"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            {message.length} 文字
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/dashboard/messages')}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            disabled={loading}
          >
            キャンセル
          </button>
          <button
            onClick={handleSend}
            disabled={loading || !selectedRecipientId || !subject.trim() || !message.trim()}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
          >
            {loading ? '送信中...' : '📤 送信する'}
          </button>
        </div>
      </div>
    </div>
    </DashboardLayout>
  );
}
