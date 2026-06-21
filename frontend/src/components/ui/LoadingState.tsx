import { Loader2 } from 'lucide-react';

export function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-amber-500 mb-4" />
      <p className="text-slate-400">Loading data...</p>
    </div>
  );
}
