import { PackageX } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-xl bg-white/60 dark:bg-slate-900/50 shadow-sm">
      <PackageX className="h-12 w-12 text-slate-400 dark:text-slate-500 mb-4" />
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-sm font-medium rounded-lg transition-colors border border-slate-200 dark:border-transparent"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
