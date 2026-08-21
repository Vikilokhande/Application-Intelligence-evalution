import { Upload, FileText, CheckCircle2 } from "lucide-react";
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
    <SectionPanel title="Application Intake">
      <form onSubmit={submit} className="space-y-6">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="field-label">Scheme</span>
            <select className="w-full" value={schemeId} onChange={(event) => setSchemeId(event.target.value)}>
              <option value="">Select scheme</option>
              {schemes.map((scheme) => (
                <option key={scheme.id} value={scheme.id}>
                  {scheme.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="field-label">Applicant Name</span>
            <input className="w-full" value={form.applicant_name} onChange={(event) => update("applicant_name", event.target.value)} />
          </label>
          <label className="block">
            <span className="field-label">Organization Type</span>
            <input className="w-full" value={form.organization_type} onChange={(event) => update("organization_type", event.target.value)} />
          </label>
          <label className="block">
            <span className="field-label">Project Title</span>
            <input className="w-full" value={form.project_title} onChange={(event) => update("project_title", event.target.value)} />
          </label>
          <label className="block">
            <span className="field-label">Category</span>
            <input className="w-full" value={form.project_category} onChange={(event) => update("project_category", event.target.value)} />
          </label>
          <label className="block">
            <span className="field-label">Project Cost (INR)</span>
            <input className="w-full" type="number" value={form.project_cost} onChange={(event) => update("project_cost", event.target.value)} />
          </label>
          <label className="block">
            <span className="field-label">Duration (Months)</span>
            <input className="w-full" type="number" value={form.duration_months} onChange={(event) => update("duration_months", event.target.value)} />
          </label>
          <label className="block md:col-span-2">
            <span className="field-label">Environmental Benefit & Proposal Summary</span>
            <textarea className="min-h-24 w-full" value={form.environmental_benefit} onChange={(event) => update("environmental_benefit", event.target.value)} />
          </label>
        </div>

        {/* Enhanced File Upload Dropzone */}
        <div className="space-y-1.5">
          <span className="field-label">Supporting Documents</span>
          <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-6 text-center transition hover:border-[#0D9488] hover:bg-[#F0FDF4]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0FDF4] text-[#0F766E] mb-2 border border-teal-200 shadow-sm">
              <Upload size={20} aria-hidden="true" />
            </div>
            <span className="text-sm font-semibold text-[#0F172A]">Click to upload or drag & drop application documents</span>
            <span className="mt-1 text-xs text-[#64748B]">Supported formats: PDF, DOCX, XLSX, CSV, JPG, PNG, JSON (Max 25MB per file)</span>
            <input className="sr-only" type="file" multiple onChange={(event) => setFiles(event.target.files)} />
            {files && files.length > 0 && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-teal-300 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
                <CheckCircle2 size={14} /> {files.length} file(s) attached for upload
              </div>
            )}
          </label>
        </div>

        <div className="flex justify-end pt-2 border-t border-[#E2E8F0]">
          <button type="submit" className="primary-button" disabled={busy}>
            <FileText size={16} /> {busy ? "Creating Application..." : "Create Application"}
          </button>
        </div>
      </form>
    </SectionPanel>
  );
}
