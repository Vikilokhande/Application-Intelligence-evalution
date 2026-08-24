// NewApplication.tsx — 3-step guided application form with free navigation.
// Steps: 1. Details | 2. Documents | 3. Review & Submit
// Data is preserved when navigating between steps.
import { useState, useRef } from "react";
import type { FormEvent } from "react";
import {
  CheckCircle2, ChevronRight, FileText, Loader2, Upload, X,
} from "lucide-react";
import { AlertBanner, PageHeader } from "../components/ui";
import type { SchemeRead } from "../types/api";

type Step = 1 | 2 | 3;

const STEPS = [
  { n: 1 as Step, label: "Application Details" },
  { n: 2 as Step, label: "Documents" },
  { n: 3 as Step, label: "Review & Submit" },
];

/* ── Accepted document types ──────────────────────────────────────── */
const REQUIRED_DOC_TYPES = [
  "Application Form",
  "Project Budget",
  "Organisation Certificate",
  "Technical Proposal",
];

export function NewApplication({
  schemes,
  onCreate,
}: {
  schemes: SchemeRead[];
  onCreate: (payload: Record<string, unknown>, files: FileList | null) => Promise<void>;
}) {
  const [step, setStep] = useState<Step>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [schemeId,    setSchemeId]    = useState(schemes[0]?.id ?? "");
  const [applicant,   setApplicant]   = useState("");
  const [orgName,     setOrgName]     = useState("");
  const [projTitle,   setProjTitle]   = useState("");
  const [projCat,     setProjCat]     = useState("");
  const [location,    setLocation]    = useState("");
  const [cost,        setCost]        = useState("");
  const [duration,    setDuration]    = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  function removeFile(i: number) {
    setFiles(prev => prev.filter((_, idx) => idx !== i));
  }

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name));
      return [...prev, ...Array.from(incoming).filter(f => !names.has(f.name))];
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // Build FileList-compatible object
      const dt = new DataTransfer();
      files.forEach(f => dt.items.add(f));
      await onCreate({
        scheme_id: schemeId || null,
        applicant_name: applicant.trim(),
        form_data: {
          organization_name: orgName.trim(),
          project_location: location.trim(),
          project_cost: cost ? Number(cost) : null,
          project_duration: duration ? Number(duration) : null,
          description: description.trim(),
        },
        project_title: projTitle.trim(),
        project_category: projCat.trim(),
      }, dt.files.length > 0 ? dt.files : null);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <div className="max-w-[600px] mx-auto mt-16 text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 size={32} className="text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Application Submitted</h2>
        <p className="text-sm text-slate-500">Your application has been submitted and processing will begin shortly.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[800px] mx-auto space-y-6">
      <PageHeader
        title="New Application"
        subtitle="Complete all steps to submit your application for review."
        breadcrumb="Workspace"
      />

      {/* ── Step Indicator ────────────────────────────────────────── */}
      <div className="flex items-center gap-0 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {STEPS.map((s, i) => {
          const done   = s.n < step;
          const active = s.n === step;
          return (
            <button
              key={s.n}
              type="button"
              onClick={() => setStep(s.n)}
              className={`flex-1 flex items-center gap-2 justify-center px-4 py-3.5 text-sm font-semibold transition-colors border-r last:border-0 border-slate-100 ${
                active ? "bg-teal-600 text-white" :
                done   ? "bg-teal-50 text-teal-700 hover:bg-teal-100" :
                         "text-slate-400 hover:bg-slate-50"
              }`}
            >
              <span className={`h-5 w-5 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                done   ? "bg-teal-600 text-white" :
                active ? "bg-white text-teal-600" :
                         "bg-slate-200 text-slate-500"
              }`}>
                {done ? <CheckCircle2 size={12} /> : s.n}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          );
        })}
      </div>

      {error && <AlertBanner variant="error" onDismiss={() => setError(null)}>{error}</AlertBanner>}

      <form onSubmit={handleSubmit}>
        {/* ── Step 1: Application Details ─────────────────────────── */}
        {step === 1 && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="text-sm font-bold text-slate-800">Application Details</h2>
              <p className="text-xs text-slate-400 mt-0.5">Provide the key information about this application.</p>
            </div>
            <div className="p-6 space-y-5">
              {/* Scheme */}
              <FormField label="Scheme" required>
                <select
                  className="form-select"
                  value={schemeId}
                  onChange={e => setSchemeId(e.target.value)}
                  required
                >
                  <option value="">Select a scheme…</option>
                  {schemes.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </FormField>

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Applicant Name" required>
                  <input className="form-input" placeholder="Full name of applicant"
                    value={applicant} onChange={e => setApplicant(e.target.value)} required />
                </FormField>
                <FormField label="Organisation">
                  <input className="form-input" placeholder="Organisation name"
                    value={orgName} onChange={e => setOrgName(e.target.value)} />
                </FormField>
              </div>

              <FormField label="Project Title" required>
                <input className="form-input" placeholder="Descriptive title for the project"
                  value={projTitle} onChange={e => setProjTitle(e.target.value)} required />
              </FormField>

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Project Category">
                  <input className="form-input" placeholder="e.g. Water Conservation"
                    value={projCat} onChange={e => setProjCat(e.target.value)} />
                </FormField>
                <FormField label="Project Location">
                  <input className="form-input" placeholder="City / district"
                    value={location} onChange={e => setLocation(e.target.value)} />
                </FormField>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Project Cost (₹)">
                  <input className="form-input" type="number" min={0} placeholder="e.g. 5000000"
                    value={cost} onChange={e => setCost(e.target.value)} />
                </FormField>
                <FormField label="Project Duration (months)">
                  <input className="form-input" type="number" min={1} placeholder="e.g. 24"
                    value={duration} onChange={e => setDuration(e.target.value)} />
                </FormField>
              </div>

              <FormField label="Project Description">
                <textarea className="form-input resize-none" rows={3}
                  placeholder="Brief description of the project and its objectives"
                  value={description} onChange={e => setDescription(e.target.value)} />
              </FormField>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button type="button" onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-700 transition">
                Next: Documents <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Documents ────────────────────────────────────── */}
        {step === 2 && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="text-sm font-bold text-slate-800">Documents</h2>
              <p className="text-xs text-slate-400 mt-0.5">Upload all supporting documents. You can add more later.</p>
            </div>
            <div className="p-6 space-y-5">
              {/* Required types reference */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Typically required</p>
                <div className="flex flex-wrap gap-2">
                  {REQUIRED_DOC_TYPES.map(t => (
                    <span key={t} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                      <FileText size={11} /> {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Upload zone */}
              <div
                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-10 hover:border-teal-400 hover:bg-teal-50 transition cursor-pointer"
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
              >
                <Upload size={24} className="text-slate-400 mb-2" />
                <p className="text-sm font-semibold text-slate-600">Drop files here or click to upload</p>
                <p className="text-xs text-slate-400 mt-1">PDF, DOCX, XLSX, JPEG, PNG supported</p>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xlsx,.xls,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={e => addFiles(e.target.files)}
                />
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{files.length} file(s) ready to upload</p>
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={14} className="text-teal-600 shrink-0" />
                        <span className="text-sm text-slate-700 truncate">{f.name}</span>
                        <span className="text-xs text-slate-400 shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                      </div>
                      <button type="button" onClick={() => removeFile(i)} className="text-slate-300 hover:text-rose-500 transition">
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between">
              <button type="button" onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                Back
              </button>
              <button type="button" onClick={() => setStep(3)}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-700 transition">
                Next: Review <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Review & Submit ──────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                <h2 className="text-sm font-bold text-slate-800">Review & Submit</h2>
                <p className="text-xs text-slate-400 mt-0.5">Check the information before submitting.</p>
              </div>
              <div className="p-6 space-y-4">
                <ReviewRow label="Scheme"        value={schemes.find(s => s.id === schemeId)?.name} />
                <ReviewRow label="Applicant"     value={applicant} />
                <ReviewRow label="Organisation"  value={orgName} />
                <ReviewRow label="Project Title" value={projTitle} />
                <ReviewRow label="Category"      value={projCat} />
                <ReviewRow label="Location"      value={location} />
                <ReviewRow label="Cost"          value={cost ? `₹${Number(cost).toLocaleString("en-IN")}` : null} />
                <ReviewRow label="Duration"      value={duration ? `${duration} months` : null} />
                <ReviewRow label="Documents"     value={files.length > 0 ? `${files.length} file(s)` : "None uploaded"} />
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between">
                <button type="button" onClick={() => setStep(2)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                  Back
                </button>
                <button type="submit" disabled={busy}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-teal-700 transition disabled:opacity-50 shadow-sm">
                  {busy ? <><Loader2 size={15} className="animate-spin" /> Submitting…</> : "Submit Application"}
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────────────── */
function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-baseline gap-4 py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide w-32 shrink-0">{label}</span>
      <span className="text-sm text-slate-800">{value || <span className="italic text-slate-300">—</span>}</span>
    </div>
  );
}
