// NewApplication.tsx — 3-step guided application form.
// Steps: 1. Application Details (with Email ID) | 2. Documents | 3. Review & Submit
// Matching LandingPage, LoginPage, and Dashboard branding (#0A2540 navy, slate-50 background, Inter font).
import { useState, useRef } from "react";
import type { FormEvent } from "react";
import {
  CheckCircle2, ChevronRight, FileText, Loader2, Upload, X,
  ShieldCheck, ArrowLeft, Mail, Building, MapPin, DollarSign,
  Calendar, Layers,
} from "lucide-react";
import { AlertBanner, PageHeader } from "../components/ui";
import type { SchemeRead } from "../types/api";

type Step = 1 | 2 | 3;

const STEPS = [
  { n: 1 as Step, label: "Application Details", desc: "Applicant & project information" },
  { n: 2 as Step, label: "Documents", desc: "Upload clearance files" },
  { n: 3 as Step, label: "Review & Submit", desc: "Final verification" },
];

/* ── Accepted document types ──────────────────────────────────────── */
const REQUIRED_DOC_TYPES = [
  "Application Form",
  "Project Budget & Costs",
  "Organisation Certificate",
  "Technical Proposal / EIA",
  "Environmental Impact Assessment",
  "Land Ownership / Lease",
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
  const [schemeId,       setSchemeId]       = useState(schemes[0]?.id ?? "");
  const [applicant,      setApplicant]      = useState("");
  const [applicantEmail, setApplicantEmail] = useState("");
  const [orgName,        setOrgName]        = useState("");
  const [projTitle,      setProjTitle]      = useState("");
  const [projCat,        setProjCat]        = useState("");
  const [location,       setLocation]       = useState("");
  const [cost,           setCost]           = useState("");
  const [duration,       setDuration]       = useState("");
  const [description,    setDescription]    = useState("");
  const [files,          setFiles]          = useState<File[]>([]);
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
          applicant_email: applicantEmail.trim(),
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

  const selectedScheme = schemes.find(s => s.id === schemeId);

  if (submitted) {
    return (
      <div className="max-w-[620px] mx-auto mt-12 text-center space-y-6 animate-slide-up font-sans">
        <div className="rounded-3xl border border-emerald-200 bg-white p-10 shadow-sm space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <CheckCircle2 size={36} />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-[#0A2540]">Application Submitted Successfully</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
              Your environmental review package has been created and will now proceed to automated document extraction, validation, and AI assessment.
            </p>
          </div>
          <div className="pt-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-bold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Processing Pipeline Queued
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto space-y-7 animate-slide-up font-sans">
      <PageHeader
        title="New Application"
        subtitle="Submit a project application package for environmental clearance review."
        breadcrumb="Workspace"
      />

      {/* ── Step Indicator (Matches Landing/Login Stepper) ────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {STEPS.map((s) => {
          const done   = s.n < step;
          const active = s.n === step;
          return (
            <button
              key={s.n}
              type="button"
              onClick={() => setStep(s.n)}
              className={`flex items-center gap-3.5 p-4 rounded-2xl border text-left transition-all ${
                active
                  ? "bg-[#0A2540] border-[#0A2540] text-white shadow-sm"
                  : done
                  ? "bg-emerald-50/70 border-emerald-200 text-emerald-950 hover:bg-emerald-100/70"
                  : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50"
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-xl font-bold text-xs shrink-0 transition-all ${
                  active
                    ? "bg-[#C59B27] text-[#0A2540]"
                    : done
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {done ? <CheckCircle2 size={16} /> : s.n}
              </div>
              <div className="min-w-0 hidden sm:block">
                <p className={`text-xs font-bold uppercase tracking-wider leading-none ${active ? "text-slate-200" : done ? "text-emerald-800" : "text-slate-400"}`}>
                  Step 0{s.n}
                </p>
                <p className={`text-sm font-semibold truncate mt-1 ${active ? "text-white" : done ? "text-emerald-950" : "text-slate-700"}`}>
                  {s.label}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {error && <AlertBanner variant="error" onDismiss={() => setError(null)}>{error}</AlertBanner>}

      <form onSubmit={handleSubmit}>
        {/* ── Step 1: Application Details ─────────────────────────── */}
        {step === 1 && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText size={17} className="text-[#0A2540]" />
                <h2 className="text-sm font-bold text-[#0A2540]">Step 1: Application Details</h2>
              </div>
              <span className="text-xs font-semibold text-slate-400">Required fields marked with *</span>
            </div>

            <div className="p-7 space-y-6">
              {/* Scheme Dropdown */}
              <FormField label="Applicable Environmental Scheme" required>
                <select
                  className="form-select text-sm font-medium"
                  value={schemeId}
                  onChange={e => setSchemeId(e.target.value)}
                  required
                >
                  <option value="">Select a scheme…</option>
                  {schemes.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {selectedScheme?.description && (
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    {selectedScheme.description}
                  </p>
                )}
              </FormField>

              {/* Applicant Name & Email ID */}
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Applicant Full Name" required>
                  <input
                    className="form-input"
                    placeholder="e.g. Rajesh Kumar Sharma"
                    value={applicant}
                    onChange={e => setApplicant(e.target.value)}
                    required
                  />
                </FormField>

                <FormField label="Applicant Email Address" required>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="email"
                      className="form-input pl-9"
                      placeholder="applicant@organization.gov.in"
                      value={applicantEmail}
                      onChange={e => setApplicantEmail(e.target.value)}
                      required
                    />
                  </div>
                </FormField>
              </div>

              {/* Organisation & Project Title */}
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Organisation / Entity Name">
                  <input
                    className="form-input"
                    placeholder="e.g. Pune Municipal Infrastructure Corp"
                    value={orgName}
                    onChange={e => setOrgName(e.target.value)}
                  />
                </FormField>

                <FormField label="Project Title" required>
                  <input
                    className="form-input"
                    placeholder="e.g. Urban Wetland Bio-Remediation Phase II"
                    value={projTitle}
                    onChange={e => setProjTitle(e.target.value)}
                    required
                  />
                </FormField>
              </div>

              {/* Category & Location */}
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Project Category">
                  <input
                    className="form-input"
                    placeholder="e.g. Water Conservation, Solar, Forestry"
                    value={projCat}
                    onChange={e => setProjCat(e.target.value)}
                  />
                </FormField>

                <FormField label="Project Location (City / District)">
                  <input
                    className="form-input"
                    placeholder="e.g. Nagpur, Maharashtra"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                  />
                </FormField>
              </div>

              {/* Cost & Duration */}
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Estimated Project Cost (₹)">
                  <input
                    className="form-input"
                    type="number"
                    min={0}
                    placeholder="e.g. 7500000"
                    value={cost}
                    onChange={e => setCost(e.target.value)}
                  />
                </FormField>

                <FormField label="Estimated Duration (Months)">
                  <input
                    className="form-input"
                    type="number"
                    min={1}
                    placeholder="e.g. 18"
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                  />
                </FormField>
              </div>

              {/* Description */}
              <FormField label="Project Overview & Environmental Scope">
                <textarea
                  className="form-input resize-none text-sm"
                  rows={3}
                  placeholder="Brief summary of project objectives, environmental clearance scope, and site details…"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </FormField>
            </div>

            <div className="px-7 py-4 border-t border-slate-100 bg-slate-50/70 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0A2540] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#0d2f50] active:scale-[0.98] transition shadow-xs"
              >
                Next: Upload Documents <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Documents ────────────────────────────────────── */}
        {step === 2 && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Upload size={17} className="text-[#0A2540]" />
                <h2 className="text-sm font-bold text-[#0A2540]">Step 2: Upload Documents</h2>
              </div>
              <span className="text-xs font-semibold text-slate-400">PDF, DOCX, XLSX, Images</span>
            </div>

            <div className="p-7 space-y-6">
              {/* Required types reference */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                  Typically Required Document Types
                </p>
                <div className="flex flex-wrap gap-2">
                  {REQUIRED_DOC_TYPES.map(t => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
                    >
                      <FileText size={12} className="text-[#0A2540]" /> {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Upload Dropzone */}
              <div
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-[#F8FAFC] py-12 px-6 hover:border-[#0A2540] hover:bg-slate-50 transition cursor-pointer text-center group"
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white border border-slate-200 text-[#0A2540] shadow-xs group-hover:scale-105 transition-transform mb-3">
                  <Upload size={24} />
                </div>
                <p className="text-sm font-bold text-[#0A2540]">Drop files here or click to browse</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Upload EIA reports, municipal certificates, project proposals, and financial budgets.
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xlsx,.xls,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={e => addFiles(e.target.files)}
                />
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {files.length} Document{files.length > 1 ? "s" : ""} Selected
                    </p>
                    <button
                      type="button"
                      onClick={() => setFiles([])}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {files.map((f, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-2xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                            <CheckCircle2 size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{f.name}</p>
                            <p className="text-xs text-slate-400">{(f.size / 1024).toFixed(0)} KB</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Remove file"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-7 py-4 border-t border-slate-100 bg-slate-50/70 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
              >
                <ArrowLeft size={15} /> Back to Details
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0A2540] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#0d2f50] active:scale-[0.98] transition shadow-xs"
              >
                Next: Review &amp; Submit <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Review & Submit ──────────────────────────────── */}
        {step === 3 && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={17} className="text-[#0A2540]" />
                <h2 className="text-sm font-bold text-[#0A2540]">Step 3: Review &amp; Final Submission</h2>
              </div>
              <span className="text-xs font-semibold text-slate-400">Confirm all details</span>
            </div>

            <div className="p-7 space-y-6">
              <div className="grid gap-3.5 sm:grid-cols-2">
                <ReviewBox label="Applicable Scheme" value={selectedScheme?.name} highlight />
                <ReviewBox label="Applicant Full Name" value={applicant} />
                <ReviewBox label="Applicant Email ID" value={applicantEmail} />
                <ReviewBox label="Organisation" value={orgName} />
                <ReviewBox label="Project Title" value={projTitle} />
                <ReviewBox label="Project Category" value={projCat} />
                <ReviewBox label="Project Location" value={location} />
                <ReviewBox label="Estimated Cost" value={cost ? `₹${Number(cost).toLocaleString("en-IN")}` : null} />
                <ReviewBox label="Duration" value={duration ? `${duration} Months` : null} />
                <ReviewBox label="Uploaded Documents" value={`${files.length} Document file(s)`} />
              </div>

              {description && (
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Project Description</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{description}</p>
                </div>
              )}

              {/* Submission Notice Banner */}
              <div className="rounded-xl border border-[#C59B27]/40 bg-[#FFFBEB] p-4 flex items-start gap-3">
                <ShieldCheck size={18} className="text-[#B45309] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-[#B45309] uppercase tracking-wide">Ready For Official Review</p>
                  <p className="text-xs text-[#78350F] mt-0.5 leading-relaxed">
                    By submitting, the system will immediately initiate automated text extraction, guideline cross-validation, and ML risk scoring.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-7 py-4 border-t border-slate-100 bg-slate-50/70 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
              >
                <ArrowLeft size={15} /> Back to Documents
              </button>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0A2540] px-8 py-3 text-sm font-bold text-white hover:bg-[#0d2f50] active:scale-[0.98] transition disabled:opacity-50 shadow-sm"
              >
                {busy ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-[#C59B27]" />
                    Submitting Application Package…
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} className="text-[#C59B27]" />
                    Submit Application
                  </>
                )}
              </button>
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
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
        {label}{required && <span className="text-rose-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function ReviewBox({ label, value, highlight }: { label: string; value: string | null | undefined; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-3.5 space-y-1 ${highlight ? "border-emerald-200 bg-emerald-50/30" : "border-slate-100 bg-slate-50/50"}`}>
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{label}</span>
      <span className={`text-sm font-semibold break-words block ${highlight ? "text-emerald-900 font-bold" : "text-[#0A2540]"}`}>
        {value || <span className="italic text-slate-300 font-normal">—</span>}
      </span>
    </div>
  );
}
