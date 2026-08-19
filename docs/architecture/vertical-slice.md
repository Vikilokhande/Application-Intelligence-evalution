# Application Intelligence Platform Vertical Slice

The POC follows the requested flow:

Heterogeneous Application -> Application Intake -> Document Intelligence -> Extraction + Normalization -> Validation & Verification -> Knowledge-Based Rule Engine -> Validated Application -> Feature Engineering -> Explainable ML / AI Engine -> Decision Support & Explainability -> Intelligent Workflow Routing -> Human Review & Final Decision -> Integration & Recording -> Analytics & Reporting -> Feedback & Improvement.

The implemented runtime executes through routing and pauses at `HUMAN_REVIEW`. Final approval, rejection, clarification, and override actions are recorded only through reviewer endpoints.

MySQL is configured as the Docker system of record. SQLite is the default local development database so tests and API startup can run without containers.

ChromaDB is configured for local persistent scheme knowledge retrieval with a deterministic local embedding fallback.

