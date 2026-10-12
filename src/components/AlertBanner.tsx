import { AlertTriangle, X } from 'lucide-react';

interface AlertBannerProps {
  message: string;
  onDismiss: () => void;
}

export function AlertBanner({ message, onDismiss }: AlertBannerProps) {
  return (
    <div className="animate-slide-down bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border-l-4 border-amber-500 dark:border-amber-400 rounded-r-lg px-4 py-3 mx-4 sm:mx-6 mt-4 flex items-start gap-3 shadow-sm">
      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-900 dark:text-amber-200">{message}</p>
      </div>
      <button
        onClick={onDismiss}
        className="p-1 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors text-amber-700 dark:text-amber-300"
        aria-label="Dismiss alert"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
