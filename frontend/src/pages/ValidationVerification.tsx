// Structural Idea: A forensic contradiction matrix & scheme rule audit matrix presenting cross-document validation checks with inline critical-red mismatch highlights and evidence trace drawer.

import { useState } from "react";
import { ShieldCheck, Terminal } from "lucide-react";
import { ContradictionMatrix } from "../components/ContradictionMatrix";
import { EvidenceDrawer } from "../components/EvidenceDrawer";
import type { ApplicationDetail, EvidenceRead } from "../types/api";

export function ValidationVerification({
  detail,
}: {
  detail: ApplicationDetail | null;
}) {
  const [selectedEvidence, setSelectedEvidence] =
    useState<EvidenceRead | null>(null);

  if (!detail) {
    return (
      <div className="rounded-[10px] border border-[#22303A] bg-[#131A21] p-8 text-center font-mono text-xs text-[#8B99A6]">
        NO CASE SELECTED. SELECT AN APPLICATION FROM THE{" "}
        <span className="text-[#3DDC84]">DASHBOARD</span> TO INSPECT VALIDATION CHECKS.
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-3 font-sans text-[#E8EDF1] max-w-[1400px] mx-auto pb-4">
      {/* Topographic Contour Background Layer Signature Motif */}
      <div
        className="pointer-events-none absolute -inset-4 z-0 overflow-hidden opacity-[0.08]"
        aria-hidden="true"
      >
        <svg
          className="h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
          width="100%"
          height="100%"
          viewBox="0 0 1000 600"
          preserveAspectRatio="none"
        >
          <path
            d="M 0,80 Q 250,40 500,110 T 1000,70 M 0,190 Q 300,150 600,220 T 1000,180 M 0,300 Q 200,270 500,330 T 1000,290"
            fill="none"
            stroke="#3DDC84"
            strokeWidth="1.5"
          />
          <path
            d="M 0,130 Q 350,170 700,110 T 1000,190 M 0,240 Q 200,280 500,230 T 1000,280 M 0,370 Q 450,400 800,350 T 1000,420"
            fill="none"
            stroke="#22303A"
            strokeWidth="2"
          />
        </svg>
      </div>

      {/* Validation Telemetry Header Strip */}
      <div className="relative z-10 shrink-0 rounded-[10px] border border-[#22303A] bg-[#131A21] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-[#22303A] bg-[#0B0F14] text-[#3DDC84] shrink-0">
            <Terminal size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-sm font-bold tracking-wider text-[#E8EDF1] uppercase truncate">
                CROSS-DOCUMENT VALIDATION & RULE VERIFICATION
              </h1>
              <span className="font-mono text-[10px] font-semibold text-[#3DDC84] bg-[#3DDC84]/10 border border-[#3DDC84]/30 px-2 py-0.5 rounded-[4px] shrink-0">
                AUDIT MATRIX ACTIVE
              </span>
            </div>
            <p className="text-xs text-[#8B99A6] mt-0.5 truncate">
              Automated document consistency audit for:{" "}
              <strong className="text-[#E8EDF1]">
                {detail.project_title ?? "Selected Case"}
              </strong>
            </p>
          </div>
        </div>

        <div className="font-mono text-xs border border-[#22303A] bg-[#0B0F14] px-3 py-1.5 rounded-[6px] text-[#3DDC84] uppercase">
          STATUS: {detail.status.replaceAll("_", " ")}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 space-y-3">
        {/* Section 1: Cross-Document Contradiction Matrix Table */}
        <div className="rounded-[10px] border border-[#22303A] bg-[#131A21] p-3 flex flex-col">
          <div className="flex items-center justify-between border-b border-[#22303A] pb-2 mb-2">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#E8EDF1] uppercase">
              <ShieldCheck size={14} className="text-[#3DDC84]" />
              <span>CROSS-DOCUMENT CONTRADICTION MATRIX</span>
            </div>
            <span className="font-mono text-[10px] text-[#8B99A6]">
              CHECKS: {detail.validation_results.length}
            </span>
          </div>

          <div className="max-h-[300px] overflow-y-auto"
            style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(61,220,132,0.4) #22303A" }}
          >
            <ContradictionMatrix
              validationResults={detail.validation_results}
              evidenceList={detail.evidence}
              onInspectEvidence={(item) => setSelectedEvidence(item)}
            />
          </div>
        </div>

        {/* Section 2: Scheme Rule Verification Grid */}
        <div className="rounded-[10px] border border-[#22303A] bg-[#131A21] p-3 flex flex-col">
          <div className="flex items-center justify-between border-b border-[#22303A] pb-2 mb-2 shrink-0">
            <h2 className="font-mono text-xs font-bold text-[#E8EDF1] uppercase tracking-wider">
              SCHEME RULE VERIFICATION GRID ({detail.rule_results.length})
            </h2>
            <span className="font-mono text-[10px] text-[#3DDC84]">
              POLICY MATRIX
            </span>
          </div>

          <div className="overflow-y-auto max-h-[350px] grid gap-2 sm:grid-cols-2"
            style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(61,220,132,0.4) #22303A" }}
          >
            {detail.rule_results.map((item) => {
              const isFail = item.result === "FAIL";
              return (
                <article
                  key={item.id}
                  className={`rounded-[6px] border p-3 space-y-2 font-mono text-xs ${
                    isFail
                      ? "border-[#D9534F] bg-[#D9534F]/10 text-[#E8EDF1]"
                      : "border-[#22303A] bg-[#0B0F14] text-[#E8EDF1]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 border-b border-[#22303A] pb-1.5">
                    <div>
                      <div className="font-bold text-[#E8EDF1] uppercase flex items-center gap-1.5">
                        <ShieldCheck size={13} className="text-[#3DDC84]" />
                        <span>{item.rule_name || item.rule_id}</span>
                      </div>
                      <span className="text-[9px] text-[#8B99A6]">
                        SEVERITY: {item.severity}
                      </span>
                    </div>
                    <span
                      className={`font-bold px-1.5 py-0.5 rounded text-[9px] uppercase ${
                        isFail
                          ? "bg-[#D9534F] text-[#0B0F14]"
                          : "bg-[#3DDC84] text-[#0B0F14]"
                      }`}
                    >
                      {item.result}
                    </span>
                  </div>

                  <p className="font-sans text-xs text-[#8B99A6] leading-relaxed">
                    {item.reason}
                  </p>

                  <div className="grid gap-1 text-[10px] bg-[#131A21] p-2 rounded border border-[#22303A]">
                    <div>
                      EXPECTED:{" "}
                      <span className="font-bold text-[#3DDC84]">
                        {JSON.stringify(item.expected_value)}
                      </span>
                    </div>
                    <div>
                      ACTUAL:{" "}
                      <span className={`font-bold ${isFail ? "text-[#D9534F]" : "text-[#E8EDF1]"}`}>
                        {JSON.stringify(item.actual_value)}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}

            {!detail.rule_results.length && (
              <div className="py-6 text-center font-mono text-xs text-[#8B99A6] col-span-2">
                NO RULE VERIFICATION RESULTS RECORDED
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slide-over Evidence Drawer */}
      <EvidenceDrawer
        evidence={selectedEvidence}
        onClose={() => setSelectedEvidence(null)}
      />
    </div>
  );
}
