from fastapi import APIRouter, Query

from app.core.deps import CurrentUser, CurrentSuperUser, DbSession
from app.modules.iam.application.service import IAMService
from app.modules.iam.presentation.schemas import (
    AdminDashboardStats,
    AuditLogListResponse,
    AuditLogResponse,
    PermissionListResponse,
    PermissionMatrixResponse,
    PermissionResponse,
    RoleCreateRequest,
    RoleListResponse,
    RolePermissionUpdateRequest,
    RoleResponse,
    RoleUpdateRequest,
    SessionListResponse,
    SessionResponse,
    UserAdminListResponse,
    UserAdminResponse,
    UserAdminUpdateRequest,
)

router = APIRouter(prefix="/iam", tags=["IAM"])


def get_service(db: DbSession) -> IAMService:
    return IAMService(db)


# ─── Roles ────────────────────────────────────────────────────────────────

@router.get("/roles", response_model=RoleListResponse)
async def list_roles(current_user: CurrentUser, db: DbSession) -> RoleListResponse:
    svc = get_service(db)
    roles = await svc.list_roles()
    return RoleListResponse(
        items=[RoleResponse(**r) for r in roles],
        total=len(roles),
    )


@router.get("/roles/{role_id}", response_model=RoleResponse)
async def get_role(role_id: str, current_user: CurrentUser, db: DbSession) -> RoleResponse:
    svc = get_service(db)
    r = await svc.get_role(role_id)
    return RoleResponse(**r)


@router.post("/roles", response_model=RoleResponse, status_code=201)
async def create_role(body: RoleCreateRequest, current_user: CurrentSuperUser, db: DbSession) -> RoleResponse:
    svc = get_service(db)
    r = await svc.create_role(
        name=body.name, display_name=body.display_name,
        description=body.description, level=body.level,
        color=body.color, icon=body.icon,
    )
    return RoleResponse(
        id=r.id, name=r.name, display_name=r.display_name,
        description=r.description, is_active=r.is_active,
        is_system=r.is_system, level=r.level, color=r.color, icon=r.icon,
    )


@router.put("/roles/{role_id}", response_model=RoleResponse)
async def update_role(role_id: str, body: RoleUpdateRequest, current_user: CurrentSuperUser, db: DbSession) -> RoleResponse:
    svc = get_service(db)
    r = await svc.update_role(role_id, **body.model_dump(exclude_unset=True))
    return RoleResponse(
        id=r.id, name=r.name, display_name=r.display_name,
        description=r.description, is_active=r.is_active,
        is_system=r.is_system, level=r.level, color=r.color, icon=r.icon,
    )


@router.delete("/roles/{role_id}")
async def delete_role(role_id: str, current_user: CurrentSuperUser, db: DbSession) -> dict:
    svc = get_service(db)
    await svc.delete_role(role_id)
    return {"message": "Role deleted"}


# ─── Permissions ──────────────────────────────────────────────────────────

@router.get("/permissions", response_model=PermissionListResponse)
async def list_permissions(current_user: CurrentUser, db: DbSession) -> PermissionListResponse:
    svc = get_service(db)
    perms = await svc.list_permissions()
    return PermissionListResponse(
        items=[PermissionResponse(
            id=p.id, module=p.module, action=p.action,
            display_name=p.display_name, description=p.description,
            is_active=p.is_active,
        ) for p in perms],
        total=len(perms),
    )


@router.get("/permissions/matrix", response_model=PermissionMatrixResponse)
async def get_permission_matrix(current_user: CurrentUser, db: DbSession) -> PermissionMatrixResponse:
    svc = get_service(db)
    matrix = await svc.get_permission_matrix()
    return PermissionMatrixResponse(**matrix)


@router.get("/roles/{role_id}/permissions")
async def get_role_permissions(role_id: str, current_user: CurrentUser, db: DbSession) -> dict:
    svc = get_service(db)
    perm_ids = await svc.get_role_permissions(role_id)
    return {"role_id": role_id, "permission_ids": perm_ids}


@router.put("/roles/{role_id}/permissions")
async def set_role_permissions(
    role_id: str, body: RolePermissionUpdateRequest,
    current_user: CurrentSuperUser, db: DbSession,
) -> dict:
    svc = get_service(db)
    perm_ids = await svc.set_role_permissions(role_id, body.permission_ids)
    return {"role_id": role_id, "permission_ids": perm_ids}


