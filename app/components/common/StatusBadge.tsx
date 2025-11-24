/**
 * Status Badge Component
 * Displays status with appropriate colors and labels
 */

interface StatusBadgeProps {
  status: string;
  type?: 'product' | 'campaign' | 'user' | 'contract' | 'invoice';
}

const STATUS_CONFIG: Record<string, Record<string, { label: string; color: string }>> = {
  product: {
    draft: { label: '下書き', color: 'bg-gray-100 text-gray-800' },
    pending: { label: '承認待ち', color: 'bg-yellow-100 text-yellow-800' },
    approved: { label: '承認済み', color: 'bg-green-100 text-green-800' },
    rejected: { label: '却下', color: 'bg-red-100 text-red-800' },
    archived: { label: 'アーカイブ', color: 'bg-gray-100 text-gray-600' },
  },
  campaign: {
    draft: { label: '下書き', color: 'bg-gray-100 text-gray-800' },
    pending: { label: '承認待ち', color: 'bg-yellow-100 text-yellow-800' },
    approved: { label: '承認済み', color: 'bg-green-100 text-green-800' },
    rejected: { label: '却下', color: 'bg-red-100 text-red-800' },
    active: { label: '実施中', color: 'bg-blue-100 text-blue-800' },
    completed: { label: '終了', color: 'bg-gray-100 text-gray-600' },
  },
  user: {
    pending: { label: '審査中', color: 'bg-yellow-100 text-yellow-800' },
    active: { label: '有効', color: 'bg-green-100 text-green-800' },
    suspended: { label: '停止中', color: 'bg-red-100 text-red-800' },
    rejected: { label: '却下', color: 'bg-red-100 text-red-800' },
  },
  contract: {
    draft: { label: '下書き', color: 'bg-gray-100 text-gray-800' },
    active: { label: '有効', color: 'bg-green-100 text-green-800' },
    expired: { label: '期限切れ', color: 'bg-orange-100 text-orange-800' },
    terminated: { label: '解約済み', color: 'bg-red-100 text-red-800' },
    renewed: { label: '更新済み', color: 'bg-blue-100 text-blue-800' },
  },
  invoice: {
    draft: { label: '下書き', color: 'bg-gray-100 text-gray-800' },
    issued: { label: '発行済み', color: 'bg-blue-100 text-blue-800' },
    sent: { label: '送信済み', color: 'bg-blue-100 text-blue-800' },
    payment_pending: { label: '確認中', color: 'bg-yellow-100 text-yellow-800' },
    paid: { label: '支払済み', color: 'bg-green-100 text-green-800' },
    overdue: { label: '期限切れ', color: 'bg-red-100 text-red-800' },
    cancelled: { label: 'キャンセル', color: 'bg-gray-100 text-gray-600' },
  },
};

export default function StatusBadge({ status, type = 'product' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[type]?.[status] || {
    label: status,
    color: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}
