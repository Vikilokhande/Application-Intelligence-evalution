import { FolderOpen } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  title = "No Records Found",
  description = "No data is currently available for this section.",
  action
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel flex flex-col items-center justify-center p-12 text-center border-dashed border-[#CBD5E1]">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 border border-slate-200">
        <FolderOpen size={24} />
      </div>
      <h3 className="mt-3 text-sm font-bold text-[#0F172A] uppercase tracking-wider">{title}</h3>
      <p className="mt-1 text-xs text-[#64748B] max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
