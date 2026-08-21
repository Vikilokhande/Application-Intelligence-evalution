"""
core/security.py
================

JWT authentication and role-based authorization.

When AUTH_ENABLED=true:
  - validate Bearer token from Authorization header
  - extract user identity and role from token claims
  - require specific roles via require_roles()

When AUTH_ENABLED=false (demo mode):
  - use hardcoded demo user context
  - POST /api/v1/auth/token returns a real JWT for the demo user

API key is NEVER logged.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

logger = logging.getLogger(__name__)

_bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class UserContext:
    user_id: str
    role: str


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------


def _get_jwt_module() -> tuple[Any, Any]:
    try:
        from jose import JWTError, jwt  # type: ignore
        return jwt, JWTError
    except ImportError as exc:
        raise ImportError(
            "python-jose is required for JWT auth. Install with: pip install python-jose[cryptography]"
        ) from exc


def create_access_token(user_id: str, role: str) -> str:
    """Create a JWT for the given user. Never log the token."""
    from app.core.config import get_settings
    settings = get_settings()
    jwt_module, _ = _get_jwt_module()

    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {
        "sub": user_id,
        "role": role,
        "exp": expire,
    }
    token = jwt_module.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    logger.info("Access token issued for user_id=%s role=%s", user_id, role)
    return token


def decode_access_token(token: str) -> UserContext:
    """Decode and validate a JWT. Raises HTTPException on failure."""
    from app.core.config import get_settings
    settings = get_settings()
    jwt_module, JWTError = _get_jwt_module()

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt_module.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id: str = payload.get("sub", "")
        role: str = payload.get("role", "")
        if not user_id:
            raise credentials_exception
        return UserContext(user_id=user_id, role=role)
    except Exception:
        raise credentials_exception


# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Security(_bearer_scheme),
) -> UserContext:
    from app.core.config import get_settings
    settings = get_settings()

    if not settings.auth_enabled:
        # Demo mode — always return demo reviewer context
        return UserContext(user_id="demo-reviewer", role="senior_reviewer")

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Provide Authorization: Bearer <token>.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return decode_access_token(credentials.credentials)


def require_roles(*roles: str) -> Callable[[UserContext], UserContext]:
    def dependency(user: UserContext = Depends(get_current_user)) -> UserContext:
        if roles and user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient role. Required: {list(roles)}. Current: {user.role}",
            )
        return user
    return dependency


# ---------------------------------------------------------------------------
# Type alias for jose module (avoid linter complaints on conditional import)
# ---------------------------------------------------------------------------
from typing import Any
