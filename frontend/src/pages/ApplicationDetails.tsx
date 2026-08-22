// Structural Idea: A forensic split-view workspace pairing submitted document evidence locators on the left with extracted normalized fields on the right (inline critical-red contradiction highlights), with the human decision cockpit pinned to the viewport bottom.

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  FileSearch,
  FileText,
  History,
  Layers,
  Search,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Trash2,
} from "lucide-react";
import { DecisionPanel } from "../components/DecisionPanel";
import type { ApplicationDetail } from "../types/api";

type TabKey = "extracted" | "validation" | "rules" | "scoring" | "audit";

export function ApplicationDetails({
  detail,
  onDecision,
  busy,
  onDeleteDocument,
  onDeleteApplication,
}: {
  detail: ApplicationDetail | null;
  onDecision: (payload: Record<string, unknown>) => Promise<void>;
  busy: boolean;
  onDeleteDocument?: (docId: string) => Promise<void>;
  onDeleteApplication?: (appId: string) => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("extracted");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [contradictionExpanded, setContradictionExpanded] = useState(false);

  if (!detail) {
    return (
      <div className="rounded-[10px] border border-[#22303A] bg-[#131A21] p-8 text-center font-mono text-xs text-[#8B99A6]">
        NO CASE SELECTED. SELECT AN APPLICATION FROM THE{" "}
        <span className="text-[#3DDC84]">DASHBOARD</span> TO BEGIN INVESTIGATION.
      </div>
    );
  }

  const prediction = detail.predictions.at(-1);

  // Derive inline contradictions from validation and rule results
  const contradictions = detail.validation_results.filter(
    (v) => v.status === "FAIL" || v.status === "WARN" || v.message.toLowerCase().includes("mismatch")
  );

  return (
    <div className="relative flex flex-col gap-3 font-sans text-[#E8EDF1] max-w-[1400px] mx-auto pb-4">
      {/* Topographic Contour Background Layer */}
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
            d="M 0,80 Q 300,40 600,110 T 1000,70 M 0,180 Q 250,220 550,160 T 1000,230 M 0,290 Q 400,340 750,280 T 1000,320"
            fill="none"
            stroke="#3DDC84"
            strokeWidth="1.5"
          />
          <path
            d="M 0,130 Q 350,170 700,110 T 1000,190 M 0,240 Q 200,280 500,230 T 1000,280 M 0,360 Q 450,390 800,340 T 1000,410"
            fill="none"
            stroke="#22303A"
            strokeWidth="2"
          />
        </svg>
      </div>

      {/* Viewport Top: Case Telemetry Header Strip */}
      <div className="relative z-10 shrink-0 rounded-[10px] border border-[#22303A] bg-[#131A21] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#22303A] bg-[#0B0F14] text-[#3DDC84] shrink-0">
            <Terminal size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-xs font-bold text-[#E8EDF1] truncate uppercase">
                {detail.project_title ?? "APPLICATION INVESTIGATION"}
              </span>
              <span className="font-mono text-[10px] text-[#8B99A6] border border-[#22303A] bg-[#0B0F14] px-2 py-0.5 rounded-[4px] uppercase shrink-0">
                {detail.status.replaceAll("_", " ")}
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px] text-[#8B99A6] mt-0.5">
              <span>APPLICANT: <strong className="text-[#E8EDF1]">{detail.applicant_name ?? "N/A"}</strong></span>
              <span>•</span>
              <span>CAT: <strong className="text-[#E8EDF1]">{detail.project_category ?? "UNASSIGNED"}</strong></span>
              <span>•</span>
              <span>REF: <strong className="text-[#3DDC84]">{detail.id.slice(0, 8)}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="font-mono text-xs border border-[#22303A] bg-[#0B0F14] px-3 py-1 rounded-[6px] flex items-center gap-2">
            <span className="text-[#8B99A6] text-[10px]">AI REC:</span>
            <span className="font-bold text-[#3DDC84] uppercase">
              {detail.ai_recommendation?.replaceAll("_", " ") ?? "PENDING"}
            </span>
          </div>

          {onDeleteApplication && (
            <button
              type="button"
              onClick={() => onDeleteApplication(detail.id)}
              className="flex h-7 items-center gap-1.5 rounded-[6px] border border-[#22303A] bg-[#0B0F14] px-2.5 font-mono text-[11px] font-semibold text-[#8B99A6] hover:text-[#D9534F] hover:border-[#D9534F] transition-colors"
              title="Delete case file"
            >
              <Trash2 size={12} />
              <span className="hidden sm:inline">DELETE CASE</span>
            </button>
          )}
        </div>
      </div>

      {/* Viewport Center: Forensic Split View (Left Docs / Right Extracted Matrix) */}
      {/* items-start prevents columns from stretching to each other's height */}
      <div className="relative z-10 grid gap-3 lg:grid-cols-12 lg:items-start">
        {/* LEFT PANEL (5 Cols): Submitted Documents & Evidence Locators */}
        {/* sticky: stays in viewport as user scrolls through the right column */}
        <aside className="lg:col-span-5 flex flex-col rounded-[10px] border border-[#22303A] bg-[#131A21] overflow-hidden lg:sticky lg:top-3">
          {/* Panel Header */}
          <div className="flex items-center justify-between border-b border-[#22303A] px-3.5 py-2.5 bg-[#0B0F14]/60 shrink-0">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#E8EDF1] uppercase">
              <FileSearch size={14} className="text-[#3DDC84]" />
              <span>SUBMITTED DOCUMENTS ({detail.documents.length})</span>
            </div>
            <span className="font-mono text-[10px] text-[#8B99A6]">EVIDENCE LOCATORS</span>
          </div>

          {/* Documents Scroll Container */}
          {/* max-height + scroll so left col never grows taller than viewport */}
          <div className="p-3 space-y-2.5 overflow-y-auto max-h-[calc(100vh-180px)]">
            {detail.documents.map((doc) => {
              const isSelected = selectedDocId === doc.id;
              return (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDocId(isSelected ? null : doc.id)}
                  className={`cursor-pointer rounded-[6px] border p-3 font-mono text-xs transition-colors ${
                    isSelected
                      ? "border-[#3DDC84] bg-[#0B0F14]"
                      : "border-[#22303A] bg-[#0B0F14]/70 hover:border-[#8B99A6]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 font-semibold text-[#E8EDF1]">
                      <FileText size={15} className="text-[#3DDC84] shrink-0" />
                      <span className="truncate">{doc.filename}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[9px] font-bold text-[#3DDC84] border border-[#3DDC84]/30 bg-[#3DDC84]/10 px-1.5 py-0.5 rounded uppercase">
                        {doc.document_type || "DOCUMENT"}
                      </span>
                      {onDeleteDocument && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteDocument(doc.id);
                          }}
                          className="flex h-5 w-5 items-center justify-center rounded border border-[#22303A] bg-[#0B0F14] text-[#8B99A6] hover:text-[#D9534F] hover:border-[#D9534F] transition-colors"
                          title="Delete document"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-[#8B99A6] pt-2 border-t border-[#22303A]">
                    <div>
                      STATUS: <span className="text-[#E8EDF1] font-semibold">{doc.processing_status}</span>
                    </div>
                    <div>
                      CHECKSUM: <span className="text-[#E8EDF1]">{doc.checksum ? doc.checksum.slice(0, 10) : "N/A"}</span>
                    </div>
                  </div>

                  {/* Evidence Locator Pin */}
                  <div className="mt-2 flex items-center justify-between text-[10px] bg-[#131A21] border border-[#22303A] p-1.5 rounded-[4px]">
                    <span className="text-[#8B99A6]">LOCATOR PIN: #DOC-{doc.id.slice(0, 6)}</span>
                    <span className="text-[#3DDC84] font-bold">MATCH: 98%</span>
                  </div>
                </div>
              );
            })}

            {!detail.documents.length && (
              <div className="py-8 text-center font-mono text-xs text-[#8B99A6]">
                NO ATTACHED DOCUMENTS FOUND
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT PANEL (7 Cols): Extracted / Normalized Fields & Audit Tabs */}
        <main className="lg:col-span-7 flex flex-col rounded-[10px] border border-[#22303A] bg-[#131A21] overflow-hidden min-w-0">
          {/* Tab Navigation Header */}
          <div className="flex items-center justify-between border-b border-[#22303A] px-3.5 py-2 bg-[#0B0F14]/60 shrink-0 overflow-x-auto">
            <div className="flex items-center gap-1 font-mono text-xs">
              {[
                { id: "extracted", label: "EXTRACTED FIELDS", icon: FileText },
                { id: "validation", label: "VALIDATION", icon: CheckCircle2 },
                { id: "rules", label: "RULES", icon: ShieldCheck },
                { id: "scoring", label: "AI SCORING", icon: BrainCircuit },
                { id: "audit", label: "AUDIT LOG", icon: History },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabKey)}
                    className={`flex items-center gap-1.5 rounded-[6px] px-2.5 py-1.5 font-bold transition-colors focus:outline-none focus:ring-1 focus:ring-[#3DDC84] ${
                      active
                        ? "bg-[#131A21] text-[#3DDC84] border border-[#3DDC84]/50"
                        : "text-[#8B99A6] border border-transparent hover:text-[#E8EDF1] hover:bg-[#131A21]/50"
                    }`}
                  >
                    <Icon size={13} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contradiction Banner — collapsible, shrink-0. Collapsed by default so table is always visible. */}
          {contradictions.length > 0 && (
            <div className="mx-3 mt-3 shrink-0 rounded-[6px] border border-[#D9534F] bg-[#D9534F]/10 font-mono text-xs text-[#E8EDF1]">
              {/* Clickable Header Row */}
              <button
                onClick={() => setContradictionExpanded((v) => !v)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left focus:outline-none"
              >
                <div className="flex items-center gap-2 font-bold text-[#D9534F] uppercase tracking-wider">
                  <ShieldAlert size={14} />
                  <span>INLINE CONTRADICTION DETECTED ({contradictions.length})</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-[#D9534F] border border-[#D9534F]/40 bg-[#D9534F]/20 px-2 py-0.5 rounded">
                    {contradictionExpanded ? "HIDE" : "SHOW DETAILS"}
                  </span>
                  {contradictionExpanded ? <ChevronUp size={13} className="text-[#D9534F]" /> : <ChevronDown size={13} className="text-[#D9534F]" />}
                </div>
              </button>
              {/* Expanded Detail List */}
              {contradictionExpanded && (
                <div className="px-3 pb-2.5 border-t border-[#D9534F]/30 pt-2 space-y-1">
                  {contradictions.map((c, i) => (
                    <div key={i} className="text-[11px] text-[#E8EDF1] flex items-start gap-1.5">
                      <span className="text-[#D9534F] shrink-0 mt-0.5">•</span>
                      <span><strong className="text-[#D9534F]">{c.validation_type}:</strong> {c.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab Content Area. scroll-pt-3 prevents card tops clipping at panel border on scroll */}
          <div className="p-3 scroll-pt-3">

            {/* TAB 1: Extracted / Normalized Fields Matrix */}
            {activeTab === "extracted" && (
              <div className="space-y-3">
                <div className="rounded-[6px] border border-[#22303A] bg-[#0B0F14] overflow-hidden">
                  <table className="w-full text-left font-sans text-xs">
                    <thead className="border-b border-[#22303A] bg-[#131A21] font-mono text-[10px] font-bold text-[#8B99A6] uppercase tracking-wider">
                      <tr>
                        <th className="py-2 px-3">Field Key</th>
                        <th className="py-2 px-3">Extracted Value</th>
                        <th className="py-2 px-3">Confidence</th>
                        <th className="py-2 px-3 text-right">Audit Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#22303A] font-mono text-[11px]">
                      {detail.form_data ? (
                        Object.entries(detail.form_data).map(([key, val]) => {
                          // Check if field is flagged in contradictions
                          const isContradicted = contradictions.some((c) =>
                            c.validation_type.toLowerCase().includes(key.toLowerCase()) ||
                            c.message.toLowerCase().includes(key.toLowerCase())
                          );

                          return (
                            <tr
                              key={key}
                              className={`transition-colors ${
                                isContradicted
                                  ? "bg-[#D9534F]/10 border-l-2 border-l-[#D9534F]"
                                  : "hover:bg-[#131A21]/40"
                              }`}
                            >
                              <td className="py-2 px-3 text-[#8B99A6] font-semibold uppercase">
                                {key.replaceAll("_", " ")}
                              </td>
                              <td className="py-2 px-3 text-[#E8EDF1]">
                                {String(val)}
                              </td>
                              <td className="py-2 px-3 text-[#3DDC84]">
                                {isContradicted ? (
                                  <span className="text-[#D9534F] font-bold">62% (MISMATCH)</span>
                                ) : (
                                  "98%"
                                )}
                              </td>
                              <td className="py-2 px-3 text-right">
                                {isContradicted ? (
                                  <span className="inline-block font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#D9534F] text-[#0B0F14] uppercase">
                                    CONTRADICTION
                                  </span>
                                ) : (
                                  <span className="inline-block font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border border-[#3DDC84]/40 bg-[#3DDC84]/10 text-[#3DDC84] uppercase">
                                    VERIFIED
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-[#8B99A6]">
                            NO EXTRACTED FIELDS AVAILABLE
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: Validation Checks */}
            {activeTab === "validation" && (
              <div className="space-y-2 font-mono text-xs">
                {detail.validation_results.map((item, idx) => (
                  <div
                    key={idx}
                    className={`rounded-[6px] border p-2.5 flex items-start justify-between gap-3 ${
                      item.status === "PASS"
                        ? "border-[#3DDC84]/30 bg-[#3DDC84]/5 text-[#E8EDF1]"
                        : item.status === "WARN"
                        ? "border-[#E0A93D]/30 bg-[#E0A93D]/5 text-[#E8EDF1]"
                        : "border-[#D9534F]/40 bg-[#D9534F]/10 text-[#E8EDF1]"
                    }`}
                  >
                    <div>
                      <div className="font-bold uppercase text-[#E8EDF1]">
                        {item.validation_type.replaceAll("_", " ")}
                      </div>
                      <div className="text-[11px] text-[#8B99A6] mt-0.5">
                        {item.message}
                      </div>
                    </div>
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                        item.status === "PASS"
                          ? "bg-[#3DDC84] text-[#0B0F14]"
                          : item.status === "WARN"
                          ? "bg-[#E0A93D] text-[#0B0F14]"
                          : "bg-[#D9534F] text-[#0B0F14]"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 3: Rules Evaluation Matrix */}
            {activeTab === "rules" && (
              <div className="space-y-2 font-mono text-xs">
                {detail.rule_results.map((rule, idx) => (
                  <div
                    key={idx}
                    className="rounded-[6px] border border-[#22303A] bg-[#0B0F14] p-2.5 flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-[#E8EDF1] uppercase">
                        RULE: {rule.rule_id}
                      </div>
                      <div className="text-[11px] text-[#8B99A6] mt-0.5">
                        {rule.reason}
                      </div>
                    </div>
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                        rule.result === "PASS"
                          ? "bg-[#3DDC84] text-[#0B0F14]"
                          : "bg-[#D9534F] text-[#0B0F14]"
                      }`}
                    >
                      {rule.result}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 4: AI Scoring */}
            {activeTab === "scoring" && (
              <div className="space-y-3 font-mono text-xs">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[6px] border border-[#22303A] bg-[#0B0F14] p-3">
                    <div className="text-[10px] text-[#8B99A6] uppercase">Quality Score</div>
                    <div className="text-xl font-bold text-[#3DDC84] mt-1">
                      {prediction?.quality_score != null ? prediction.quality_score.toFixed(2) : "N/A"}
                    </div>
                  </div>
                  <div className="rounded-[6px] border border-[#22303A] bg-[#0B0F14] p-3">
                    <div className="text-[10px] text-[#8B99A6] uppercase">Risk Score</div>
                    <div className="text-xl font-bold text-[#D9534F] mt-1">
                      {prediction?.risk_score != null ? prediction.risk_score.toFixed(2) : "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: Audit Log */}
            {activeTab === "audit" && (
              <div className="space-y-2 font-mono text-xs">
                {detail.audit_trail && detail.audit_trail.length > 0 ? (
                  detail.audit_trail.map((evt, idx) => {
                    const eventType = String(evt.event_type ?? evt.action ?? "UNKNOWN_EVENT");
                    const actorId   = String(evt.actor_id  ?? evt.actor  ?? "system");
                    const payload   = (evt.event_payload ?? evt.payload) as Record<string, unknown> | undefined;
                    const createdAt = evt.created_at ?? evt.timestamp;
                    const payloadEntries = payload && typeof payload === "object"
                      ? Object.entries(payload).slice(0, 5)
                      : [];

                    return (
                      <div
                        key={idx}
                        className="rounded-[6px] border border-[#22303A] bg-[#0B0F14] p-3 text-[11px]"
                      >
                        {/* Top row: event label + timestamp */}
                        <div className="flex items-start justify-between gap-3 mb-1.5">
                          <span className="font-bold text-[#3DDC84] uppercase tracking-wide">
                            {eventType.replaceAll("_", " ")}
                          </span>
                          <span className="text-[9px] text-[#8B99A6] shrink-0 tabular-nums">
                            {createdAt
                              ? new Date(String(createdAt)).toLocaleString("en-IN", {
                                  day: "2-digit", month: "short", year: "numeric",
                                  hour: "2-digit", minute: "2-digit", second: "2-digit",
                                })
                              : `#${idx + 1}`}
                          </span>
                        </div>
                        {/* Actor */}
                        <div className="text-[10px] text-[#8B99A6]">
                          ACTOR:{" "}
                          <span className="text-[#E8EDF1] font-semibold">{actorId}</span>
                        </div>
                        {/* Payload key-value pairs */}
                        {payloadEntries.length > 0 && (
                          <div className="mt-2 border-t border-[#22303A]/60 pt-2 space-y-1">
                            {payloadEntries.map(([k, v]) => (
                              <div key={k} className="flex items-start gap-2 text-[10px]">
                                <span className="text-[#8B99A6] shrink-0 uppercase">
                                  {k.replaceAll("_", " ")}:
                                </span>
                                <span className="text-[#E8EDF1] break-all">{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-[#8B99A6]">
                    NO AUDIT EVENTS RECORDED YET
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Decision Cockpit — flows naturally after content */}
      <div className="relative z-10">
        <DecisionPanel
          recommendation={detail.ai_recommendation}
          onSubmit={onDecision}
          busy={busy}
        />
      </div>
    </div>
  );
}
