// ContradictionMatrix.tsx — Cross-document validation audit matrix.
// Shows NOT_VERIFIABLE (amber) distinct from NOT_CHECKED (grey) and PASS (green).
// Displays actual RAG evidence text and knowledge-base citations per row.

import { AlertTriangle, BookOpen, CheckCircle2, FileText, HelpCircle, Info } from "lucide-react";
import type { EvidenceRead, ValidationResult } from "../types/api";

function StatusBadge({ status }: { status: string }) {
  if (status.includes("PASS") || status.includes("SUCCESS")) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#3DDC84] bg-[#3DDC84]/10 border border-[#3DDC84]/30 px-2 py-0.5 rounded uppercase">
        <CheckCircle2 size={12} /> PASS
      </span>
    );
  }
  if (status.includes("FAIL") || status.includes("CONTRADICTION")) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#D9534F] bg-[#D9534F]/20 border border-[#D9534F] px-2 py-0.5 rounded uppercase">
        <AlertTriangle size={12} /> {status.includes("CONTRADICTION") ? "CONTRADICTION" : "FAIL"}
      </span>
    );
  }
  if (status.includes("WARN")) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#E0A93D] bg-[#E0A93D]/10 border border-[#E0A93D]/40 px-2 py-0.5 rounded uppercase">
        <AlertTriangle size={12} /> WARN
      </span>
    );
  }
  if (status === "NOT_VERIFIABLE") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#E0A93D] bg-[#E0A93D]/10 border border-[#E0A93D]/40 px-2 py-0.5 rounded uppercase">
        <HelpCircle size={12} /> NOT VERIFIABLE
      </span>
    );
  }
  // NOT_CHECKED — deliberately skipped
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#8B99A6] bg-[#131A21] border border-[#22303A] px-2 py-0.5 rounded uppercase">
      <Info size={12} /> {status}
    </span>
  );
}

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
          Compares parameters extracted across submitted application package documents.
          {" "}<span className="text-[#E0A93D]">NOT_VERIFIABLE</span> = evidence unavailable (fewer than 2 docs with field).
          {" "}<span className="text-[#8B99A6]">NOT_CHECKED</span> = deliberately skipped.
        </div>
      </div>

      {/* Audit Matrix Table Panel */}
      <div className="overflow-hidden rounded-[6px] border border-[#22303A] bg-[#0B0F14]">
        <table className="w-full text-left font-sans text-xs border-collapse">
          <thead className="border-b border-[#22303A] bg-[#131A21] font-mono text-[10px] font-bold text-[#8B99A6] uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-3">Validation Audit Check</th>
              <th className="py-2.5 px-3">Rule / Check ID</th>
              <th className="py-2.5 px-3">Severity</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Evidence / Mismatch Rationale</th>
              <th className="py-2.5 px-3 text-right">Trace</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#22303A]">
            {validationResults.map((item) => {
              const isFail = item.status.includes("FAIL") || item.status.includes("CONTRADICTION");
              const isWarn = item.status.includes("WARN");
              const isNotVerifiable = item.status === "NOT_VERIFIABLE";

              const matchingEv = evidenceList.find(
                (e) =>
                  e.finding_type.toLowerCase() === item.validation_type.toLowerCase() ||
                  e.field_name?.toLowerCase() === item.validation_type.toLowerCase()
              );

              // Extract evidence metadata
              const evMeta = item.evidence as Record<string, unknown>;
              const checkId = evMeta?.check_id as string | undefined;
              const ruleId = evMeta?.rule_id as string | undefined;
              const kbDocument = evMeta?.knowledge_base_document as string | undefined;
              const kbChunk = evMeta?.knowledge_base_chunk as string | undefined;
              const evidenceText = evMeta?.evidence_text as string | undefined;
              const notVerifiableReason = evMeta?.not_verifiable_reason as string | undefined;

              const rowBg = isFail
                ? "bg-[#D9534F]/10 border-l-2 border-l-[#D9534F]"
                : isNotVerifiable
                ? "bg-[#E0A93D]/5 border-l-2 border-l-[#E0A93D]"
                : isWarn
                ? "bg-[#E0A93D]/5"
                : "hover:bg-[#131A21]/50";

              return (
                <tr key={item.id} className={`transition-colors font-mono text-[11px] ${rowBg}`}>
                  {/* Validation type */}
                  <td className="py-2.5 px-3 font-semibold text-[#E8EDF1] uppercase align-top">
                    {item.validation_type.replaceAll("_", " ")}
                  </td>

                  {/* Rule / Check ID */}
                  <td className="py-2.5 px-3 align-top">
                    {(checkId || ruleId) ? (
                      <span className="text-[#E0A93D] text-[9px] font-bold bg-[#E0A93D]/10 border border-[#E0A93D]/30 px-1.5 py-0.5 rounded">
                        {checkId || ruleId}
                      </span>
                    ) : (
                      <span className="text-[#8B99A6] text-[9px]">—</span>
                    )}
                  </td>

                  {/* Severity */}
                  <td className="py-2.5 px-3 align-top">
                    <span
                      className={`inline-block font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                        item.severity === "ERROR" || item.severity === "CRITICAL"
                          ? "border-[#D9534F] bg-[#D9534F]/20 text-[#D9534F]"
                          : item.severity === "WARNING"
                          ? "border-[#E0A93D] bg-[#E0A93D]/10 text-[#E0A93D]"
                          : "border-[#22303A] bg-[#131A21] text-[#8B99A6]"
                      }`}
                    >
                      {item.severity || "INFO"}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-2.5 px-3 align-top">
                    <StatusBadge status={item.status} />
                  </td>

                  {/* Message + Evidence snippet */}
                  <td className="py-2.5 px-3 align-top font-sans text-xs max-w-[280px]">
                    <div className="text-[#E8EDF1] leading-relaxed">{item.message}</div>

                    {notVerifiableReason && (
                      <div className="mt-1 text-[10px] text-[#E0A93D] italic">{notVerifiableReason}</div>
                    )}

                    {/* KB Citation */}
                    {kbDocument && (
                      <div className="mt-1.5 flex items-start gap-1.5 bg-[#131A21] border border-[#22303A] rounded p-1.5">
                        <BookOpen size={10} className="text-[#3DDC84] shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <div className="text-[9px] text-[#3DDC84] font-bold">KB: {kbDocument}</div>
                          {kbChunk && <div className="text-[9px] text-[#8B99A6]">chunk: {kbChunk}</div>}
                          {evidenceText && (
                            <p className="text-[9px] text-[#8B99A6] italic leading-relaxed line-clamp-2">
                              "{evidenceText}"
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Action Trace */}
                  <td className="py-2.5 px-3 text-right align-top">
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