# ─── Sessions ─────────────────────────────────────────────────────────────

@router.get("/sessions", response_model=SessionListResponse)
async def list_sessions(
    current_user: CurrentUser, db: DbSession,
    employee_id: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
) -> SessionListResponse:
    svc = get_service(db)
    result = await svc.list_sessions(employee_id=employee_id, page=page, page_size=page_size)
    return SessionListResponse(
        items=[SessionResponse(
            id=s.id, employee_id=s.employee_id, platform=s.platform,
            device_info=s.device_info, device_model=s.device_model,
            device_os=s.device_os, ip_address=s.ip_address,
            is_active=s.is_active, expires_at=str(s.expires_at) if s.expires_at else None,
            created_at=str(s.created_at) if s.created_at else None,
        ) for s in result["items"]],
        total=result["total"],
    )


@router.delete("/sessions/{session_id}")
async def deactivate_session(session_id: str, current_user: CurrentSuperUser, db: DbSession) -> dict:
    svc = get_service(db)
    return await svc.deactivate_session(session_id)


@router.delete("/sessions/employee/{employee_id}")
async def deactivate_all_user_sessions(employee_id: str, current_user: CurrentSuperUser, db: DbSession) -> dict:
    svc = get_service(db)
    return await svc.deactivate_all_user_sessions(employee_id)


# ─── Audit Logs ───────────────────────────────────────────────────────────

@router.get("/audit-logs", response_model=AuditLogListResponse)
async def list_audit_logs(
    current_user: CurrentUser, db: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    employee_id: str | None = Query(None),
    module: str | None = Query(None),
    action: str | None = Query(None),
) -> AuditLogListResponse:
    svc = get_service(db)
    result = await svc.list_audit_logs(
        page=page, page_size=page_size,
        employee_id=employee_id, module=module, action=action,
    )
    return AuditLogListResponse(
        items=[AuditLogResponse(
            id=a.id, employee_id=a.employee_id, action=a.action,
            module=a.module, entity_type=a.entity_type,
            entity_id=a.entity_id, old_values=a.old_values,
            new_values=a.new_values, ip_address=a.ip_address,
            platform=a.platform, status=a.status,
            created_at=str(a.created_at) if a.created_at else None,
        ) for a in result["items"]],
        total=result["total"], page=result["page"],
        page_size=result["page_size"], total_pages=result["total_pages"],
    )


# ─── Employee Admin ───────────────────────────────────────────────────────

@router.get("/users", response_model=UserAdminListResponse)
async def list_users_admin(
    current_user: CurrentUser, db: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: str | None = Query(None),
    company_id: str | None = Query(None),
    account_status: str | None = Query(None),
    platform_access: str | None = Query(None),
    role_id: str | None = Query(None),
) -> UserAdminListResponse:
    svc = get_service(db)
    result = await svc.list_users_admin(
        page=page, page_size=page_size, search=search,
        company_id=company_id, account_status=account_status,
        platform_access=platform_access, role_id=role_id,
    )
    return UserAdminListResponse(**result)


@router.put("/users/{employee_id}", response_model=UserAdminResponse)
async def update_user_admin(
    employee_id: str, body: UserAdminUpdateRequest,
    current_user: CurrentSuperUser, db: DbSession,
) -> UserAdminResponse:
    svc = get_service(db)
    result = await svc.update_user_admin(employee_id, **body.model_dump(exclude_unset=True))
    return UserAdminResponse(
        id=result.id, email=result.email, username=result.username,
        full_name=f"{result.first_name} {result.last_name}", is_active=result.status == "active",
        is_superuser=result.is_superuser, role_id=result.role_id,
        company_id=result.company_id, employee_id=result.id,
        account_status=result.account_status,
        platform_access=result.platform_access,
        force_password_change=result.force_password_change,
        first_login_completed=result.first_login_completed,
        biometric_enrolled=result.biometric_enrolled,
        app_status=result.app_status, last_login=str(result.last_login) if result.last_login else None,
        last_platform=result.last_platform,
        failed_login_attempts=result.failed_login_attempts,
        created_at=str(result.created_at) if result.created_at else None,
    )


@router.get("/dashboard/stats", response_model=AdminDashboardStats)
async def get_admin_dashboard(current_user: CurrentUser, db: DbSession) -> AdminDashboardStats:
    svc = get_service(db)
    stats = await svc.get_admin_dashboard()
    return AdminDashboardStats(**stats)
