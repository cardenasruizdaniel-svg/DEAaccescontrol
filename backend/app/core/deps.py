import logging
from typing import Annotated, Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import verify_token
from app.shared.database.models_auth import Permission, RolePermission, User
from app.shared.database.models_hr import Employee

logger = logging.getLogger(__name__)

security_scheme = HTTPBearer()


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token = credentials.credentials
    payload = verify_token(token)
    if payload is None:
        raise credentials_exception

    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    token_type: str | None = payload.get("type")
    if token_type != "access":
        raise credentials_exception

    # Look up the employee by their username (which matches the User.id used in JWT)
    # First try to find by employee ID directly, then fall back to username lookup
    result = await db.execute(
        select(Employee)
        .options(selectinload(Employee.role))
        .where(Employee.id == user_id, Employee.is_deleted == False)
    )
    employee = result.scalar_one_or_none()

    if employee is None:
        # Fallback: try by username (JWT might store username as sub)
        result = await db.execute(
            select(Employee)
            .options(selectinload(Employee.role))
            .where(Employee.username == user_id, Employee.is_deleted == False)
        )
        employee = result.scalar_one_or_none()

    if employee is None:
        # Fallback: sub might be a User ID — look up via user.employee_id
        result = await db.execute(
            select(User).where(User.id == user_id, User.is_deleted == False)
        )
        user = result.scalar_one_or_none()
        if user and user.employee_id:
            result = await db.execute(
                select(Employee)
                .options(selectinload(Employee.role))
                .where(Employee.id == user.employee_id, Employee.is_deleted == False)
            )
            employee = result.scalar_one_or_none()

    if employee is None:
        raise credentials_exception

    # Check if employee has active access
    if employee.account_status != "active" and not employee.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not active",
        )

    return employee


async def get_current_active_superuser(
    current_user=Depends(get_current_user),
):
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    return current_user


def require_permission(module: str, action: str) -> Callable:
    """Dependency factory that checks the current user's role has a specific permission.
    
    Superusers bypass permission checks.
    Users without a role are denied.
    """
    async def _check(
        current_user: Annotated[object, Depends(get_current_user)],
        db: Annotated[AsyncSession, Depends(get_db)],
    ):
        # Superusers have all permissions
        if current_user.is_superuser:
            return current_user

        # Must have a role
        if not current_user.role_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: no role assigned (requires {module}:{action})",
            )

        # Check if the role has the required permission
        stmt = (
            select(Permission.id)
            .join(RolePermission, RolePermission.permission_id == Permission.id)
            .where(
                RolePermission.role_id == current_user.role_id,
                Permission.module == module,
                Permission.action == action,
                Permission.is_active == True,
                Permission.is_deleted == False,
            )
            .limit(1)
        )
        result = await db.execute(stmt)
        if result.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: requires {module}:{action}",
            )

        return current_user

    return _check


CurrentUser = Annotated[object, Depends(get_current_user)]
CurrentSuperUser = Annotated[object, Depends(get_current_active_superuser)]
DbSession = Annotated[AsyncSession, Depends(get_db)]
