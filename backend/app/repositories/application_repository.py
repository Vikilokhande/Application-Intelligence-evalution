from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Application


class ApplicationRepository:
    def get_detail(self, db: Session, application_id: str) -> Application | None:
        stmt = (
            select(Application)
            .where(Application.id == application_id)
            .options(
                selectinload(Application.documents),
                selectinload(Application.validation_results),
                selectinload(Application.rule_results),
                selectinload(Application.evidence),
                selectinload(Application.predictions),
                selectinload(Application.profiles),
                selectinload(Application.features),
                selectinload(Application.assignments),
                selectinload(Application.decisions),
            )
        )
        return db.scalars(stmt).first()


application_repository = ApplicationRepository()

