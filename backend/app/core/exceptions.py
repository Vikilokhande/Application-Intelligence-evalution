class ApplicationError(Exception):
    """Base exception for expected application failures."""

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

