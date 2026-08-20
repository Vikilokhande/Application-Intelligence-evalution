import type { ReactNode } from "react";

export function SectionPanel({
  title,
  action,
  children
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel p-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] bg-[#F8FAFC] px-5 py-3.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-2">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
