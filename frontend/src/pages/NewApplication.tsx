// Structural Idea: A forensic case intake console framed as opening an official audit ledger file, pairing structured metadata entry on the left with document package verification vault on the right.

import {
  CheckCircle2,
  FileImage,
  FileSpreadsheet,
  FileText,
  FolderPlus,
  PlusCircle,
  RotateCcw,
  ShieldCheck,
  Terminal,
  Upload,
  X,
} from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import type { SchemeRead } from "../types/api";

export function NewApplication({
  schemes,
  onCreate,
}: {
  schemes: SchemeRead[];
  onCreate: (
    payload: Record<string, unknown>,
    files: FileList | null
  ) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    applicant_name: "",
    organization_type: "",
    project_title: "",
    project_category: "",
    project_cost: "",
    duration_months: "",
    environmental_benefit: "",
  });
  const [schemeId, setSchemeId] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  function addFiles(picked: FileList | null) {
    if (!picked) return;
    const incoming = Array.from(picked);
    setFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const fresh = incoming.filter((f) => !existingNames.has(f.name));
      return [...prev, ...fresh];
    });
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function fileIcon(name: string) {
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext))
      return <FileImage size={15} className="text-[#3DDC84] shrink-0" />;
    if (["xlsx", "xls", "csv"].includes(ext))
      return <FileSpreadsheet size={15} className="text-[#3DDC84] shrink-0" />;
    return <FileText size={15} className="text-[#3DDC84] shrink-0" />;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const formData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(form)) {
        if (!value.trim()) continue;
        formData[key] = value.trim();
      }
      if (form.project_cost.trim()) {
        formData.project_cost = Number(form.project_cost);
      }
      if (form.duration_months.trim()) {
        formData.duration_months = Number(form.duration_months);
      }
      // Convert File[] back to a DataTransfer-backed FileList for the API handler
      const dt = new DataTransfer();
      files.forEach((f) => dt.items.add(f));
      await onCreate(
        {
          scheme_id: schemeId || undefined,
          applicant_name: form.applicant_name.trim() || undefined,
          project_title: form.project_title.trim() || undefined,
          project_category: form.project_category.trim() || undefined,
          form_data: formData,
        },
        dt.files.length ? dt.files : null
      );
    } finally {
      setBusy(false);
    }
  }

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  const fileListArray = files;

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
            d="M 0,90 Q 250,50 500,120 T 1000,80 M 0,200 Q 300,160 600,230 T 1000,180 M 0,310 Q 200,280 500,340 T 1000,300"
            fill="none"
            stroke="#3DDC84"
            strokeWidth="1.5"
          />
          <path
            d="M 0,140 Q 350,180 700,120 T 1000,200 M 0,250 Q 200,290 500,240 T 1000,290 M 0,380 Q 450,410 800,360 T 1000,430"
            fill="none"
            stroke="#22303A"
            strokeWidth="2"
          />
        </svg>
      </div>

      {/* Intake Console Header Strip */}
      <div className="relative z-10 shrink-0 rounded-[10px] border border-[#22303A] bg-[#131A21] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-[#22303A] bg-[#0B0F14] text-[#3DDC84]">
            <Terminal size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-sm font-bold tracking-wider text-[#E8EDF1] uppercase">
                NEW CASE FILE INTAKE CONSOLE
              </h1>
              <span className="font-mono text-[10px] font-semibold text-[#3DDC84] bg-[#3DDC84]/10 border border-[#3DDC84]/30 px-2 py-0.5 rounded-[4px]">
                INTAKE DRAFT READY
              </span>
            </div>
            <p className="text-xs text-[#8B99A6] mt-0.5">
              Environmental Application Review & Decision Support • Register metadata & ingest document package
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-[#8B99A6] bg-[#0B0F14] border border-[#22303A] px-3 py-1.5 rounded-[6px]">
          <FolderPlus size={14} className="text-[#3DDC84]" />
          <span>DRAFT REF: DECC-2026-TEMP</span>
        </div>
      </div>

      {/* Main Intake Split View (Left: Form Metadata / Right: Document Package Ingestion Vault) */}
      <form onSubmit={submit} className="relative z-10 grid gap-3 lg:grid-cols-12 lg:items-start">
        {/* LEFT PANEL (7 Cols): Case Metadata Entry Form */}
        <div className="lg:col-span-7 flex flex-col rounded-[10px] border border-[#22303A] bg-[#131A21] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#22303A] px-4 py-2.5 bg-[#0B0F14]/60 shrink-0">
            <h2 className="font-mono text-xs font-bold text-[#E8EDF1] uppercase tracking-wider">
              1. STRUCTURED METADATA ENTRY
            </h2>
            <span className="font-mono text-[10px] text-[#8B99A6]">FIELD MATRIX</span>
          </div>

          <div className="flex-1 p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Scheme Dropdown */}
              <label className="block">
                <span className="block font-mono text-[10px] font-bold text-[#8B99A6] uppercase tracking-wider mb-1">
                  Environmental Scheme *
                </span>
                <select
                  className="w-full rounded-[6px] border border-[#22303A] bg-[#0B0F14] px-3 py-1.5 font-mono text-xs text-[#E8EDF1] focus:outline-none focus:ring-1 focus:ring-[#3DDC84] focus:border-[#3DDC84]"
                  value={schemeId}
                  onChange={(e) => setSchemeId(e.target.value)}
                >
                  <option value="">SELECT SCHEME REGISTRY</option>
                  {schemes.map((scheme) => (
                    <option key={scheme.id} value={scheme.id}>
                      {scheme.name}
                    </option>
                  ))}
                </select>
              </label>

              {/* Applicant Name */}
              <label className="block">
                <span className="block font-mono text-[10px] font-bold text-[#8B99A6] uppercase tracking-wider mb-1">
                  Applicant Entity Name *
                </span>
                <input
                  required
                  placeholder="e.g. TCS Green Infrastructure Ltd"
                  className="w-full rounded-[6px] border border-[#22303A] bg-[#0B0F14] px-3 py-1.5 font-sans text-xs text-[#E8EDF1] placeholder-[#8B99A6]/40 focus:outline-none focus:ring-1 focus:ring-[#3DDC84] focus:border-[#3DDC84]"
                  value={form.applicant_name}
                  onChange={(e) => update("applicant_name", e.target.value)}
                />
              </label>

              {/* Organization Type */}
              <label className="block">
                <span className="block font-mono text-[10px] font-bold text-[#8B99A6] uppercase tracking-wider mb-1">
                  Organization Type
                </span>
                <input
                  placeholder="e.g. Private Limited / PSU / NGO"
                  className="w-full rounded-[6px] border border-[#22303A] bg-[#0B0F14] px-3 py-1.5 font-sans text-xs text-[#E8EDF1] placeholder-[#8B99A6]/40 focus:outline-none focus:ring-1 focus:ring-[#3DDC84] focus:border-[#3DDC84]"
                  value={form.organization_type}
                  onChange={(e) => update("organization_type", e.target.value)}
                />
              </label>

              {/* Project Category */}
              <label className="block">
                <span className="block font-mono text-[10px] font-bold text-[#8B99A6] uppercase tracking-wider mb-1">
                  Project Category
                </span>
                <input
                  placeholder="e.g. Solar Energy / Wastewater / Forestry"
                  className="w-full rounded-[6px] border border-[#22303A] bg-[#0B0F14] px-3 py-1.5 font-sans text-xs text-[#E8EDF1] placeholder-[#8B99A6]/40 focus:outline-none focus:ring-1 focus:ring-[#3DDC84] focus:border-[#3DDC84]"
                  value={form.project_category}
                  onChange={(e) => update("project_category", e.target.value)}
                />
              </label>

              {/* Project Title (Full Width) */}
              <label className="block sm:col-span-2">
                <span className="block font-mono text-[10px] font-bold text-[#8B99A6] uppercase tracking-wider mb-1">
                  Project Title *
                </span>
                <input
                  required
                  placeholder="e.g. 50MW Solar Park & Bio-clearance Phase 1"
                  className="w-full rounded-[6px] border border-[#22303A] bg-[#0B0F14] px-3 py-1.5 font-sans text-xs text-[#E8EDF1] placeholder-[#8B99A6]/40 focus:outline-none focus:ring-1 focus:ring-[#3DDC84] focus:border-[#3DDC84]"
                  value={form.project_title}
                  onChange={(e) => update("project_title", e.target.value)}
                />
              </label>

              {/* Project Cost */}
              <label className="block">
                <span className="block font-mono text-[10px] font-bold text-[#8B99A6] uppercase tracking-wider mb-1">
                  Project Cost (INR)
                </span>
                <input
                  type="number"
                  placeholder="e.g. 12500000"
                  className="w-full rounded-[6px] border border-[#22303A] bg-[#0B0F14] px-3 py-1.5 font-mono text-xs text-[#E8EDF1] placeholder-[#8B99A6]/40 focus:outline-none focus:ring-1 focus:ring-[#3DDC84] focus:border-[#3DDC84]"
                  value={form.project_cost}
                  onChange={(e) => update("project_cost", e.target.value)}
                />
              </label>

              {/* Duration Months */}
              <label className="block">
                <span className="block font-mono text-[10px] font-bold text-[#8B99A6] uppercase tracking-wider mb-1">
                  Duration (Months)
                </span>
                <input
                  type="number"
                  placeholder="e.g. 24"
                  className="w-full rounded-[6px] border border-[#22303A] bg-[#0B0F14] px-3 py-1.5 font-mono text-xs text-[#E8EDF1] placeholder-[#8B99A6]/40 focus:outline-none focus:ring-1 focus:ring-[#3DDC84] focus:border-[#3DDC84]"
                  value={form.duration_months}
                  onChange={(e) => update("duration_months", e.target.value)}
                />
              </label>

              {/* Environmental Benefit Summary */}
              <label className="block sm:col-span-2">
                <span className="block font-mono text-[10px] font-bold text-[#8B99A6] uppercase tracking-wider mb-1">
                  Environmental Benefit & Technical Proposal Summary
                </span>
                <textarea
                  rows={3}
                  placeholder="Provide technical overview of environmental impact reduction..."
                  className="w-full rounded-[6px] border border-[#22303A] bg-[#0B0F14] p-2.5 font-sans text-xs text-[#E8EDF1] placeholder-[#8B99A6]/40 focus:outline-none focus:ring-1 focus:ring-[#3DDC84] focus:border-[#3DDC84]"
                  value={form.environmental_benefit}
                  onChange={(e) => update("environmental_benefit", e.target.value)}
                />
              </label>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL (5 Cols): Document Package Ingestion Vault */}
        <div className="lg:col-span-5 flex flex-col rounded-[10px] border border-[#22303A] bg-[#131A21] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#22303A] px-4 py-2.5 bg-[#0B0F14]/60 shrink-0">
            <h2 className="font-mono text-xs font-bold text-[#E8EDF1] uppercase tracking-wider">
              2. DOCUMENT INGESTION VAULT
            </h2>
            <span className="font-mono text-[10px] text-[#3DDC84]">
              {files.length} ATTACHED
            </span>
          </div>

          <div className="flex-1 p-4 space-y-4">
            {/* File Drop Surface (Dark #0B0F14, crisp 1px border #22303A) */}
            <label className="group flex flex-col items-center justify-center rounded-[6px] border border-[#22303A] bg-[#0B0F14] p-5 text-center cursor-pointer transition-colors hover:border-[#3DDC84]">
              <div className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-[#22303A] bg-[#131A21] text-[#3DDC84] group-hover:border-[#3DDC84]">
                <Upload size={18} />
              </div>
              <div className="mt-2 font-mono text-xs font-bold text-[#E8EDF1]">
                ATTACH APPLICATION PACKAGE
              </div>
              <div className="text-[10px] font-mono text-[#8B99A6] mt-0.5">
                PDF, DOCX, XLSX, CSV, JPG, PNG (UP TO 25MB PER FILE)
              </div>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.gif,.webp"
                className="sr-only"
                onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
              />
            </label>

            {/* Attached File Queue List */}
            <div className="space-y-2">
              <div className="font-mono text-[10px] font-bold text-[#8B99A6] uppercase tracking-wider">
                INGESTION QUEUE VERIFICATION
              </div>

              {fileListArray.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-[6px] border border-[#22303A] bg-[#0B0F14] p-2.5 font-mono text-xs group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {fileIcon(file.name)}
                    <div className="min-w-0">
                      <span className="block truncate text-[#E8EDF1]">{file.name}</span>
                      <span className="text-[9px] text-[#8B99A6]">
                        {file.name.split(".").pop()?.toUpperCase()} • {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-[#3DDC84] font-bold">READY</span>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="flex h-5 w-5 items-center justify-center rounded-[4px] border border-[#22303A] text-[#8B99A6] hover:border-[#D9534F] hover:text-[#D9534F] transition-colors"
                      title="Remove file"
                    >
                      <X size={11} />
                    </button>
                  </div>
                </div>
              ))}

              {!fileListArray.length && (
                <div className="py-6 text-center font-mono text-xs text-[#8B99A6] border border-dashed border-[#22303A] rounded-[6px]">
                  NO DOCUMENTS ATTACHED YET
                </div>
              )}
            </div>
          </div>

          {/* Form Action Footer */}
          <div className="p-3 border-t border-[#22303A] bg-[#0B0F14]/60 flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#8B99A6]">
              <ShieldCheck size={14} className="text-[#3DDC84]" />
              <span>CHECKSUM VERIFICATION ACTIVE</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setForm({
                    applicant_name: "",
                    organization_type: "",
                    project_title: "",
                    project_category: "",
                    project_cost: "",
                    duration_months: "",
                    environmental_benefit: "",
                  });
                  setSchemeId("");
                  setFiles([]);
                }}
                className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider px-3.5 py-2 rounded-[6px] border border-[#22303A] bg-[#0B0F14] text-[#8B99A6] hover:text-[#D9534F] hover:border-[#D9534F]/50 transition-colors"
              >
                <RotateCcw size={13} />
                <span>DISCARD DRAFT</span>
              </button>

              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-[6px] border border-[#3DDC84] bg-[#3DDC84] text-[#0B0F14] hover:bg-[#3DDC84]/90 focus:outline-none focus:ring-1 focus:ring-[#3DDC84] disabled:opacity-50 transition-colors"
              >
                <PlusCircle size={14} />
                <span>{busy ? "INGESTING CASE..." : "OPEN CASE FILE & START INGESTION"}</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
