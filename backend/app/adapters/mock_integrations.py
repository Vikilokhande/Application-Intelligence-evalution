from dataclasses import dataclass


@dataclass(frozen=True)
class VerificationResult:
    status: str
    message: str


class SchemesPortalAdapter:
    def publish_status(self, application_id: str, status: str) -> VerificationResult:
        return VerificationResult("MOCK_RECORDED", f"Status {status} recorded locally for {application_id}.")


class IdentityServiceAdapter:
    def verify_reviewer(self, reviewer_id: str) -> VerificationResult:
        return VerificationResult("MOCK_VERIFIED", f"Reviewer {reviewer_id} accepted by local identity mock.")


class MessagingAdapter:
    def send(self, recipient: str, subject: str, body: str) -> VerificationResult:
        return VerificationResult("MOCK_SENT", f"Message to {recipient} stored by local mock adapter.")


class DocumentVerificationAdapter:
    def verify_certificate(self, certificate_number: str) -> VerificationResult:
        if certificate_number:
            return VerificationResult("MOCK_REQUIRES_MANUAL_REVIEW", "Certificate number captured; authoritative verification not configured.")
        return VerificationResult("MOCK_INSUFFICIENT_DATA", "No certificate number provided.")

