import { Play } from "lucide-react";
import { ProcessFlow } from "../components/ProcessFlow";
import { SectionPanel } from "../components/SectionPanel";
import { StatusBadge } from "../components/StatusBadge";
import type { ApplicationDetail, WorkflowResponse } from "../types/api";

export function ApplicationProcessing({
  detail,
  workflow,
  busy,
  onProcess
}: {
  detail: ApplicationDetail | null;
  workflow: WorkflowResponse | null;
  busy: boolean;
  onProcess: () => Promise<void>;
}) {
  if (!detail) {
    return <SectionPanel title="Processing">Select or create an application.</SectionPanel>;
  }

  return (
    <div className="space-y-4">
      <SectionPanel
        title="Workflow State"
        action={
          <button className="primary-button" onClick={onProcess} disabled={busy}>
            <Play size={16} aria-hidden="true" />
            Process
          </button>
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <StatusBadge value={detail.processing_status} />
          <span className="text-sm text-slate-600">LangGraph available: {workflow?.graph_available ? "Yes" : "No"}</span>
        </div>
        <ProcessFlow nodes={workflow?.nodes ?? []} currentNode={(workflow?.state.current_node as string | undefined) ?? detail.processing_status} />
      </SectionPanel>

      <SectionPanel title="Documents">
        <div className="grid gap-3 md:grid-cols-2">
          {detail.documents.map((document) => (
            <div className="rounded-md border border-line bg-field p-3" key={document.id}>
              <div className="font-semibold text-ink">{document.filename}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge value={document.document_type} />
                <StatusBadge value={document.extraction_status} />
                <StatusBadge value={document.validation_status} />
              </div>
            </div>
          ))}
        </div>
      </SectionPanel>
    </div>
  );
}

