// src/components/ui/EmptyState.tsx
import { FileSearch } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        {icon ?? <FileSearch size={24} />}
      </div>
      <h3 className="text-base font-semibold text-slate-700">{title}</h3>
      {description && <p className="mt-1.5 text-sm text-slate-500 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
