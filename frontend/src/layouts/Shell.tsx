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
  Workflow,
  Sparkles,
  Layers,
  Building2,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut
} from "lucide-react";

import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

export type PageKey =
  | "login"
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

interface NavGroup {
  groupName: string;
  items: Array<{ key: PageKey; label: string; icon: LucideIcon }>;
}

const navGroups: NavGroup[] = [
  {
    groupName: "WORKSPACE",
    items: [
      { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { key: "new", label: "New Application", icon: FilePlus2 },
      { key: "processing", label: "Processing", icon: Workflow },
      { key: "details", label: "Details", icon: FileText },
      { key: "validation", label: "Validation", icon: CheckCircle2 },
      { key: "scoring", label: "AI Assessment", icon: BrainCircuit },
      { key: "review", label: "Reviewer Workspace", icon: UserCheck }
    ]
  },
  {
    groupName: "GOVERNANCE",
    items: [
      { key: "schemes", label: "Scheme Rules", icon: Settings2 },
      { key: "analytics", label: "Analytics", icon: BarChart3 },
      { key: "audit", label: "Audit Trail", icon: ScrollText }
    ]
  }
];


const allNavItems = navGroups.flatMap((group) => group.items);

export function Shell({
  page,
  onPageChange,
  children,
  selectedTitle,
  userSession,
  onLogout
}: {
  page: PageKey;
  onPageChange: (page: PageKey) => void;
  children: ReactNode;
  selectedTitle?: string | null;
  userSession?: { email: string; role: string } | null;
  onLogout?: () => void;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const currentPageObj = allNavItems.find((item) => item.key === page);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans antialiased">
      {/* Light Government Sidebar (Desktop) */}
      <aside
        className={`fixed inset-y-0 left-0 hidden border-r border-[#E2E8F0] bg-white lg:flex lg:flex-col lg:justify-between z-20 shadow-sm transition-all duration-300 ${
          desktopCollapsed ? "w-20" : "w-64"
        }`}
      >
        <div>
          {/* Brand Header with Clean Sidebar Control */}
          <div className="flex h-20 items-center justify-between border-b border-[#E2E8F0] px-3.5 bg-white">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0F766E] text-white shadow-sm">
                <ShieldCheck size={20} aria-hidden="true" />
              </div>
              {!desktopCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-bold text-[#0F172A] leading-tight">Application Intelligence</div>
                  <div className="truncate text-[11px] text-[#0F766E] font-semibold">Directorate Review Platform</div>
                  <div className="truncate text-[9px] text-[#64748B]">Directorate of Env. & Climate</div>
                </div>
              )}
            </div>
            <button
              onClick={() => setDesktopCollapsed(!desktopCollapsed)}
              className="hidden lg:flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] text-[#475569] hover:text-[#0F766E] hover:border-[#0D9488] hover:bg-[#F0FDF4] transition shadow-sm"
              title={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {desktopCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            </button>
          </div>

          {/* Grouped Navigation */}
          <nav className="space-y-6 p-3">
            {navGroups.map((group) => (
              <div key={group.groupName} className="space-y-1.5">
                {!desktopCollapsed && (
                  <div className="px-3 pb-1 text-[10px] font-extrabold tracking-widest text-[#64748B] uppercase">
                    {group.groupName}
                  </div>
                )}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = item.key === page;
                  return (
                    <button
                      key={item.key}
                      className={`group flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-xs font-bold transition-all ${
                        active
                          ? "bg-[#0F766E] text-white shadow-md border-l-4 border-[#2DD4BF]"
                          : "text-[#334155] hover:bg-[#F0FDF4] hover:text-[#0F766E]"
                      } ${desktopCollapsed ? "justify-center px-0" : ""}`}
                      onClick={() => onPageChange(item.key)}
                      title={item.label}
                    >
                      <Icon
                        size={18}
                        className={`shrink-0 transition-colors ${active ? "text-white" : "text-[#64748B] group-hover:text-[#0F766E]"}`}
                        aria-hidden="true"
                      />
                      {!desktopCollapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer Principle Note */}
        {!desktopCollapsed && (
          <div className="p-3 border-t border-[#E2E8F0]">
            <div className="rounded-xl border border-teal-200 bg-[#F0FDF4] p-3 text-center shadow-sm">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#0F766E]">
                <Sparkles size={13} /> AI ASSISTS • HUMAN DECIDES
              </div>
              <div className="mt-1 text-[10px] font-medium text-[#475569]">
                Decision Support & Audit Traceable Engine
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile & Tablet Slide-Over Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <aside className="relative flex w-72 flex-col justify-between bg-white border-r border-[#E2E8F0] p-4 shadow-2xl z-10 animate-fade-in">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F766E] text-white shadow-md">
                    <ShieldCheck size={22} aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#0F172A]">Application Intelligence</div>
                    <div className="text-xs text-[#0F766E] font-semibold">Directorate Review Platform</div>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Navigation List */}
              <nav className="space-y-6 pt-4">
                {navGroups.map((group) => (
                  <div key={group.groupName} className="space-y-1.5">
                    <div className="px-3 pb-1 text-[10px] font-extrabold tracking-widest text-[#64748B] uppercase">
                      {group.groupName}
                    </div>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = item.key === page;
                      return (
                        <button
                          key={item.key}
                          className={`flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-xs font-bold transition-all ${
                            active
                              ? "bg-[#0F766E] text-white shadow-md border-l-4 border-[#2DD4BF]"
                              : "text-[#334155] hover:bg-[#F0FDF4] hover:text-[#0F766E]"
                          }`}
                          onClick={() => {
                            onPageChange(item.key);
                            setMobileMenuOpen(false);
                          }}
                        >
                          <Icon size={18} className={active ? "text-white" : "text-[#64748B]"} />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </nav>
            </div>

            {/* Drawer Footer */}
            <div className="pt-4 border-t border-[#E2E8F0]">
              <div className="rounded-xl border border-teal-200 bg-[#F0FDF4] p-3 text-center shadow-sm">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#0F766E]">
                  <Sparkles size={13} /> AI ASSISTS • HUMAN DECIDES
                </div>
                <div className="mt-1 text-[10px] font-medium text-[#475569]">Decision Support & Audit Traceable Engine</div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Workspace Area */}
      <div className={`flex flex-col min-h-screen transition-all duration-300 ${desktopCollapsed ? "lg:pl-20" : "lg:pl-64"}`}>
        {/* Sticky Topbar */}
        <header className="sticky top-0 z-10 border-b border-[#E2E8F0] bg-white/95 backdrop-blur-md shadow-sm">
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-6">
            <div className="flex items-center gap-3">
              {/* Left Hamburger Button for Mobile Drawer ONLY */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#CBD5E1] bg-white text-[#0F766E] hover:border-[#0D9488] hover:bg-[#F0FDF4] shadow-sm transition lg:hidden"
                title="Open navigation menu drawer"
                aria-label="Open navigation menu drawer"
              >
                <Menu size={20} />
              </button>

              <div>
                <h1 className="text-xl font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
                  {currentPageObj?.label}
                </h1>
                <div className="flex items-center gap-2 text-xs text-[#475569] mt-0.5">
                  <Layers size={13} className="text-[#0F766E]" />
                  <span className="truncate font-medium">{selectedTitle ?? "No application selected"}</span>
                </div>
              </div>

              {/* User Role Badge */}
              <div className="hidden md:flex items-center gap-2 rounded-lg bg-teal-50 border border-teal-200 px-3 py-1 text-xs font-bold text-[#0F766E]">
                <UserCheck size={14} className="text-[#0F766E]" />
                <span>{userSession?.role?.replaceAll("_", " ") || "AUTHORIZED REVIEWER"}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Core Principle Badge */}
              <div className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
                <Sparkles size={13} className="text-[#0F766E]" /> AI Assists • Human Decides
              </div>

              {/* Status Badge */}
              <div className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                System Active
              </div>

              {/* Sign Out Button */}
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 transition shadow-sm"
                  title="Sign out of review workspace"
                >
                  <LogOut size={13} />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </div>
        </header>




        {/* Content Container with Shades of Color Waves Background Overlay */}
        <main key={page} className="relative flex-1 p-4 lg:p-6 bg-[#F8FAFC] animate-fade-in overflow-hidden">
          {/* Environmental Intelligence Color Waves Layer (Non-interactive, pointer-events disabled) */}
          <div className="pointer-events-none absolute inset-0 z-0 select-none overflow-hidden" aria-hidden="true">
            {/* Soft Ambient Radial Blur Pools */}
            <div className="absolute -top-32 right-0 h-[600px] w-[600px] rounded-full bg-[#0D9488]/[0.15] blur-3xl animate-ambient-shift" />
            <div className="absolute top-1/2 -left-32 h-[550px] w-[550px] rounded-full bg-[#0284C7]/[0.12] blur-3xl animate-ambient-shift" />
            <div className="absolute -bottom-32 right-1/4 h-[500px] w-[500px] rounded-full bg-[#059669]/[0.12] blur-3xl animate-ambient-shift" />

            {/* SVG Layer with Flowing Layered Color Wave Gradients */}
            <svg className="absolute inset-0 h-full w-full opacity-[0.45]" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
              <defs>
                {/* Wave Gradient 1: Government Teal to Cyan */}
                <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0F766E" stopOpacity="0.25" />
                  <stop offset="50%" stopColor="#0D9488" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#0284C7" stopOpacity="0.05" />
                </linearGradient>

                {/* Wave Gradient 2: Sky Blue to Mint Emerald */}
                <linearGradient id="waveGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#0284C7" stopOpacity="0.22" />
                  <stop offset="50%" stopColor="#14B8A6" stopOpacity="0.14" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0.04" />
                </linearGradient>

                {/* Wave Gradient 3: Soft Deep Teal */}
                <linearGradient id="waveGrad3" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#047857" stopOpacity="0.18" />
                  <stop offset="60%" stopColor="#0F766E" stopOpacity="0.10" />
                  <stop offset="100%" stopColor="#F8FAFC" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Layer 3: Deep Flow Wave (Background Layer) */}
              <path
                className="animate-wave-flow-2"
                d="M -100 280 C 300 160, 700 380, 1100 220 C 1500 60, 1900 300, 2200 240 L 2200 800 L -100 800 Z"
                fill="url(#waveGrad3)"
              />

              {/* Layer 2: Secondary Flow Wave (Midground Layer) */}
              <path
                className="animate-wave-flow-1"
                d="M -100 360 C 250 240, 650 420, 1050 280 C 1450 140, 1850 360, 2200 300 L 2200 800 L -100 800 Z"
                fill="url(#waveGrad2)"
              />

              {/* Layer 1: Foreground Subtle Stroke & Soft Fill Wave */}
              <path
                className="animate-wave-flow-1"
                d="M -100 440 C 350 320, 750 500, 1150 360 C 1550 220, 1950 420, 2200 380 L 2200 800 L -100 800 Z"
                fill="url(#waveGrad1)"
              />

              {/* Faint Wave Contour Stroke Accents */}
              <path
                className="animate-wave-flow-2"
                d="M -100 280 C 300 160, 700 380, 1100 220 C 1500 60, 1900 300, 2200 240"
                fill="none"
                stroke="#0F766E"
                strokeWidth="1.2"
                strokeOpacity="0.25"
              />
              <path
                className="animate-wave-flow-1"
                d="M -100 360 C 250 240, 650 420, 1050 280 C 1450 140, 1850 360, 2200 300"
                fill="none"
                stroke="#0D9488"
                strokeWidth="1.2"
                strokeOpacity="0.22"
              />
            </svg>
          </div>

          <div className="relative z-10">{children}</div>
        </main>


      </div>
    </div>
  );
}








