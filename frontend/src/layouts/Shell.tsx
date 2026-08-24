import {
  BarChart3,
  BookOpen,
  ChevronRight,
  ClipboardCheck,
  FilePlus2,
  FileSearch,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Sparkles,
  User,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

export type PageKey =
  | "landing" | "login"
  | "dashboard" | "new" | "details"
  | "processing" | "validation" | "scoring" | "review"
  | "schemes" | "audit"
  | "analytics";

interface NavItem {
  key: PageKey;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  heading: string;
  items: NavItem[];
  requiresSelection?: boolean;
}

const NAV_GROUPS: NavGroup[] = [
  {
    heading: "Workspace",
    items: [
      { key: "dashboard", label: "Dashboard",       icon: LayoutDashboard },
      { key: "details",   label: "Applications",    icon: FileText        },
      { key: "new",       label: "New Application", icon: FilePlus2       },
    ],
  },
  {
    heading: "Case Review",
    requiresSelection: true,
    items: [
      { key: "processing",  label: "Processing",         icon: ClipboardCheck },
      { key: "validation",  label: "Validation",         icon: FileSearch     },
      { key: "scoring",     label: "AI Assessment",      icon: Sparkles       },
      { key: "review",      label: "Reviewer Workspace", icon: BookOpen       },
    ],
  },
  {
    heading: "Governance",
    items: [
      { key: "schemes", label: "Schemes & Rules", icon: FileText  },
    ],
  },
  {
    heading: "System",
    items: [
      { key: "analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
];

// Flat label lookup
const ALL_LABELS: Record<PageKey, string> = {} as Record<PageKey, string>;
NAV_GROUPS.forEach(g => g.items.forEach(i => { ALL_LABELS[i.key] = i.label; }));
ALL_LABELS.landing = "Home";
ALL_LABELS.login   = "Sign In";

export function Shell({
  page,
  onPageChange,
  children,
  selectedTitle,
  userSession,
  onLogout,
  hasSelectedApp,
}: {
  page: PageKey;
  onPageChange: (page: PageKey) => void;
  children: ReactNode;
  selectedTitle?: string | null;
  userSession?: { email: string; role: string } | null;
  onLogout?: () => void;
  hasSelectedApp?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const pageLabel = ALL_LABELS[page] ?? "Portal";

  function NavItems({ onItemClick }: { onItemClick?: () => void }) {
    return (
      <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-4">
        {NAV_GROUPS.map((group) => {
          // Hide "Case Review" when no application is selected
          if (group.requiresSelection && !hasSelectedApp) return null;
          return (
            <div key={group.heading}>
              <p className="px-2 mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {group.heading}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = item.key === page;
                  return (
                    <button
                      key={item.key}
                      onClick={() => { onPageChange(item.key); onItemClick?.(); }}
                      className={`group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                        active
                          ? "bg-teal-50 text-teal-700 font-semibold"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      {active && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r bg-teal-600" />}
                      <Icon size={16} className={`shrink-0 ${active ? "text-teal-600" : "text-slate-400 group-hover:text-slate-600"}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans antialiased flex flex-col">
      {/* ── Top Header ─────────────────────────────────────────────── */}
      <header className="h-14 shrink-0 border-b border-slate-200 bg-white px-4 lg:px-6 flex items-center justify-between z-30 shadow-sm">
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-teal-600 hover:border-teal-300 transition lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={17} />
          </button>
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white font-bold text-sm">D</div>
            <div className="hidden sm:block">
              <div className="text-sm font-bold text-slate-900 leading-tight">DECC Review Portal</div>
              <div className="text-[10px] text-slate-400">Directorate of Environment &amp; Climate Change</div>
            </div>
          </div>
          {/* Breadcrumb */}
          {page !== "dashboard" && page !== "landing" && page !== "login" && (
            <div className="hidden md:flex items-center gap-1 text-sm text-slate-400 ml-2">
              <ChevronRight size={14} />
              <span className="text-slate-600 font-medium">{pageLabel}</span>
              {selectedTitle && (
                <>
                  <ChevronRight size={14} />
                  <span className="truncate max-w-[200px] text-slate-400">{selectedTitle}</span>
                </>
              )}
            </div>
          )}
        </div>
        {/* Right */}
        <div className="flex items-center gap-2 shrink-0">
          {userSession && (
            <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700">
              <User size={13} className="text-slate-400" />
              <span className="capitalize">{userSession.role?.replaceAll("_", " ") || "Reviewer"}</span>
            </div>
          )}
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 transition"
              title="Sign out"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
          <NavItems />
          {/* Sidebar footer */}
          <div className="p-3 border-t border-slate-100">
            <div className="rounded-lg bg-teal-50 border border-teal-100 px-3 py-2">
              <p className="text-xs font-semibold text-teal-700">AI assists. You decide.</p>
              <p className="text-[11px] text-teal-600 mt-0.5">Final decisions are made by the authorised reviewer.</p>
            </div>
          </div>
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <aside className="relative flex w-72 flex-col bg-white border-r border-slate-200 z-10 shadow-xl">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white font-bold text-sm">D</div>
                  <span className="text-sm font-bold text-slate-900">DECC Review Portal</span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100">
                  <X size={15} />
                </button>
              </div>
              <NavItems onItemClick={() => setMobileOpen(false)} />
            </aside>
          </div>
        )}

        {/* Main content */}
        <main key={page} className="flex-1 min-w-0 overflow-hidden flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-6 animate-slide-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
