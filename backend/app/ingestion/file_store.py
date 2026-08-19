import hashlib
import mimetypes
import re
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from app.core.config import get_settings
from app.core.exceptions import UnsupportedFileError


FILENAME_CLEANER = re.compile(r"[^A-Za-z0-9._-]+")


class StoredFile:
    def __init__(self, filename: str, mime_type: str, file_path: str, checksum: str, size_bytes: int) -> None:
        self.filename = filename
        self.mime_type = mime_type
        self.file_path = file_path
        self.checksum = checksum
        self.size_bytes = size_bytes


class FileStorageService:
    def __init__(self) -> None:
        self.settings = get_settings()

    def _safe_filename(self, filename: str) -> str:
        name = Path(filename or "uploaded-file").name
        cleaned = FILENAME_CLEANER.sub("_", name).strip("._")
        return cleaned or "uploaded-file"

    def validate_extension(self, filename: str) -> str:
        suffix = Path(filename).suffix.lower().lstrip(".")
        if suffix not in self.settings.allowed_extension_set:
            raise UnsupportedFileError(f"Unsupported file type: .{suffix or 'unknown'}")
        return suffix

    async def save_upload(self, application_id: str, upload: UploadFile) -> StoredFile:
        safe_name = self._safe_filename(upload.filename or "uploaded-file")
        extension = self.validate_extension(safe_name)
        content = await upload.read()
        size_bytes = len(content)
        if size_bytes > self.settings.max_upload_bytes:
            raise UnsupportedFileError("File exceeds configured upload size limit")

        checksum = hashlib.sha256(content).hexdigest()
        upload_root = Path(self.settings.upload_dir).resolve()
        app_dir = (upload_root / application_id).resolve()
        if upload_root not in app_dir.parents and app_dir != upload_root:
            raise UnsupportedFileError("Invalid upload path")
        app_dir.mkdir(parents=True, exist_ok=True)

        destination = app_dir / f"{uuid4().hex}_{safe_name}"
        destination.write_bytes(content)

        mime_type = upload.content_type or mimetypes.guess_type(safe_name)[0] or f"application/{extension}"
        return StoredFile(safe_name, mime_type, str(destination), checksum, size_bytes)


file_storage_service = FileStorageService()
