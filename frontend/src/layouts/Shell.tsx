import {
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  FilePlus2,
  FileText,
  LayoutDashboard,
  ScrollText,
  Settings2,
  ShieldCheck,
  UserCheck,
  Workflow
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type PageKey =
  | "dashboard"
  | "new"
  | "processing"
  | "details"
  | "validation"
  | "scoring"
  | "review"
  | "audit"
  | "schemes"
  | "analytics";

const nav: Array<{ key: PageKey; label: string; icon: LucideIcon }> = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "new", label: "New Application", icon: FilePlus2 },
  { key: "processing", label: "Processing", icon: Workflow },
  { key: "details", label: "Details", icon: FileText },
  { key: "validation", label: "Validation", icon: CheckCircle2 },
  { key: "scoring", label: "AI Scoring", icon: BrainCircuit },
  { key: "review", label: "Reviewer", icon: UserCheck },
  { key: "audit", label: "Audit Trail", icon: ScrollText },
  { key: "schemes", label: "Scheme Rules", icon: Settings2 },
  { key: "analytics", label: "Analytics", icon: BarChart3 }
];

export function Shell({
  page,
  onPageChange,
  children,
  selectedTitle
}: {
  page: PageKey;
  onPageChange: (page: PageKey) => void;
  children: ReactNode;
  selectedTitle?: string | null;
}) {
  return (
    <div className="min-h-screen bg-[#EEF3F0]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-white lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-line px-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-pine text-white">
            <ShieldCheck size={21} aria-hidden="true" />
          </div>
          <div>
            <div className="text-sm font-semibold text-ink">Application Intelligence</div>
            <div className="text-xs text-slate-500">Directorate Review Platform</div>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = item.key === page;
            return (
              <button
                key={item.key}
                className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition ${
                  active ? "bg-[#E5F4EF] text-pine" : "text-slate-600 hover:bg-field hover:text-ink"
                }`}
                onClick={() => onPageChange(item.key)}
                title={item.label}
              >
                <Icon size={18} aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-line bg-white/95 backdrop-blur">
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-6">
            <div>
              <h1 className="text-xl font-semibold text-ink">{nav.find((item) => item.key === page)?.label}</h1>
              <p className="text-sm text-slate-500">{selectedTitle ?? "No application selected"}</p>
            </div>
            <select
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm lg:hidden"
              value={page}
              onChange={(event) => onPageChange(event.target.value as PageKey)}
            >
              {nav.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </header>
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

