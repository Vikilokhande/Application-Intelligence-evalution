import { AlertOctagon, RefreshCw } from "lucide-react";

export function ErrorState({
  message = "An error occurred while fetching application data.",
  onRetry
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="panel-danger flex flex-col items-center justify-center p-8 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700 border border-rose-200">
        <AlertOctagon size={20} />
      </div>
      <h3 className="mt-2.5 text-sm font-bold text-rose-800 uppercase tracking-wider">System Exception</h3>
      <p className="mt-1 text-xs text-rose-700 max-w-md">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-4 secondary-button border-rose-300 text-rose-700 hover:bg-rose-50">
          <RefreshCw size={14} /> Retry Operation
        </button>
      )}
    </div>
  );
}
