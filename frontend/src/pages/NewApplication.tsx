import { CheckCircle2, FileText, PlusCircle, Sparkles, Upload } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { SectionPanel } from "../components/SectionPanel";
import type { SchemeRead } from "../types/api";

export function NewApplication({
  schemes,
  onCreate
}: {
  schemes: SchemeRead[];
  onCreate: (payload: Record<string, unknown>, files: FileList | null) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    applicant_name: "",
    organization_type: "",
    project_title: "",
    project_category: "",
    project_cost: "",
    duration_months: "",
    environmental_benefit: ""
  });
  const [schemeId, setSchemeId] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);

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
      await onCreate(
        {
          scheme_id: schemeId || undefined,
          applicant_name: form.applicant_name.trim() || undefined,
          project_title: form.project_title.trim() || undefined,
          project_category: form.project_category.trim() || undefined,
          form_data: formData
        },
        files
      );
    } finally {
      setBusy(false);
    }
  }

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="space-y-3">
      <div className="panel border-l-4 border-l-[#0F766E] bg-gradient-to-r from-white via-[#F8FAFC] to-[#F0FDF4] p-3.5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold tracking-tight text-[#0F172A]">New Application Intake</h1>
              <span className="ai-boundary-badge">
                <Sparkles size={12} /> Human Review Required
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-[#475569]">Register project metadata and attach supporting application documents.</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-teal-200 bg-white px-3 py-1 text-xs font-bold text-[#0F766E] shadow-sm">
            <PlusCircle size={14} /> Intake Console
          </div>
        </div>
      </div>

      <SectionPanel title="Application Details & Upload">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            <label className="block">
              <span className="field-label mb-1 text-[11px]">Scheme</span>
              <select className="w-full px-2.5 py-1.5 text-xs font-bold" value={schemeId} onChange={(event) => setSchemeId(event.target.value)}>
                <option value="">Select scheme</option>
                {schemes.map((scheme) => (
                  <option key={scheme.id} value={scheme.id}>
                    {scheme.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="field-label mb-1 text-[11px]">Applicant Name</span>
              <input className="w-full px-2.5 py-1.5 text-xs font-semibold" value={form.applicant_name} onChange={(event) => update("applicant_name", event.target.value)} />
            </label>
            <label className="block">
              <span className="field-label mb-1 text-[11px]">Organization Type</span>
              <input className="w-full px-2.5 py-1.5 text-xs font-semibold" value={form.organization_type} onChange={(event) => update("organization_type", event.target.value)} />
            </label>
            <label className="block">
              <span className="field-label mb-1 text-[11px]">Project Title</span>
              <input className="w-full px-2.5 py-1.5 text-xs font-semibold" value={form.project_title} onChange={(event) => update("project_title", event.target.value)} />
            </label>
            <label className="block">
              <span className="field-label mb-1 text-[11px]">Project Category</span>
              <input className="w-full px-2.5 py-1.5 text-xs font-semibold" value={form.project_category} onChange={(event) => update("project_category", event.target.value)} />
            </label>
            <label className="block">
              <span className="field-label mb-1 text-[11px]">Project Cost (INR)</span>
              <input className="w-full px-2.5 py-1.5 text-xs font-semibold" type="number" value={form.project_cost} onChange={(event) => update("project_cost", event.target.value)} />
            </label>
            <label className="block">
              <span className="field-label mb-1 text-[11px]">Duration (Months)</span>
              <input className="w-full px-2.5 py-1.5 text-xs font-semibold" type="number" value={form.duration_months} onChange={(event) => update("duration_months", event.target.value)} />
            </label>
            <label className="block sm:col-span-2">
              <span className="field-label mb-1 text-[11px]">Environmental Benefit & Proposal Summary</span>
              <textarea
                className="min-h-20 w-full px-2.5 py-1.5 text-xs font-semibold"
                value={form.environmental_benefit}
                onChange={(event) => update("environmental_benefit", event.target.value)}
              />
            </label>
          </div>

          <div className="space-y-1">
            <span className="field-label text-[11px]">Supporting Documents</span>
            <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-3 py-4 text-center transition hover:border-[#0D9488] hover:bg-[#F0FDF4]">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-teal-200 bg-[#F0FDF4] text-[#0F766E] shadow-sm">
                  <Upload size={15} aria-hidden="true" />
                </div>
                <span className="text-xs font-bold text-[#0F172A]">Select application documents</span>
              </div>
              <span className="mt-1 text-[10px] text-[#64748B]">PDF, DOCX, XLSX, CSV, JPG, JPEG, PNG, JSON</span>
              <input className="sr-only" type="file" multiple onChange={(event) => setFiles(event.target.files)} />
              {files && files.length > 0 && (
                <div className="mt-2 inline-flex items-center gap-1 rounded-md border border-teal-300 bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-800">
                  <CheckCircle2 size={12} /> {files.length} file(s) attached
                </div>
              )}
            </label>
          </div>

          <div className="flex justify-end border-t border-[#E2E8F0] pt-3">
            <button type="submit" className="primary-button px-4 py-2 text-xs shadow-sm" disabled={busy}>
              <FileText size={15} /> {busy ? "Creating & Uploading..." : "Submit Application for Processing"}
            </button>
          </div>
        </form>
      </SectionPanel>
    </div>
  );
}
