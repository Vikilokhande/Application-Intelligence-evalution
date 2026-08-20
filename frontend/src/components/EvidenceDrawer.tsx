import { X, FileText, Sparkles, AlertTriangle, ShieldCheck, MapPin } from "lucide-react";
import type { EvidenceRead } from "../types/api";

export function EvidenceDrawer({
  evidence,
  onClose
}: {
  evidence: EvidenceRead | null;
  onClose: () => void;
}) {
  if (!evidence) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-fade-in" onClick={onClose} />

      {/* Slide-over Panel */}
      <aside className="relative z-10 w-full max-w-md bg-white border-l border-[#E2E8F0] shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-fade-in">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700 border border-sky-200">
                <FileText size={20} />
              </div>
              <div>
                <div className="text-xs font-extrabold uppercase tracking-wider text-sky-800">
                  {evidence.finding_type.replaceAll("_", " ")}
                </div>
                <div className="text-sm font-bold text-[#0F172A]">Evidence Trace Inspection</div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100"
            >
              <X size={18} />
            </button>
          </div>

          {/* Key Attributes */}
          <div className="space-y-4 text-xs">
            <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3.5 flex items-center justify-between">
              <span className="font-bold text-sky-900 flex items-center gap-1.5">
                <Sparkles size={14} className="text-sky-700" /> Extraction Confidence
              </span>
              <span className="font-mono font-extrabold text-sm text-sky-950">
                {Math.round(evidence.confidence * 100)}%
              </span>
            </div>

            <DrawerField label="Source Document" value={evidence.source} />
            <DrawerField label="Page / Line Locator" value={evidence.locator ?? "Locator pending"} icon={MapPin} />
            <DrawerField label="Extracted Field Name" value={evidence.field_name ?? "Unspecified Field"} />
            
            <div className="space-y-1">
              <span className="field-label">Extracted Value / Clause Text</span>
              <div className="p-3 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] font-mono text-xs text-[#0F172A] font-semibold break-words">
                {evidence.extracted_value ?? "No extracted text value recorded."}
              </div>
            </div>

            {evidence.metadata_json && Object.keys(evidence.metadata_json).length > 0 && (
              <div className="space-y-1">
                <span className="field-label">Metadata & Audit Parameters</span>
                <pre className="p-3 rounded-xl border border-[#CBD5E1] bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto">
                  {JSON.stringify(evidence.metadata_json, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[#E2E8F0]">
          <button onClick={onClose} className="primary-button w-full">
            <ShieldCheck size={16} /> Close Evidence Drawer
          </button>
        </div>
      </aside>
    </div>
  );
}

function DrawerField({ label, value, icon: Icon }: { label: string; value: string; icon?: typeof MapPin }) {
  return (
    <div className="space-y-1">
      <span className="field-label">{label}</span>
      <div className="font-bold text-[#0F172A] flex items-center gap-1.5">
        {Icon && <Icon size={14} className="text-[#0F766E]" />}
        <span>{value}</span>
      </div>
    </div>
  );
}
