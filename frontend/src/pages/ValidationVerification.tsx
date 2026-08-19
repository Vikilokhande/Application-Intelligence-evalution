import { AlertTriangle } from "lucide-react";
import { SectionPanel } from "../components/SectionPanel";
import { StatusBadge } from "../components/StatusBadge";
import type { ApplicationDetail } from "../types/api";

export function ValidationVerification({ detail }: { detail: ApplicationDetail | null }) {
  if (!detail) {
    return <SectionPanel title="Validation & Verification">Select or create an application.</SectionPanel>;
  }
  const contradictions = detail.validation_results.filter((item) => item.validation_type === "CROSS_DOCUMENT_CONSISTENCY" && item.status === "FAIL");

  return (
    <div className="space-y-4">
      {contradictions.map((item) => (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4" key={item.id}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 text-saffron" size={20} aria-hidden="true" />
            <div>
              <h2 className="font-semibold text-ink">Contradiction Detected</h2>
              <p className="mt-1 text-sm text-slate-700">{item.message}</p>
            </div>
          </div>
        </div>
      ))}

      <SectionPanel title="Validation Results">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="py-2 pr-3">Validation</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Severity</th>
                <th className="py-2 pr-3">Message</th>
                <th className="py-2 pr-3">Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {detail.validation_results.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 pr-3 font-medium">{item.validation_type.replaceAll("_", " ")}</td>
                  <td className="py-3 pr-3">
                    <StatusBadge value={item.status} />
                  </td>
                  <td className="py-3 pr-3">{item.severity}</td>
                  <td className="py-3 pr-3 text-slate-700">{item.message}</td>
                  <td className="py-3 pr-3">
                    <code className="text-xs text-slate-600">{JSON.stringify(item.evidence).slice(0, 120)}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionPanel>

      <SectionPanel title="Rule Results">
        <div className="grid gap-3 lg:grid-cols-2">
          {detail.rule_results.map((item) => (
            <article className="rounded-md border border-line bg-field p-3" key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-ink">{item.rule_name}</h3>
                  <p className="mt-1 text-sm text-slate-600">{item.reason}</p>
                </div>
                <StatusBadge value={item.result} />
              </div>
              <div className="mt-3 grid gap-2 text-xs text-slate-600 md:grid-cols-2">
                <code>{JSON.stringify(item.expected_value)}</code>
                <code>{JSON.stringify(item.actual_value)}</code>
              </div>
            </article>
          ))}
        </div>
      </SectionPanel>
    </div>
  );
}

