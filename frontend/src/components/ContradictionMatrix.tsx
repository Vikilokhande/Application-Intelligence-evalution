// Structural Idea: A dense cross-document contradiction matrix displaying audit checks, severity tags, inline mismatch highlights, and evidence tracing using control room dark tokens.

import { AlertTriangle, CheckCircle2, FileText, Info } from "lucide-react";
import type { EvidenceRead, ValidationResult } from "../types/api";

export function ContradictionMatrix({
  validationResults,
  evidenceList,
  onInspectEvidence,
}: {
  validationResults: ValidationResult[];
  evidenceList: EvidenceRead[];
  onInspectEvidence?: (item: EvidenceRead) => void;
}) {
  if (!validationResults.length) {
    return (
      <div className="py-6 text-center font-mono text-xs text-[#8B99A6]">
        NO CROSS-DOCUMENT VALIDATION RESULTS RECORDED FOR THIS CASE
      </div>
    );
  }

  return (
    <div className="space-y-3 font-sans text-[#E8EDF1]">
      {/* Audit Scope Header Banner */}
      <div className="rounded-[6px] border border-[#22303A] bg-[#0B0F14] p-3 text-xs flex items-start gap-2.5">
        <AlertTriangle size={15} className="text-[#E0A93D] shrink-0 mt-0.5" />
        <div className="font-mono text-[11px] leading-relaxed">
          <span className="font-bold text-[#E8EDF1] block uppercase tracking-wider mb-0.5">
            CROSS-DOCUMENT CONSISTENCY AUDIT SCOPE
          </span>
          Compares parameters extracted across submitted application package documents (Project Proposal, Cost Breakdown, Certifications, ID Proofs).
        </div>
      </div>

      {/* Audit Matrix Table Panel */}
      <div className="overflow-hidden rounded-[6px] border border-[#22303A] bg-[#0B0F14]">
        <table className="w-full text-left font-sans text-xs border-collapse">
          <thead className="border-b border-[#22303A] bg-[#131A21] font-mono text-[10px] font-bold text-[#8B99A6] uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-3">Validation Audit Check</th>
              <th className="py-2.5 px-3">Severity</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Evidence / Mismatch Rationale</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#22303A]">
            {validationResults.map((item) => {
              const isWarning =
                item.status.includes("WARN") ||
                item.severity === "HIGH" ||
                item.status.includes("FAIL");
              const isPass =
                item.status.includes("PASS") || item.status.includes("SUCCESS");
              const matchingEv = evidenceList.find(
                (e) =>
                  e.finding_type.toLowerCase() ===
                    item.validation_type.toLowerCase() ||
                  e.field_name?.toLowerCase() ===
                    item.validation_type.toLowerCase()
              );

              return (
                <tr
                  key={item.id}
                  className={`transition-colors font-mono text-xs ${
                    isWarning
                      ? "bg-[#D9534F]/10 border-l-2 border-l-[#D9534F]"
                      : "hover:bg-[#131A21]/50"
                  }`}
                >
                  {/* Validation Type */}
                  <td className="py-2.5 px-3 font-semibold text-[#E8EDF1] uppercase">
                    {item.validation_type.replaceAll("_", " ")}
                  </td>

                  {/* Severity */}
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-block font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                        item.severity === "HIGH"
                          ? "border-[#D9534F] bg-[#D9534F]/20 text-[#D9534F]"
                          : "border-[#22303A] bg-[#131A21] text-[#8B99A6]"
                      }`}
                    >
                      {item.severity || "NORMAL"}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-2.5 px-3">
                    {isPass ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#3DDC84] bg-[#3DDC84]/10 border border-[#3DDC84]/30 px-2 py-0.5 rounded uppercase">
                        <CheckCircle2 size={12} /> PASS
                      </span>
                    ) : isWarning ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#D9534F] bg-[#D9534F]/20 border border-[#D9534F] px-2 py-0.5 rounded uppercase">
                        <AlertTriangle size={12} /> CONTRADICTION
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#8B99A6] bg-[#131A21] border border-[#22303A] px-2 py-0.5 rounded uppercase">
                        <Info size={12} /> {item.status}
                      </span>
                    )}
                  </td>

                  {/* Message */}
                  <td className="py-2.5 px-3 font-sans text-xs text-[#E8EDF1]">
                    {item.message}
                  </td>

                  {/* Action Trace */}
                  <td className="py-2.5 px-3 text-right">
                    {matchingEv && onInspectEvidence && (
                      <button
                        onClick={() => onInspectEvidence(matchingEv)}
                        className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-[#3DDC84] border border-[#22303A] bg-[#131A21] px-2 py-1 rounded hover:border-[#3DDC84] focus:outline-none focus:ring-1 focus:ring-[#3DDC84] transition-colors"
                      >
                        <FileText size={11} />
                        <span>TRACE</span>
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
