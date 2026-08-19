# ADR 0001: Local-first provider abstractions

Status: Accepted

The first vertical slice uses local mock providers for document parsing, OCR, LLM extraction, embeddings, and ML scoring. Restricted synthetic government/citizen data is not sent to public cloud APIs.

The provider interfaces are present so production deployments can replace local mocks with approved on-premise or sovereign services.

