import { Loader2 } from "lucide-react";

export function LoadingState({ message = "Loading intelligence workspace data..." }: { message?: string }) {
  return (
    <div className="panel flex flex-col items-center justify-center p-12 text-center min-h-48">
      <Loader2 className="h-8 w-8 text-[#0F766E] animate-spin" />
      <div className="mt-3 text-sm font-semibold text-[#0F172A]">{message}</div>
      <div className="mt-1 text-xs text-[#64748B]">Retrieving system records...</div>
    </div>
  );
}
