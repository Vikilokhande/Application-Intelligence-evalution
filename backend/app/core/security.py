from collections.abc import Callable
from dataclasses import dataclass

from fastapi import Depends, HTTPException, status


@dataclass(frozen=True)
class UserContext:
    user_id: str
    role: str


def get_current_user() -> UserContext:
    return UserContext(user_id="demo-reviewer", role="senior_reviewer")


def require_roles(*roles: str) -> Callable[[UserContext], UserContext]:
    def dependency(user: UserContext = Depends(get_current_user)) -> UserContext:
        if roles and user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return user

    return dependency

