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
  ShieldCheck,
  Sparkles,
  User,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "../components/LanguageSelector";

export type PageKey =
  | "landing" | "login"
  | "dashboard" | "new" | "details"
  | "processing" | "validation" | "scoring" | "review"
  | "schemes" | "audit"
  | "analytics";

interface NavItem {
  key: PageKey;
  labelKey: string;
  defaultLabel: string;
  icon: LucideIcon;
}

interface NavGroup {
  headingKey: string;
  defaultHeading: string;
  items: NavItem[];
  requiresSelection?: boolean;
}

const NAV_GROUPS: NavGroup[] = [
  {
    headingKey: "nav.group_workspace",
    defaultHeading: "Workspace",
    items: [
      { key: "dashboard", labelKey: "nav.dashboard",       defaultLabel: "Dashboard",       icon: LayoutDashboard },
      { key: "details",   labelKey: "nav.applications",    defaultLabel: "Applications",    icon: FileText        },
      { key: "new",       labelKey: "nav.new_application", defaultLabel: "New Application", icon: FilePlus2       },
    ],
  },
  {
    headingKey: "nav.group_case_review",
    defaultHeading: "Case Review",
    requiresSelection: true,
    items: [
      { key: "processing",  labelKey: "nav.processing",         defaultLabel: "Processing",         icon: ClipboardCheck },
      { key: "validation",  labelKey: "nav.validation",         defaultLabel: "Validation",         icon: FileSearch     },
      { key: "scoring",     labelKey: "nav.ai_assessment",      defaultLabel: "AI Assessment",      icon: Sparkles       },
      { key: "review",      labelKey: "nav.reviewer_workspace", defaultLabel: "Reviewer Workspace", icon: BookOpen       },
    ],
  },
  {
    headingKey: "nav.group_governance",
    defaultHeading: "Governance",
    items: [
      { key: "schemes", labelKey: "nav.schemes_rules", defaultLabel: "Schemes & Rules", icon: FileText  },
    ],
  },
  {
    headingKey: "nav.group_system",
    defaultHeading: "System",
    items: [
      { key: "analytics", labelKey: "nav.analytics", defaultLabel: "Analytics", icon: BarChart3 },
    ],
  },
];

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
  const { t } = useTranslation();

  // Active page label lookup
  let activeLabel = t("common.portal", "Portal");
  for (const group of NAV_GROUPS) {
    const found = group.items.find((i) => i.key === page);
    if (found) {
      activeLabel = t(found.labelKey, found.defaultLabel);
      break;
    }
  }
  if (page === "landing") activeLabel = t("common.home", "Home");
  if (page === "login") activeLabel = t("common.sign_in", "Sign In");

  function NavItems({ onItemClick }: { onItemClick?: () => void }) {
    return (
      <nav className="flex-1 py-4 px-3 overflow-y-auto space-y-5">
        {NAV_GROUPS.map((group) => {
          if (group.requiresSelection && !hasSelectedApp) return null;
          return (
            <div key={group.headingKey}>
              <p className="px-3 mb-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                {t(group.headingKey, group.defaultHeading)}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = item.key === page;
                  const label = t(item.labelKey, item.defaultLabel);
                  return (
                    <button
                      key={item.key}
                      onClick={() => { onPageChange(item.key); onItemClick?.(); }}
                      className={`group relative flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition-all focus:outline-none ${
                        active
                          ? "bg-[#0A2540] text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-100 hover:text-[#0A2540]"
                      }`}
                    >
                      <Icon
                        size={17}
                        className={`shrink-0 transition-colors ${
                          active ? "text-[#C59B27]" : "text-slate-400 group-hover:text-slate-600"
                        }`}
                      />
                      <span className="truncate">{label}</span>
                      {active && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#C59B27]" />
                      )}
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
    <div className="h-screen w-screen overflow-hidden bg-[#F8FAFC] text-[#0F172A] font-sans antialiased flex flex-col">
      {/* ── Official Government Top Header ─────────────────────────────────────────────── */}
      <header className="h-16 shrink-0 border-b border-[#0A2540]/20 bg-[#0A2540] px-4 lg:px-6 flex items-center justify-between z-30 text-white shadow-sm">
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:bg-white/10 hover:text-white transition lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
          
          {/* Official Government Brand Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-[#C59B27]/40 bg-[#C59B27]/20 text-[#C59B27] shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="font-sans text-sm sm:text-base font-bold tracking-wide text-white flex items-center gap-2">
                <span>{t("common.app_title", "DECC REVIEW PORTAL")}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#C59B27]" />
              </div>
              <div className="hidden sm:block font-sans text-[11px] text-[#94A3B8] tracking-tight leading-none mt-0.5">
                {t("common.app_subtitle", "Environmental Application Review & Decision Support • Government of Maharashtra")}
              </div>
            </div>
          </div>

          {/* Breadcrumb navigation */}
          {page !== "dashboard" && page !== "landing" && page !== "login" && (
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 ml-4 pl-4 border-l border-slate-700">
              <span className="text-[#CBD5E1] font-semibold">{activeLabel}</span>
              {selectedTitle && (
                <>
                  <ChevronRight size={13} className="text-slate-500" />
                  <span className="truncate max-w-[220px] text-slate-300">{selectedTitle}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right Action Area: Language Selector + User Session + Logout */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Multilingual Selector */}
          <LanguageSelector variant="dark" />

          {userSession && (
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-700 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-[#CBD5E1]">
              <User size={13} className="text-[#C59B27]" />
              <span className="capitalize">{userSession.role?.replaceAll("_", " ") || "Reviewer"}</span>
            </div>
          )}
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-[#CBD5E1] hover:border-rose-500 hover:bg-rose-600 hover:text-white transition"
              title={t("common.sign_out", "Sign Out")}
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">{t("common.sign_out", "Sign Out")}</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white shadow-xs">
          <NavItems />
          {/* Sidebar footer badge */}
          <div className="p-3.5 border-t border-slate-100 bg-slate-50/50">
            <div className="rounded-xl border border-[#C59B27]/30 bg-[#FFFBEB] p-3 shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#B45309]">
                <Sparkles size={13} className="text-[#D97706]" />
                <span>{t("common.app_tagline", "AI ASSISTS · HUMAN DECIDES")}</span>
              </div>
              <p className="text-[11px] text-[#78350F] mt-1 leading-snug">
                {t("common.app_tagline_desc", "Final clearance decisions are strictly made by the authorized reviewer.")}
              </p>
            </div>
          </div>
        </aside>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <aside className="relative flex w-72 flex-col bg-white border-r border-slate-200 z-10 shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b border-[#0A2540]/20 bg-[#0A2540] text-white">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#C59B27]/40 bg-[#C59B27]/20 text-[#C59B27]">
                    <ShieldCheck size={18} />
                  </div>
                  <span className="text-sm font-bold tracking-wide">{t("common.app_title", "DECC PORTAL")}</span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:bg-white/10">
                  <X size={16} />
                </button>
              </div>
              <NavItems onItemClick={() => setMobileOpen(false)} />
            </aside>
          </div>
        )}

        {/* Main Content Area */}
        <main key={page} className="flex-1 min-w-0 overflow-hidden flex flex-col bg-[#F8FAFC]">
          <div className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-7 animate-slide-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

