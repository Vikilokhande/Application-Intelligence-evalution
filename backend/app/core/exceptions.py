class ApplicationError(Exception):
    """Base exception for expected application-domain failures."""

    def __init__(self, message: str, code: str = "APPLICATION_ERROR") -> None:
        super().__init__(message)
        self.message = message
        self.code = code


class UnsupportedFileError(ApplicationError):
    def __init__(self, message: str) -> None:
        super().__init__(message, "UNSUPPORTED_FILE")


class ValidationWorkflowError(ApplicationError):
    def __init__(self, message: str) -> None:
        super().__init__(message, "VALIDATION_WORKFLOW_ERROR")


class ModelUnavailableError(ApplicationError):
    def __init__(self, message: str = "ML scoring unavailable.") -> None:
        super().__init__(message, "MODEL_UNAVAILABLE")


class ConfigurationError(ApplicationError):
    """Raised at startup when required configuration is missing or invalid."""

    def __init__(self, message: str) -> None:
        super().__init__(message, "CONFIGURATION_ERROR")


class LLMProviderError(ApplicationError):
    """Raised when the configured LLM provider fails or is unavailable."""

    def __init__(
        self,
        message: str,
        provider: str = "",
        status_code: int | None = None,
        retry_after: float | None = None,
        model: str = "",
    ) -> None:
        detail = f"[LLM:{provider}] {message}" if provider else message
        super().__init__(detail, "LLM_PROVIDER_ERROR")
        self.provider = provider
        self.status_code = status_code
        self.retry_after = retry_after
        self.model = model


class OCRProviderError(ApplicationError):
    """Raised when OCR is required but the provider is unavailable or fails."""

    def __init__(self, message: str, provider: str = "", document_id: str = "", application_id: str = "") -> None:
        detail = f"[OCR:{provider}] {message}" if provider else message
        super().__init__(detail, "OCR_PROVIDER_ERROR")
        self.provider = provider
        self.document_id = document_id
        self.application_id = application_id


class EmbeddingProviderError(ApplicationError):
    """Raised when the embedding provider fails."""

    def __init__(self, message: str, provider: str = "") -> None:
        detail = f"[EMBEDDING:{provider}] {message}" if provider else message
        super().__init__(detail, "EMBEDDING_PROVIDER_ERROR")
        self.provider = provider


class DocumentParsingError(ApplicationError):
    """Raised when a document cannot be parsed."""

    def __init__(self, message: str, document_id: str = "", filename: str = "") -> None:
        super().__init__(message, "DOCUMENT_PARSING_ERROR")
        self.document_id = document_id
        self.filename = filename


class ExtractionError(ApplicationError):
    """Raised when field extraction fails."""

    def __init__(self, message: str, document_id: str = "", application_id: str = "") -> None:
        super().__init__(message, "EXTRACTION_ERROR")
        self.document_id = document_id
        self.application_id = application_id
