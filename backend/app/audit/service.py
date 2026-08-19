from typing import Any

from sqlalchemy.orm import Session

from app.models import AuditLog


class AuditService:
    def record(
        self,
        db: Session,
        event_type: str,
        application_id: str | None = None,
        actor_id: str | None = None,
        payload: dict[str, Any] | None = None,
    ) -> AuditLog:
        event = AuditLog(
            application_id=application_id,
            actor_id=actor_id,
            event_type=event_type,
            event_payload=payload or {},
        )
        db.add(event)
        return event


audit_service = AuditService()

