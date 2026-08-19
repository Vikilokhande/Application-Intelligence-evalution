from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Role, Scheme, SchemeRule, User


DEFAULT_SCHEME_CODE = "GREEN-INFRA-SUPPORT"


def seed_default_data(db: Session) -> Scheme:
    scheme = db.scalars(select(Scheme).where(Scheme.code == DEFAULT_SCHEME_CODE)).first()
    if scheme:
        return scheme

    normal_role = Role(name="normal_reviewer", description="Standard application reviewer")
    expert_role = Role(name="expert_reviewer", description="Subject-matter expert reviewer")
    senior_role = Role(name="senior_reviewer", description="Senior reviewer with override authority")
    db.add_all([normal_role, expert_role, senior_role])
    db.flush()
    db.add(
        User(
            username="demo-reviewer",
            display_name="Demo Senior Reviewer",
            role_id=senior_role.id,
            expertise={"categories": ["Urban Greening", "Waste Management", "Water Conservation"]},
        )
    )

    scheme = Scheme(
        code=DEFAULT_SCHEME_CODE,
        name="Green Infrastructure Support Scheme",
        description="Fictional local scheme for development and demonstration.",
        configuration={
            "source": "local synthetic configuration",
            "data_sovereignty": "restricted mock data remains local",
        },
    )
    db.add(scheme)
    db.flush()

    rules = [
        SchemeRule(
            scheme_id=scheme.id,
            rule_id="REQUIRED_DOCUMENTS",
            rule_name="Required application documents",
            rule_type="required_documents",
            condition={"document_types": ["APPLICATION_FORM", "PROPOSAL", "BUDGET", "CERTIFICATE"]},
            severity="ERROR",
        ),
        SchemeRule(
            scheme_id=scheme.id,
            rule_id="PROJECT_COST_LIMIT",
            rule_name="Maximum project cost",
            rule_type="max_value",
            condition={"field": "financial.project_cost", "max": 5_000_000},
            severity="ERROR",
        ),
        SchemeRule(
            scheme_id=scheme.id,
            rule_id="PROJECT_DURATION_LIMIT",
            rule_name="Maximum project duration",
            rule_type="max_duration",
            condition={"field": "timeline.duration_months", "max": 24},
            severity="ERROR",
        ),
        SchemeRule(
            scheme_id=scheme.id,
            rule_id="ELIGIBLE_ORGANIZATION_TYPE",
            rule_name="Eligible organization type",
            rule_type="in_set",
            condition={
                "field": "applicant.organization_type",
                "allowed_values": ["Municipality", "Registered NGO", "Academic Institution", "Government Agency"],
            },
            severity="ERROR",
        ),
        SchemeRule(
            scheme_id=scheme.id,
            rule_id="REQUIRED_PROJECT_CATEGORY",
            rule_name="Project category required",
            rule_type="required_field",
            condition={"field": "project.category"},
            severity="WARNING",
        ),
    ]
    db.add_all(rules)
    db.commit()
    db.refresh(scheme)
    return scheme

