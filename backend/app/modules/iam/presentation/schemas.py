from pydantic import BaseModel
from datetime import datetime


# --- Roles ---

class RoleCreateRequest(BaseModel):
    name: str
    display_name: str | None = None
    description: str | None = None
    level: int = 0
    color: str | None = None
    icon: str | None = None

class RoleUpdateRequest(BaseModel):
    display_name: str | None = None
    description: str | None = None
    level: int | None = None
    color: str | None = None
    icon: str | None = None
    is_active: bool | None = None

class RoleResponse(BaseModel):
    id: str
    name: str
    display_name: str | None = None
    description: str | None = None
    is_active: bool
    is_system: bool
    level: int
    color: str | None = None
    icon: str | None = None
    permission_count: int = 0
    user_count: int = 0

class RoleListResponse(BaseModel):
    items: list[RoleResponse]
    total: int


# --- Permissions ---

class PermissionResponse(BaseModel):
    id: str
    module: str
    action: str
    display_name: str | None = None
    description: str | None = None
    is_active: bool

class PermissionListResponse(BaseModel):
    items: list[PermissionResponse]
    total: int

class PermissionMatrixResponse(BaseModel):
    modules: list[str]
    actions: list[str]
    roles: list[dict]

class RolePermissionUpdateRequest(BaseModel):
    permission_ids: list[str]


# --- Sessions ---

class SessionResponse(BaseModel):
    id: str
    employee_id: str | None = None
    platform: str | None = None
    device_info: str | None = None
    device_model: str | None = None
    device_os: str | None = None
    ip_address: str | None = None
    is_active: bool
    expires_at: str | None = None
    created_at: str | None = None

class SessionListResponse(BaseModel):
    items: list[SessionResponse]
    total: int


# --- Audit Logs ---

class AuditLogResponse(BaseModel):
    id: str
    employee_id: str | None = None
    employee_name: str | None = None
    action: str
    module: str
    entity_type: str | None = None
    entity_id: str | None = None
    old_values: str | None = None
    new_values: str | None = None
    ip_address: str | None = None
    platform: str | None = None
    status: str
    created_at: str | None = None

class AuditLogListResponse(BaseModel):
    items: list[AuditLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# --- User Admin ---

class UserAdminResponse(BaseModel):
    id: str
    email: str
    username: str
    full_name: str
    is_active: bool
    is_superuser: bool
    role_id: str | None = None
    role_name: str | None = None
    company_id: str | None = None
    employee_id: str | None = None
    account_status: str
    platform_access: str
    force_password_change: bool
    first_login_completed: bool
    biometric_enrolled: bool
    app_status: str
    last_login: str | None = None
    last_platform: str | None = None
    failed_login_attempts: int
    created_at: str | None = None

class UserAdminListResponse(BaseModel):
    items: list[UserAdminResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

class UserAdminUpdateRequest(BaseModel):
    role_id: str | None = None
    account_status: str | None = None
    platform_access: str | None = None
    force_password_change: bool | None = None
    is_active: bool | None = None

class AdminDashboardStats(BaseModel):
    total_employees: int
    active_users: int
    no_access: int
    web_only: int
    mobile_only: int
    both_platforms: int
    blocked: int
    no_photo: int
    last_24h_accesses: int
    active_sessions: int
    recent_logins: list[dict]
    platform_distribution: dict
    role_distribution: list[dict]
