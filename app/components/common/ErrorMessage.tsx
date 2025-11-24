/**
 * Error Message Component
 * Displays error messages with appropriate styling
 */

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
  type?: 'error' | 'warning' | 'info';
}

const typeStyles = {
  error: 'bg-red-50 text-red-600 border-red-200',
  warning: 'bg-yellow-50 text-yellow-600 border-yellow-200',
  info: 'bg-blue-50 text-blue-600 border-blue-200',
};

export default function ErrorMessage({
  message,
  onDismiss,
  type = 'error',
}: ErrorMessageProps) {
  return (
    <div className={`rounded-lg border p-4 ${typeStyles[type]}`}>
      <div className="flex items-start justify-between">
        <p className="text-sm">{message}</p>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-4 text-sm font-medium hover:underline"
          >
            閉じる
          </button>
        )}
      </div>
    </div>
  );
}
