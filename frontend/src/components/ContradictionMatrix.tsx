import { AlertTriangle, CheckCircle2, FileText, Info } from "lucide-react";
import type { ValidationResult, EvidenceRead } from "../types/api";

export function ContradictionMatrix({
  validationResults,
  evidenceList,
  onInspectEvidence
}: {
  validationResults: ValidationResult[];
  evidenceList: EvidenceRead[];
  onInspectEvidence?: (item: EvidenceRead) => void;
}) {
  if (!validationResults.length) {
    return (
      <div className="text-xs text-[#64748B] italic p-4 text-center">
        No cross-document validation results recorded for this case.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2.5">
        <AlertTriangle size={16} className="text-amber-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block">Cross-Document Consistency Audit</span>
          Compares values extracted across submitted application documents (Project Proposal, Cost Estimate, ID Proof, Environmental Plan).
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
        <table className="w-full min-w-[650px] text-left text-xs">
          <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] font-bold text-[#64748B] uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Validation Audit Check</th>
              <th className="py-3 px-4">Severity</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Evidence / Reason</th>
              <th className="py-3 px-4 text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] bg-white">
            {validationResults.map((item) => {
              const isWarning = item.status.includes("WARN") || item.severity === "HIGH";
              const isPass = item.status.includes("PASS") || item.status.includes("SUCCESS");
              const matchingEv = evidenceList.find(
                (e) => e.finding_type.toLowerCase() === item.validation_type.toLowerCase() || e.field_name?.toLowerCase() === item.validation_type.toLowerCase()
              );

              return (
                <tr key={item.id} className="hover:bg-[#F8FAFC] transition">
                  <td className="py-3 px-4 font-bold text-[#0F172A]">{item.validation_type.replaceAll("_", " ")}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        item.severity === "HIGH"
                          ? "bg-rose-100 text-rose-800 border border-rose-300"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {item.severity || "NORMAL"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {isPass ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 size={13} /> PASS
                      </span>
                    ) : isWarning ? (
                      <span className="inline-flex items-center gap-1 text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                        <AlertTriangle size={13} /> CONTRADICTION
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-700 font-semibold bg-slate-100 px-2 py-0.5 rounded">
                        <Info size={13} /> {item.status}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-[#475569]">{item.message}</td>
                  <td className="py-3 px-4 text-right">
                    {matchingEv && onInspectEvidence && (
                      <button
                        onClick={() => onInspectEvidence(matchingEv)}
                        className="secondary-button text-[11px] py-1 px-2.5"
                      >
                        <FileText size={12} /> Trace
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
