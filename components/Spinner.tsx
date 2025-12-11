// components/Spinner.tsx
// Reusable loading spinner component

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
  };

  return (
    <div
      className={`inline-block animate-spin rounded-full border-gray-300 border-t-gray-900 ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

interface SpinnerWithTextProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SpinnerWithText({ text = 'Loading...', size = 'md', className = '' }: SpinnerWithTextProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Spinner size={size} />
      <span className="text-sm text-gray-600">{text}</span>
    </div>
  );
}

