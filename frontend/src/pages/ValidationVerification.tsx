import { useState } from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { ContradictionMatrix } from "../components/ContradictionMatrix";
import { EvidenceDrawer } from "../components/EvidenceDrawer";
import { SectionPanel } from "../components/SectionPanel";
import { StatusBadge } from "../components/StatusBadge";
import type { ApplicationDetail, EvidenceRead } from "../types/api";

export function ValidationVerification({ detail }: { detail: ApplicationDetail | null }) {
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceRead | null>(null);

  if (!detail) {
    return (
      <SectionPanel title="Validation & Cross-Document Verification">
        <div className="p-8 text-center text-sm text-[#64748B]">
          No application selected. Select an application from the <span className="font-bold text-[#0F766E]">Dashboard</span> to inspect validation checks.
        </div>
      </SectionPanel>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="panel border-l-4 border-l-[#0F766E] bg-gradient-to-r from-white via-[#F8FAFC] to-[#F0FDF4] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-[#0F172A] tracking-tight">
                Cross-Document Validation & Rule Verification
              </h1>
              <span className="ai-boundary-badge">✦ Contradiction Matrix</span>
            </div>
            <p className="mt-1 text-xs text-[#475569]">
              Automated document consistency verification for <strong className="text-[#0F172A]">{detail.project_title ?? "Selected Case"}</strong>.
            </p>
          </div>
          <StatusBadge value={detail.status} />
        </div>
      </div>

      {/* Contradiction Matrix Section */}
      <SectionPanel title="Cross-Document Consistency Audit">
        <ContradictionMatrix
          validationResults={detail.validation_results}
          evidenceList={detail.evidence}
          onInspectEvidence={(item) => setSelectedEvidence(item)}
        />
      </SectionPanel>

      {/* Scheme Rule Verification Grid */}
      <SectionPanel title="Scheme Rule Verification Grid">
        <div className="grid gap-4 md:grid-cols-2">
          {detail.rule_results.map((item) => (
            <article key={item.id} className="panel p-4 space-y-3 border-[#CBD5E1]">
              <div className="flex items-start justify-between gap-3 border-b border-[#E2E8F0] pb-2.5">
                <div>
                  <h3 className="font-bold text-[#0F172A] text-sm flex items-center gap-2">
                    <ShieldCheck size={16} className="text-[#0F766E]" /> {item.rule_name || item.rule_id}
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono">Severity: {item.severity}</span>
                </div>
                <StatusBadge value={item.result} />
              </div>
              <p className="text-xs text-[#334155] leading-relaxed">{item.reason}</p>
              <div className="grid gap-2 text-[11px] font-mono text-slate-700 bg-[#F8FAFC] p-2.5 rounded-lg border border-slate-200">
                <div>Expected: <span className="font-bold text-[#0F172A]">{JSON.stringify(item.expected_value)}</span></div>
                <div>Actual: <span className="font-bold text-[#0F172A]">{JSON.stringify(item.actual_value)}</span></div>
              </div>
            </article>
          ))}
          {!detail.rule_results.length && (
            <div className="py-4 text-xs text-[#64748B] italic col-span-2 text-center">
              No rule results recorded.
            </div>
          )}
        </div>
      </SectionPanel>

      {/* Slide-over Evidence Drawer */}
      <EvidenceDrawer evidence={selectedEvidence} onClose={() => setSelectedEvidence(null)} />
    </div>
  );
}
