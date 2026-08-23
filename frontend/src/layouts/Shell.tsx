// Structural Idea: A fixed-frame forensic control room console framing all viewports with top telemetry status bar, dark collapsible nav dock, and zero marketing decorations.

import {
  Activity,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FilePlus2,
  FileText,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Settings2,
  UserCheck,
  Workflow,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

export type PageKey =
  | "landing"
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
    groupName: "OVERVIEW",
    items: [
      { key: "landing", label: "Public Landing", icon: Activity },
      { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    groupName: "WORKSPACE",
    items: [
      { key: "new", label: "New Application", icon: FilePlus2 },
      { key: "processing", label: "Processing", icon: Workflow },
      { key: "details", label: "Details", icon: FileText },
      { key: "validation", label: "Validation", icon: CheckCircle2 },
      { key: "scoring", label: "AI Assessment", icon: BrainCircuit },
      { key: "review", label: "Reviewer Workspace", icon: UserCheck },
    ],
  },
  {
    groupName: "GOVERNANCE",
    items: [
      { key: "schemes", label: "Scheme Rules", icon: Settings2 },
      { key: "analytics", label: "Analytics", icon: BarChart3 },
      { key: "audit", label: "Audit Trail", icon: ScrollText },
    ],
  },
];

const allNavItems = navGroups.flatMap((group) => group.items);

export function Shell({
  page,
  onPageChange,
  children,
  selectedTitle,
  userSession,
  onLogout,
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
    <div className="h-screen w-screen overflow-hidden bg-[#0B0F14] text-[#E8EDF1] font-sans antialiased flex flex-col">
      {/* Top Command Telemetry Header */}
      <header className="h-14 shrink-0 border-b border-[#22303A] bg-[#131A21] px-4 flex items-center justify-between z-30">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Navigation Toggle */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#22303A] bg-[#0B0F14] text-[#8B99A6] hover:text-[#E8EDF1] hover:border-[#3DDC84] focus:outline-none focus:ring-1 focus:ring-[#3DDC84] focus:border-[#3DDC84] lg:hidden"
            aria-label="Open telemetry menu"
          >
            <Menu size={16} />
          </button>

          {/* Directorate Branding & Active Page Header */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <span className="h-2 w-2 rounded-full bg-[#3DDC84]" />
              <span className="font-mono text-xs font-semibold tracking-wider text-[#E8EDF1] uppercase">
                DECC CONTROL ROOM
              </span>
            </div>

            <span className="text-[#22303A]">|</span>

            <div className="flex items-center gap-2 min-w-0">
              <h1 className="font-mono text-xs font-semibold tracking-wide text-[#3DDC84] uppercase shrink-0">
                {currentPageObj?.label || "SYSTEM"}
              </h1>
              {selectedTitle && (
                <>
                  <span className="text-[#22303A] hidden sm:inline">•</span>
                  <div className="hidden sm:flex items-center gap-1.5 min-w-0 text-[#8B99A6] text-xs font-mono">
                    <Layers size={12} className="shrink-0 text-[#8B99A6]" />
                    <span className="truncate">{selectedTitle}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Telemetry Status & User Role Badge */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Active System Indicator */}
          <div className="hidden md:flex items-center gap-1.5 rounded-[6px] border border-[#22303A] bg-[#0B0F14] px-2.5 py-1 font-mono text-[11px] font-medium text-[#3DDC84]">
            <Activity size={12} className="text-[#3DDC84]" />
            <span>SYS: ONLINE</span>
          </div>

          {/* User Role Indicator */}
          <div className="flex items-center gap-1.5 rounded-[6px] border border-[#22303A] bg-[#0B0F14] px-2.5 py-1 font-mono text-[11px] font-medium text-[#E8EDF1]">
            <UserCheck size={12} className="text-[#8B99A6]" />
            <span className="uppercase">
              {userSession?.role?.replaceAll("_", " ") || "SENIOR REVIEWER"}
            </span>
          </div>

          {/* Sign Out Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex h-7 items-center gap-1.5 rounded-[6px] border border-[#22303A] bg-[#0B0F14] px-2.5 font-mono text-[11px] font-semibold text-[#8B99A6] hover:text-[#D9534F] hover:border-[#D9534F] focus:outline-none focus:ring-1 focus:ring-[#D9534F] transition-colors"
              title="Sign out of system console"
            >
              <LogOut size={12} />
              <span className="hidden sm:inline">EXIT</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Body Grid Frame */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Desktop Sidebar Dock */}
        <aside
          className={`hidden lg:flex flex-col justify-between border-r border-[#22303A] bg-[#131A21] transition-all duration-200 shrink-0 ${
            desktopCollapsed ? "w-16" : "w-60"
          }`}
        >
          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-5">
            {/* Dock Expand / Collapse Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#22303A]/60">
              {!desktopCollapsed && (
                <span className="font-mono text-[10px] font-bold tracking-widest text-[#8B99A6] uppercase">
                  TELEMETRY DOCK
                </span>
              )}
              <button
                onClick={() => setDesktopCollapsed(!desktopCollapsed)}
                className="flex h-6 w-6 items-center justify-center rounded-[4px] border border-[#22303A] bg-[#0B0F14] text-[#8B99A6] hover:text-[#3DDC84] hover:border-[#3DDC84] focus:outline-none focus:ring-1 focus:ring-[#3DDC84] focus:border-[#3DDC84] transition-colors mx-auto"
                title={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {desktopCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
              </button>
            </div>

            {navGroups.map((group) => (
              <div key={group.groupName} className="space-y-1">
                {!desktopCollapsed && (
                  <div className="px-2 pb-1 font-mono text-[9px] font-bold tracking-widest text-[#8B99A6] uppercase">
                    {group.groupName}
                  </div>
                )}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = item.key === page;
                  return (
                    <button
                      key={item.key}
                      onClick={() => onPageChange(item.key)}
                      className={`group relative flex h-9 w-full items-center gap-2.5 rounded-[6px] px-2.5 text-left font-sans text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-[#3DDC84] focus:border-[#3DDC84] ${
                        active
                          ? "bg-[#0B0F14] text-[#E8EDF1] border border-[#3DDC84]/50 font-semibold"
                          : "text-[#8B99A6] border border-transparent hover:text-[#E8EDF1] hover:bg-[#0B0F14]/60 hover:border-[#22303A]"
                      } ${desktopCollapsed ? "justify-center px-0" : ""}`}
                      title={item.label}
                    >
                      {active && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-[#3DDC84]" />
                      )}
                      <Icon
                        size={15}
                        className={`shrink-0 transition-colors ${
                          active ? "text-[#3DDC84]" : "text-[#8B99A6] group-hover:text-[#E8EDF1]"
                        }`}
                      />
                      {!desktopCollapsed && (
                        <span className="truncate tracking-tight">{item.label}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Dock Footer Metadata */}
          {!desktopCollapsed && (
            <div className="p-3 border-t border-[#22303A] bg-[#0B0F14]/40">
              <div className="rounded-[6px] border border-[#22303A] bg-[#0B0F14] p-2">
                <div className="font-mono text-[10px] font-semibold text-[#3DDC84] tracking-wider uppercase">
                  AUDIT LEDGER ACTIVE
                </div>
                <div className="font-mono text-[9px] text-[#8B99A6] mt-0.5">
                  AI ASSISTS • HUMAN DECIDES
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Mobile Navigation Drawer Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="fixed inset-0 bg-[#0B0F14]/80 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />

            <aside className="relative flex w-64 flex-col justify-between border-r border-[#22303A] bg-[#131A21] p-4 z-10">
              <div>
                <div className="flex items-center justify-between border-b border-[#22303A] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#3DDC84]" />
                    <span className="font-mono text-xs font-semibold text-[#E8EDF1] tracking-wider uppercase">
                      TELEMETRY DOCK
                    </span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[#22303A] text-[#8B99A6] hover:text-[#E8EDF1] focus:outline-none focus:ring-1 focus:ring-[#3DDC84]"
                    aria-label="Close menu"
                  >
                    <X size={15} />
                  </button>
                </div>

                <nav className="space-y-4 pt-4">
                  {navGroups.map((group) => (
                    <div key={group.groupName} className="space-y-1">
                      <div className="px-2 pb-1 font-mono text-[9px] font-bold tracking-widest text-[#8B99A6] uppercase">
                        {group.groupName}
                      </div>
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const active = item.key === page;
                        return (
                          <button
                            key={item.key}
                            onClick={() => {
                              onPageChange(item.key);
                              setMobileMenuOpen(false);
                            }}
                            className={`flex h-9 w-full items-center gap-2.5 rounded-[6px] px-2.5 text-left font-sans text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-[#3DDC84] ${
                              active
                                ? "bg-[#0B0F14] text-[#E8EDF1] border border-[#3DDC84]/50 font-semibold"
                                : "text-[#8B99A6] border border-transparent hover:text-[#E8EDF1] hover:bg-[#0B0F14]/60"
                            }`}
                          >
                            <Icon size={15} className={active ? "text-[#3DDC84]" : "text-[#8B99A6]"} />
                            <span className="truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </nav>
              </div>

              <div className="pt-3 border-t border-[#22303A]">
                <div className="rounded-[6px] border border-[#22303A] bg-[#0B0F14] p-2 text-center">
                  <div className="font-mono text-[10px] font-semibold text-[#3DDC84]">
                    AI ASSISTS • HUMAN DECIDES
                  </div>
                  <div className="font-mono text-[9px] text-[#8B99A6] mt-0.5">
                    FORENSIC CONTROL ROOM
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* Primary Viewport Area */}
        <main key={page} className="flex-1 min-w-0 overflow-hidden bg-[#0B0F14] flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-5">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
