/**
 * Loading Spinner Component
 * Displays a loading animation with optional message
 */

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-4',
  lg: 'h-12 w-12 border-4',
};

export default function LoadingSpinner({
  message = '読み込み中...',
  size = 'md',
  fullScreen = false,
}: LoadingSpinnerProps) {
  const spinner = (
    <div className="text-center">
      <div
        className={`inline-block animate-spin rounded-full border-solid border-blue-600 border-r-transparent ${sizeClasses[size]}`}
      ></div>
      {message && <p className="mt-4 text-gray-600">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
}
