from typing import Callable

from app.workflow.state import ApplicationProcessingState, WORKFLOW_NODES


NodeFn = Callable[[ApplicationProcessingState], ApplicationProcessingState]


class ApplicationWorkflowGraph:
    def __init__(self) -> None:
        self.graph = self._build_graph()

    def _node(self, name: str) -> NodeFn:
        def runner(state: ApplicationProcessingState) -> ApplicationProcessingState:
            state["current_node"] = name
            if name == "HUMAN_REVIEW":
                state["review_status"] = "AWAITING_HUMAN_REVIEW"
                state.setdefault("errors", []).append(
                    {
                        "code": "WORKFLOW_PAUSED",
                        "message": "Workflow checkpoint reached. Authorized human reviewer must make the final decision.",
                    }
                )
            return state

        return runner

    def _build_graph(self):
        try:
            from langgraph.graph import END, StateGraph
        except ImportError:
            return None

        builder = StateGraph(ApplicationProcessingState)
        for node in WORKFLOW_NODES:
            builder.add_node(node, self._node(node))
        for source, target in zip(WORKFLOW_NODES, WORKFLOW_NODES[1:], strict=False):
            builder.add_edge(source, target)
        builder.add_edge("RECORD_DECISION", END)
        builder.set_entry_point("INGEST")
        return builder.compile()

    def is_available(self) -> bool:
        return self.graph is not None

    def nodes(self) -> list[str]:
        return WORKFLOW_NODES


application_workflow_graph = ApplicationWorkflowGraph()

