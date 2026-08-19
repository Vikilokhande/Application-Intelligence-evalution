import { Upload } from "lucide-react";
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
    applicant_name: "Riverbend Municipal Council",
    organization_type: "Municipality",
    project_title: "Canal Edge Urban Greening",
    project_category: "Urban Greening",
    project_cost: "4800000",
    duration_months: "18",
    environmental_benefit: "Native shade trees and runoff control for a dense urban canal corridor."
  });
  const [schemeId, setSchemeId] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await onCreate(
        {
          scheme_id: schemeId || schemes[0]?.id,
          applicant_name: form.applicant_name,
          project_title: form.project_title,
          project_category: form.project_category,
          form_data: {
            ...form,
            project_cost: Number(form.project_cost),
            duration_months: Number(form.duration_months)
          }
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
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Scheme
            <select className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2" value={schemeId} onChange={(event) => setSchemeId(event.target.value)}>
              <option value="">Default scheme</option>
              {schemes.map((scheme) => (
                <option key={scheme.id} value={scheme.id}>
                  {scheme.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Applicant
            <input className="mt-1 w-full rounded-md border border-line px-3 py-2" value={form.applicant_name} onChange={(event) => update("applicant_name", event.target.value)} />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Organization Type
            <input className="mt-1 w-full rounded-md border border-line px-3 py-2" value={form.organization_type} onChange={(event) => update("organization_type", event.target.value)} />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Project Title
            <input className="mt-1 w-full rounded-md border border-line px-3 py-2" value={form.project_title} onChange={(event) => update("project_title", event.target.value)} />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Category
            <input className="mt-1 w-full rounded-md border border-line px-3 py-2" value={form.project_category} onChange={(event) => update("project_category", event.target.value)} />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Project Cost
            <input className="mt-1 w-full rounded-md border border-line px-3 py-2" type="number" value={form.project_cost} onChange={(event) => update("project_cost", event.target.value)} />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Duration Months
            <input className="mt-1 w-full rounded-md border border-line px-3 py-2" type="number" value={form.duration_months} onChange={(event) => update("duration_months", event.target.value)} />
          </label>
          <label className="text-sm font-medium text-slate-700 md:col-span-2">
            Environmental Information
            <textarea className="mt-1 min-h-24 w-full rounded-md border border-line px-3 py-2" value={form.environmental_benefit} onChange={(event) => update("environmental_benefit", event.target.value)} />
          </label>
        </div>

        <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-line bg-field px-4 py-5 text-center text-sm text-slate-600">
          <Upload className="mb-2 text-pine" size={22} aria-hidden="true" />
          <span className="font-medium text-ink">Upload PDF, DOCX, XLSX, CSV, JPG, JPEG, PNG, or JSON files</span>
          <input className="sr-only" type="file" multiple onChange={(event) => setFiles(event.target.files)} />
          {files && <span className="mt-2 text-xs">{files.length} file(s) selected</span>}
        </label>

        <div className="flex justify-end">
          <button type="submit" className="primary-button" disabled={busy}>
            Create Application
          </button>
        </div>
      </form>
    </SectionPanel>
  );
}

