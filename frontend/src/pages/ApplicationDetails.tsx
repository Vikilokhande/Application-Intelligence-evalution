import { useState } from "react";
import {
  FileText,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileSearch,
  BookOpen,
  History,
  BrainCircuit,
  UserCheck
} from "lucide-react";
import { DecisionPanel } from "../components/DecisionPanel";
import { EvidenceList } from "../components/EvidenceList";
import { KnowledgeSearch } from "../components/KnowledgeSearch";
import { ScoreBar } from "../components/ScoreBar";
import { SectionPanel } from "../components/SectionPanel";
import { StatusBadge } from "../components/StatusBadge";
import type { ApplicationDetail } from "../types/api";

type TabKey = "overview" | "documents" | "validation" | "rules" | "scoring" | "audit";

export function ApplicationDetails({
  detail,
  onDecision,
  busy
}: {
  detail: ApplicationDetail | null;
  onDecision: (payload: Record<string, unknown>) => Promise<void>;
  busy: boolean;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  if (!detail) {
    return (
      <SectionPanel title="Application Investigation Workspace">
        <div className="p-8 text-center text-sm text-[#64748B]">
          No application selected. Select an application from the <span className="font-bold text-[#0F766E]">Dashboard</span> to begin investigation.
        </div>
      </SectionPanel>
    );
  }

  const prediction = detail.predictions.at(-1);

  return (
    <div className="space-y-6">
      {/* Investigation Workspace Header */}
      <div className="panel bg-gradient-to-r from-white via-[#F8FAFC] to-[#F0FDF4] p-5 shadow-sm border-l-4 border-l-[#0F766E]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold text-[#0F172A] tracking-tight">
                {detail.project_title ?? "Application Investigation Workspace"}
              </h1>
              <StatusBadge value={detail.status} />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-4 text-xs text-[#475569]">
              <span><strong className="text-[#0F172A]">Applicant:</strong> {detail.applicant_name ?? "Pending"}</span>
              <span>•</span>
              <span><strong className="text-[#0F172A]">Category:</strong> {detail.project_category ?? "Unassigned"}</span>
              <span>•</span>
              <span><strong className="text-[#0F172A]">External Ref:</strong> {detail.external_reference ?? detail.id.slice(0, 8)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-sky-300 bg-sky-50 px-3.5 py-2">
            <Sparkles size={16} className="text-sky-700" />
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-sky-800">AI Recommendation</div>
              <div className="text-xs font-bold text-sky-950">{detail.ai_recommendation?.replaceAll("_", " ") ?? "Pending Evaluation"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Left/Center Investigation Tabs + Right Intelligence Copilot */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* LEFT / CENTER: Main Investigation Workspace (8 Cols) */}
        <div className="space-y-5 lg:col-span-8">
          {/* Tab Navigation Controls */}
          <div className="flex overflow-x-auto border-b border-[#E2E8F0] bg-white rounded-xl p-1 shadow-sm gap-1">
            {[
              { id: "overview", label: "Overview", icon: FileText },
              { id: "documents", label: "Documents", icon: FileSearch },
              { id: "validation", label: "Validation", icon: CheckCircle2 },
              { id: "rules", label: "Rules", icon: ShieldCheck },
              { id: "scoring", label: "AI Score", icon: BrainCircuit },
              { id: "audit", label: "Audit Log", icon: History }
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabKey)}
                  className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition ${
                    active
                      ? "bg-[#0F766E] text-white shadow-sm"
                      : "text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: Overview */}
          {activeTab === "overview" && (
            <div className="space-y-5">
              <SectionPanel title="Application Form Data Summary">
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  <Field label="Applicant Name" value={String(detail.applicant_name ?? "N/A")} />
                  <Field label="Project Category" value={String(detail.project_category ?? "N/A")} />
                  <Field label="Scheme Reference" value={String(detail.scheme_id ?? "Default Scheme")} />
                  <Field label="Processing Status" value={String(detail.processing_status ?? "N/A")} />
                  <Field label="Created At" value={new Date(detail.created_at).toLocaleString()} />
                  <Field label="Last Updated" value={new Date(detail.updated_at).toLocaleString()} />
                </div>
                {detail.form_data && (
                  <div className="mt-4 border-t border-[#E2E8F0] pt-4">
                    <span className="field-label mb-2">Submitted Form Payload</span>
                    <pre className="max-h-60 overflow-auto rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] p-3 text-xs font-mono text-[#0F172A]">
                      {JSON.stringify(detail.form_data, null, 2)}
                    </pre>
                  </div>
                )}
              </SectionPanel>

              <SectionPanel title="Recorded Evidence Traces">
                <EvidenceList evidence={detail.evidence} />
              </SectionPanel>
            </div>
          )}

          {/* TAB 2: Documents */}
          {activeTab === "documents" && (
            <SectionPanel title={`Uploaded Application Documents (${detail.documents.length})`}>
              <div className="grid gap-4 sm:grid-cols-2">
                {detail.documents.map((doc) => (
                  <article key={doc.id} className="panel p-4 space-y-2 border-[#CBD5E1]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-[#0F172A] text-xs flex items-center gap-2 truncate">
                        <FileText size={16} className="text-[#0F766E] shrink-0" />
                        <span className="truncate">{doc.filename}</span>
                      </div>
                      <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 uppercase">
                        {doc.document_type || "DOCUMENT"}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#64748B] space-y-1 font-mono">
                      <div>Status: <span className="font-bold text-slate-800">{doc.processing_status}</span></div>
                      <div>Uploaded: {new Date(doc.uploaded_at).toLocaleString()}</div>
                      <div>Checksum: <span className="text-[10px]">{doc.checksum ? doc.checksum.slice(0, 16) : "N/A"}...</span></div>
                    </div>
                  </article>
                ))}
                {!detail.documents.length && (
                  <div className="text-xs text-[#64748B] italic col-span-2 py-4 text-center">
                    No supporting documents uploaded.
                  </div>
                )}
              </div>
            </SectionPanel>
          )}

          {/* TAB 3: Validation */}
          {activeTab === "validation" && (
            <SectionPanel title="Cross-Document Validation Checks">
              <ResultRows rows={detail.validation_results.map((i) => ({ name: i.validation_type, status: i.status, reason: i.message }))} />
            </SectionPanel>
          )}

          {/* TAB 4: Rules */}
          {activeTab === "rules" && (
            <SectionPanel title="Scheme Rule Verification Matrix">
              <ResultRows rows={detail.rule_results.map((i) => ({ name: i.rule_id, status: i.result, reason: i.reason }))} />
            </SectionPanel>
          )}

          {/* TAB 5: AI Scoring */}
          {activeTab === "scoring" && (
            <SectionPanel title="AI Prediction & Feature Contribution Scores">
              <div className="grid gap-5 md:grid-cols-2">
                <ScoreBar label="Quality Score" value={prediction?.quality_score ?? null} tone="bg-[#0F766E]" />
                <ScoreBar label="Risk Score" value={prediction?.risk_score ?? null} tone="bg-rose-600" />
              </div>
              {prediction?.feature_contributions && (
                <div className="mt-5 space-y-2 border-t border-[#E2E8F0] pt-4">
                  <span className="field-label">Model Feature Contributions</span>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Object.entries(prediction.feature_contributions).map(([ft, val]) => (
                      <div key={ft} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-[#F8FAFC] text-xs">
                        <span className="font-semibold text-slate-700">{ft.replaceAll("_", " ")}</span>
                        <span className={`font-mono font-bold ${val >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                          {val >= 0 ? `+${val.toFixed(2)}` : val.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </SectionPanel>
          )}

          {/* TAB 6: Audit */}
          {activeTab === "audit" && (
            <SectionPanel title="Application Audit Log Events">
              <div className="space-y-2.5">
                {detail.audit_trail && detail.audit_trail.length > 0 ? (
                  detail.audit_trail.map((evt, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-[#E2E8F0] bg-white text-xs flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-[#0F172A]">{String(evt.action || "AUDIT_EVENT")}</div>
                        <div className="text-[11px] text-[#64748B] mt-0.5">{String(evt.details || evt.description || "")}</div>
                      </div>
                      <span className="font-mono text-[10px] text-slate-500 shrink-0">
                        {evt.timestamp ? new Date(String(evt.timestamp)).toLocaleString() : `#${idx + 1}`}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-[#64748B] italic p-3">No audit events recorded for this application.</div>
                )}
              </div>
            </SectionPanel>
          )}

          {/* Human Decision Cockpit Box */}
          <DecisionPanel recommendation={detail.ai_recommendation} onSubmit={onDecision} busy={busy} />
        </div>

        {/* RIGHT PANEL: Intelligence Copilot & RAG Knowledge Search (4 Cols) */}
        <aside className="space-y-5 lg:col-span-4">
          <SectionPanel title="Intelligence Copilot">
            <div className="space-y-4">
              {/* Copilot Context Badge */}
              <div className="rounded-xl border border-sky-300 bg-sky-50 p-3.5 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-sky-900">
                  <Sparkles size={16} className="text-sky-700" /> Contextual AI Assessment
                </div>
                <p className="text-[11px] text-sky-800 leading-relaxed">
                  Automated analysis performed for <strong className="text-sky-950">{detail.project_title ?? "Selected Application"}</strong>.
                </p>
              </div>

              {/* Live Confidence Index */}
              <div className="panel p-3.5 space-y-2 border-[#CBD5E1]">
                <div className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Model Confidence</div>
                <div className="text-2xl font-extrabold font-mono text-[#0F766E]">
                  {prediction?.confidence != null ? `${Math.round(prediction.confidence * 100)}%` : "N/A"}
                </div>
                <div className="text-[10px] text-[#64748B]">Confidence score extracted from model evaluation.</div>
              </div>

              {/* RAG Knowledge Base Search */}
              <div className="panel p-3.5 space-y-3 border-[#CBD5E1]">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  <BookOpen size={15} className="text-[#0F766E]" /> Policy RAG Knowledge Base
                </div>
                <KnowledgeSearch initialQuery={detail.project_category || ""} />
              </div>
            </div>
          </SectionPanel>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">{label}</div>
      <div className="mt-1 font-semibold text-[#0F172A] text-xs">{value}</div>
    </div>
  );
}

function ResultRows({ rows }: { rows: Array<{ name: string; status: string; reason: string }> }) {
  return (
    <div className="divide-y divide-[#E2E8F0]">
      {rows.map((row, idx) => (
        <div className="grid gap-2 py-3 md:grid-cols-[220px_120px_1fr] items-center text-xs" key={`${row.name}-${idx}`}>
          <div className="font-bold text-[#0F172A]">{row.name.replaceAll("_", " ")}</div>
          <div>
            <StatusBadge value={row.status} />
          </div>
          <div className="text-[#475569]">{row.reason}</div>
        </div>
      ))}
      {!rows.length && <div className="py-4 text-xs text-[#64748B] italic">No results recorded.</div>}
    </div>
  );
}
