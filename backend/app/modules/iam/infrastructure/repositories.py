from datetime import datetime, timezone

from sqlalchemy import func, select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.shared.database.models_auth import (
    AuditLog,
    Permission,
    Role,
    RolePermission,
    UserSession,
)
from app.shared.database.models_hr import Employee


class IAMRoleRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_all(self) -> list[Role]:
        result = await self.db.execute(
            select(Role).where(Role.is_deleted == False).order_by(Role.level.desc())
        )
        return list(result.scalars().all())

    async def get_by_id(self, role_id: str) -> Role | None:
        result = await self.db.execute(
            select(Role).where(Role.id == role_id, Role.is_deleted == False)
        )
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> Role | None:
        result = await self.db.execute(
            select(Role).where(Role.name == name, Role.is_deleted == False)
        )
        return result.scalar_one_or_none()

    async def create(self, **kwargs) -> Role:
        role = Role(**kwargs)
        self.db.add(role)
        await self.db.flush()
        return role

    async def update(self, role_id: str, **kwargs) -> Role | None:
        kwargs["updated_at"] = datetime.now(timezone.utc)
        await self.db.execute(
            update(Role).where(Role.id == role_id).values(**kwargs)
        )
        await self.db.flush()
        return await self.get_by_id(role_id)

    async def soft_delete(self, role_id: str) -> None:
        await self.db.execute(
            update(Role).where(Role.id == role_id).values(
                is_deleted=True, updated_at=datetime.now(timezone.utc)
            )
        )
        await self.db.flush()

    async def get_permission_count(self, role_id: str) -> int:
        result = await self.db.execute(
            select(func.count(RolePermission.permission_id)).where(
                RolePermission.role_id == role_id
            )
        )
        return result.scalar() or 0

    async def get_user_count(self, role_id: str) -> int:
        result = await self.db.execute(
            select(func.count(Employee.id)).where(
                Employee.role_id == role_id, Employee.is_deleted == False
            )
        )
        return result.scalar() or 0


class IAMPermissionRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_all(self) -> list[Permission]:
        result = await self.db.execute(
            select(Permission).where(Permission.is_deleted == False).order_by(Permission.module, Permission.action)
        )
        return list(result.scalars().all())

    async def list_by_module(self, module: str) -> list[Permission]:
        result = await self.db.execute(
            select(Permission).where(
                Permission.module == module, Permission.is_deleted == False
            ).order_by(Permission.action)
        )
        return list(result.scalars().all())

    async def get_by_id(self, perm_id: str) -> Permission | None:
        result = await self.db.execute(
            select(Permission).where(Permission.id == perm_id, Permission.is_deleted == False)
        )
        return result.scalar_one_or_none()

    async def get_role_permissions(self, role_id: str) -> list[str]:
        result = await self.db.execute(
            select(RolePermission.permission_id).where(RolePermission.role_id == role_id)
        )
        return [row[0] for row in result.fetchall()]

    async def set_role_permissions(self, role_id: str, permission_ids: list[str]) -> None:
        await self.db.execute(
            delete(RolePermission).where(RolePermission.role_id == role_id)
        )
        for pid in permission_ids:
            rp = RolePermission(id=str(__import__("uuid").uuid4()), role_id=role_id, permission_id=pid)
            self.db.add(rp)
        await self.db.flush()


class IAMSessionRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_active(self, employee_id: str | None = None) -> list[UserSession]:
        query = select(UserSession).where(UserSession.is_active == True, UserSession.is_deleted == False)
        if employee_id:
            query = query.where(UserSession.employee_id == employee_id)
        result = await self.db.execute(query.order_by(UserSession.created_at.desc()))
        return list(result.scalars().all())

    async def list_all(self, skip: int = 0, limit: int = 50) -> tuple[list[UserSession], int]:
        query = select(UserSession).where(UserSession.is_deleted == False)
        count_query = select(func.count(UserSession.id)).where(UserSession.is_deleted == False)
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0
        result = await self.db.execute(
            query.order_by(UserSession.created_at.desc()).offset(skip).limit(limit)
        )
        return list(result.scalars().all()), total

    async def deactivate(self, session_id: str) -> None:
        await self.db.execute(
            update(UserSession).where(UserSession.id == session_id).values(is_active=False)
        )
        await self.db.flush()

    async def deactivate_all_user(self, employee_id: str) -> None:
        await self.db.execute(
            update(UserSession).where(
                UserSession.employee_id == employee_id, UserSession.is_active == True
            ).values(is_active=False)
        )
        await self.db.flush()

    async def count_active(self) -> int:
        result = await self.db.execute(
            select(func.count(UserSession.id)).where(
                UserSession.is_active == True, UserSession.is_deleted == False
            )
        )
        return result.scalar() or 0


class IAMAuditRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def log(self, *, employee_id: str | None = None, action: str, module: str,
                  entity_type: str | None = None, entity_id: str | None = None,
                  old_values: str | None = None, new_values: str | None = None,
                  ip_address: str | None = None, user_agent: str | None = None,
                  platform: str | None = None, status: str = "success") -> AuditLog:
        audit = AuditLog(
            employee_id=employee_id, action=action, module=module,
            entity_type=entity_type, entity_id=entity_id,
            old_values=old_values, new_values=new_values,
            ip_address=ip_address, user_agent=user_agent,
            platform=platform, status=status,
        )
        self.db.add(audit)
        await self.db.flush()
        return audit

    async def list_logs(self, skip: int = 0, limit: int = 25,
                        employee_id: str | None = None, module: str | None = None,
                        action: str | None = None) -> tuple[list[AuditLog], int]:
        query = select(AuditLog).where(AuditLog.is_deleted == False)
        count_query = select(func.count(AuditLog.id)).where(AuditLog.is_deleted == False)
        if employee_id:
            query = query.where(AuditLog.employee_id == employee_id)
            count_query = count_query.where(AuditLog.employee_id == employee_id)
        if module:
            query = query.where(AuditLog.module == module)
            count_query = count_query.where(AuditLog.module == module)
        if action:
            query = query.where(AuditLog.action == action)
            count_query = count_query.where(AuditLog.action == action)
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0
        result = await self.db.execute(
            query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
        )
        return list(result.scalars().all()), total

    async def count_recent(self, hours: int = 24) -> int:
        from datetime import timedelta
        since = datetime.now(timezone.utc) - timedelta(hours=hours)
        result = await self.db.execute(
            select(func.count(AuditLog.id)).where(
                AuditLog.created_at >= since, AuditLog.is_deleted == False
            )
        )
        return result.scalar() or 0


class IAMEmployeeRepository:
    """Replaces IAMUserRepository - queries Employee table instead of User."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, employee_id: str) -> Employee | None:
        result = await self.db.execute(
            select(Employee).where(Employee.id == employee_id, Employee.is_deleted == False)
        )
        return result.scalar_one_or_none()

    async def update(self, employee_id: str, **kwargs) -> Employee | None:
        kwargs["updated_at"] = datetime.now(timezone.utc)
        await self.db.execute(
            update(Employee).where(Employee.id == employee_id).values(**kwargs)
        )
        await self.db.flush()
        return await self.get_by_id(employee_id)

    async def list_employees(self, skip: int = 0, limit: int = 25,
                             search: str | None = None, company_id: str | None = None,
                             account_status: str | None = None,
                             platform_access: str | None = None,
                             role_id: str | None = None) -> tuple[list[Employee], int]:
        query = select(Employee).where(Employee.is_deleted == False)
        count_query = select(func.count(Employee.id)).where(Employee.is_deleted == False)
        if company_id:
            query = query.where(Employee.company_id == company_id)
            count_query = count_query.where(Employee.company_id == company_id)
        if search:
            sf = Employee.first_name.ilike(f"%{search}%") | Employee.last_name.ilike(f"%{search}%") | Employee.email.ilike(f"%{search}%") | Employee.code.ilike(f"%{search}%")
            query = query.where(sf)
            count_query = count_query.where(sf)
        if account_status:
            query = query.where(Employee.account_status == account_status)
            count_query = count_query.where(Employee.account_status == account_status)
        if platform_access:
            query = query.where(Employee.platform_access == platform_access)
            count_query = count_query.where(Employee.platform_access == platform_access)
        if role_id:
            query = query.where(Employee.role_id == role_id)
            count_query = count_query.where(Employee.role_id == role_id)
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0
        result = await self.db.execute(
            query.order_by(Employee.created_at.desc()).offset(skip).limit(limit)
        )
        return list(result.scalars().all()), total

    async def get_dashboard_stats(self) -> dict:
        total_q = select(func.count(Employee.id)).where(Employee.is_deleted == False)
        total = (await self.db.execute(total_q)).scalar() or 0

        active_q = select(func.count(Employee.id)).where(Employee.is_deleted == False, Employee.status == "active")
        active = (await self.db.execute(active_q)).scalar() or 0

        no_access_q = select(func.count(Employee.id)).where(Employee.is_deleted == False, Employee.platform_access == "none")
        no_access = (await self.db.execute(no_access_q)).scalar() or 0

        web_q = select(func.count(Employee.id)).where(Employee.is_deleted == False, Employee.platform_access == "web")
        web_only = (await self.db.execute(web_q)).scalar() or 0

        mobile_q = select(func.count(Employee.id)).where(Employee.is_deleted == False, Employee.platform_access == "mobile")
        mobile_only = (await self.db.execute(mobile_q)).scalar() or 0

        both_q = select(func.count(Employee.id)).where(Employee.is_deleted == False, Employee.platform_access == "both")
        both = (await self.db.execute(both_q)).scalar() or 0

        blocked_q = select(func.count(Employee.id)).where(Employee.is_deleted == False, Employee.account_status == "locked")
        blocked = (await self.db.execute(blocked_q)).scalar() or 0

        no_photo_q = select(func.count(Employee.id)).where(Employee.is_deleted == False, Employee.biometric_enrolled == False)
        no_photo = (await self.db.execute(no_photo_q)).scalar() or 0

        active_sessions = (await self.db.execute(
            select(func.count(UserSession.id)).where(UserSession.is_active == True, UserSession.is_deleted == False)
        )).scalar() or 0

        role_dist_q = (
            select(Employee.role_id, func.count(Employee.id).label("cnt"))
            .where(Employee.is_deleted == False, Employee.role_id.isnot(None))
            .group_by(Employee.role_id)
        )
        role_rows = (await self.db.execute(role_dist_q)).fetchall()
        role_dist = [{"role_id": r[0], "count": r[1]} for r in role_rows]

        platform_dist = {"web": web_only, "mobile": mobile_only, "both": both, "none": no_access}

        return {
            "total_employees": total,
            "active_users": active,
            "no_access": no_access,
            "web_only": web_only,
            "mobile_only": mobile_only,
            "both_platforms": both,
            "blocked": blocked,
            "no_photo": no_photo,
            "last_24h_accesses": 0,
            "active_sessions": active_sessions,
            "recent_logins": [],
            "platform_distribution": platform_dist,
            "role_distribution": role_dist,
        }
