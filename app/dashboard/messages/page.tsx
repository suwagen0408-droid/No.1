'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Message {
  id: string;
  userId: string;
  userEmail: string;
  userRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  newValues: string;
  createdAt: string;
}

interface MessageData {
  subject: string;
  message: string;
  senderName: string;
  relatedResourceType?: string;
  relatedResourceId?: string;
}

export default function MessagesPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'received' | 'sent'>('received');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  useEffect(() => {
    loadMessages();
  }, [tab]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/messages?type=${tab}`, {
        headers: {
          'x-user-id': localStorage.getItem('userId') || '',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      } else {
        console.error('Failed to load messages');
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseMessageData = (message: Message): MessageData | null => {
    try {
      return JSON.parse(message.newValues);
    } catch {
      return null;
    }
  };

  const getSenderOrRecipient = (message: Message): string => {
    const data = parseMessageData(message);
    if (tab === 'received') {
      return data?.senderName || message.userEmail;
    } else {
      // For sent messages, we need to get recipient info
      return message.resourceId; // This is the recipient user ID
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
    } else {
      return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">メッセージ</h1>
          <p className="text-gray-600">パートナーとのコミュニケーション</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/messages/compose')}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
        >
          ✉️ 新規メッセージ
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Tabs */}
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setTab('received')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                tab === 'received'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              📥 受信箱 ({messages.length})
            </button>
            <button
              onClick={() => setTab('sent')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                tab === 'sent'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              📤 送信済み ({messages.length})
            </button>
          </div>
        </div>

        {/* Messages List */}
        <div className="divide-y">
          {loading ? (
            <div className="text-center py-12 text-gray-500">読み込み中...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {tab === 'received' ? 'メッセージはありません' : '送信したメッセージはありません'}
            </div>
          ) : (
            messages.map((message) => {
              const data = parseMessageData(message);
              if (!data) return null;

              return (
                <div
                  key={message.id}
                  onClick={() => setSelectedMessage(message)}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-medium text-gray-900">
                          {tab === 'received' ? data.senderName : '宛先'}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatDate(message.createdAt)}
                        </span>
                      </div>
                      <h3 className="font-medium text-gray-900 mb-1 truncate">
                        {data.subject}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {data.message}
                      </p>
                    </div>
                    <div className="ml-4">
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    {parseMessageData(selectedMessage)?.subject}
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>
                      {tab === 'received' ? '送信者' : '宛先'}:{' '}
                      <span className="font-medium">
                        {parseMessageData(selectedMessage)?.senderName || selectedMessage.userEmail}
                      </span>
                    </span>
                    <span>
                      {new Date(selectedMessage.createdAt).toLocaleString('ja-JP')}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="prose max-w-none">
                <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                  {parseMessageData(selectedMessage)?.message}
                </p>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50">
              <div className="flex gap-3">
                {tab === 'received' && (
                  <button
                    onClick={() => {
                      // Navigate to compose with reply context
                      const data = parseMessageData(selectedMessage);
                      router.push(`/dashboard/messages/compose?reply=${selectedMessage.id}&recipient=${selectedMessage.userId}`);
                    }}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    返信
                  </button>
                )}
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-white"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
