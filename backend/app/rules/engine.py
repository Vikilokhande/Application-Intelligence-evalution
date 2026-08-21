from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.audit.service import audit_service
from app.models import Application, Document, RuleResult, SchemeRule
from app.normalization.service import get_profile_value


class RuleEngine:
    def evaluate(
        self,
        db: Session,
        application: Application,
        profile: dict[str, Any],
    ) -> list[RuleResult]:
        db.execute(delete(RuleResult).where(RuleResult.application_id == application.id))
        if not application.scheme_id:
            return []
        rules = db.scalars(
            select(SchemeRule)
            .where(SchemeRule.scheme_id == application.scheme_id)
            .where(SchemeRule.active.is_(True))
        ).all()
        documents = db.scalars(select(Document).where(Document.application_id == application.id)).all()
        results = [self._evaluate_rule(application.id, rule, profile, documents) for rule in rules]
        db.add_all(results)
        pass_count = sum(1 for r in results if r.result == "PASS")
        fail_count = sum(1 for r in results if r.result == "FAIL")
        audit_service.record(
            db,
            "rule_executed",
            application_id=application.id,
            payload={"rules": len(results), "passed": pass_count, "failures": fail_count},
        )
        return results

    def _evaluate_rule(
        self,
        application_id: str,
        rule: SchemeRule,
        profile: dict[str, Any],
        documents: list[Document],
    ) -> RuleResult:
        try:
            if rule.rule_type == "max_value":
                return self._max_value(application_id, rule, profile)
            if rule.rule_type == "min_value":
                return self._min_value(application_id, rule, profile)
            if rule.rule_type == "in_set":
                return self._in_set(application_id, rule, profile)
            if rule.rule_type == "required_documents":
                return self._required_documents(application_id, rule, documents)
            if rule.rule_type == "required_field":
                return self._required_field(application_id, rule, profile)
            if rule.rule_type == "max_duration":
                return self._max_value(application_id, rule, profile)
            if rule.rule_type == "min_duration":
                return self._min_value(application_id, rule, profile)
            if rule.rule_type == "boolean":
                return self._boolean(application_id, rule, profile)
            return self._unknown(application_id, rule)
        except Exception as exc:  # noqa: BLE001
            return self._result(
                application_id,
                rule,
                "ERROR",
                {},
                {},
                f"Rule evaluation error: {exc}",
                {"error": str(exc)},
            )

    def _max_value(self, application_id: str, rule: SchemeRule, profile: dict[str, Any]) -> RuleResult:
        field = rule.condition["field"]
        maximum = float(rule.condition["max"])
        actual = get_profile_value(profile, field)
        passed = actual is not None and float(actual) <= maximum
        return self._result(
            application_id,
            rule,
            "PASS" if passed else "FAIL",
            {"field": field, "operator": "<=", "value": maximum},
            {"field": field, "value": actual},
            "Rule passed." if passed else f"{field} exceeds configured scheme limit.",
            {"field": field},
        )

    def _in_set(self, application_id: str, rule: SchemeRule, profile: dict[str, Any]) -> RuleResult:
        field = rule.condition["field"]
        allowed = rule.condition.get("allowed_values", [])
        actual = get_profile_value(profile, field)
        passed = actual in allowed
        return self._result(
            application_id,
            rule,
            "PASS" if passed else "FAIL",
            {"field": field, "allowed_values": allowed},
            {"field": field, "value": actual},
            "Rule passed." if passed else f"{field} is not in the configured eligible values.",
            {"field": field},
        )

    def _required_documents(self, application_id: str, rule: SchemeRule, documents: list[Document]) -> RuleResult:
        required = set(rule.condition.get("document_types", []))
        present = {document.document_type for document in documents}
        missing = sorted(required - present)
        return self._result(
            application_id,
            rule,
            "PASS" if not missing else "FAIL",
            {"required_documents": sorted(required)},
            {"present_documents": sorted(present), "missing_documents": missing},
            "Rule passed." if not missing else f"Missing required documents: {', '.join(missing)}.",
            {"document_types": sorted(present)},
        )

    def _min_value(self, application_id: str, rule: SchemeRule, profile: dict[str, Any]) -> RuleResult:
        field = rule.condition["field"]
        minimum = float(rule.condition["min"])
        actual = get_profile_value(profile, field)
        passed = actual is not None and float(actual) >= minimum
        return self._result(
            application_id,
            rule,
            "PASS" if passed else "FAIL",
            {"field": field, "operator": ">=", "value": minimum},
            {"field": field, "value": actual},
            "Rule passed." if passed else f"{field} is below the configured scheme minimum.",
            {"field": field},
        )

    def _boolean(self, application_id: str, rule: SchemeRule, profile: dict[str, Any]) -> RuleResult:
        field = rule.condition["field"]
        expected = bool(rule.condition.get("expected", True))
        actual = get_profile_value(profile, field)
        # Treat None / empty / 0 / False as falsy
        actual_bool = bool(actual) if actual is not None else False
        passed = actual_bool == expected
        return self._result(
            application_id,
            rule,
            "PASS" if passed else "FAIL",
            {"field": field, "expected": expected},
            {"field": field, "value": actual},
            "Rule passed." if passed else f"{field} does not meet the boolean requirement.",
            {"field": field},
        )

    def _required_field(self, application_id: str, rule: SchemeRule, profile: dict[str, Any]) -> RuleResult:
        field = rule.condition["field"]
        actual = get_profile_value(profile, field)
        passed = actual not in (None, "")
        return self._result(
            application_id,
            rule,
            "PASS" if passed else "FAIL",
            {"field": field, "required": True},
            {"field": field, "value": actual},
            "Rule passed." if passed else f"{field} is required by scheme configuration.",
            {"field": field},
        )

    def _unknown(self, application_id: str, rule: SchemeRule) -> RuleResult:
        return self._result(
            application_id,
            rule,
            "ERROR",
            {"rule_type": rule.rule_type},
            {},
            "Unsupported rule type.",
            {},
        )

    def _result(
        self,
        application_id: str,
        rule: SchemeRule,
        result: str,
        expected: dict[str, Any],
        actual: dict[str, Any],
        reason: str,
        evidence: dict[str, Any],
    ) -> RuleResult:
        return RuleResult(
            application_id=application_id,
            scheme_rule_id=rule.id,
            rule_id=rule.rule_id,
            rule_name=rule.rule_name,
            result=result,
            expected_value=expected,
            actual_value=actual,
            reason=reason,
            evidence=evidence,
            severity=rule.severity,
        )


rule_engine = RuleEngine()

