from datetime import datetime, timezone, timedelta

from fastapi import HTTPException, status
from sqlalchemy import select, update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    generate_mfa_secret,
    hash_password,
    verify_mfa_code,
    verify_password,
    verify_token,
)
from app.modules.auth.infrastructure.repositories import (
    AuditRepository,
    SessionRepository,
    UserRepository,
)
from app.shared.database.models_hr import Employee


class AuthService:
    def __init__(self, user_repo: UserRepository, session_repo: SessionRepository, audit_repo: AuditRepository, db: AsyncSession | None = None) -> None:
        self.user_repo = user_repo
        self.session_repo = session_repo
        self.audit_repo = audit_repo
        self.db = db

    async def _get_employee_by_email(self, email: str) -> Employee | None:
        if not self.db:
            return None
        result = await self.db.execute(
            select(Employee)
            .options(selectinload(Employee.role))
            .where(Employee.email == email, Employee.is_deleted == False, Employee.username.isnot(None))
        )
        return result.scalar_one_or_none()

    async def _get_employee_by_id(self, employee_id: str) -> Employee | None:
        if not self.db:
            return None
        result = await self.db.execute(
            select(Employee)
            .options(selectinload(Employee.role))
            .where(Employee.id == employee_id, Employee.is_deleted == False)
        )
        return result.scalar_one_or_none()

    async def _update_employee(self, employee_id: str, **kwargs) -> None:
        if not self.db:
            return
        await self.db.execute(
            sa_update(Employee).where(Employee.id == employee_id).values(**kwargs)
        )
        await self.db.flush()

    async def login(self, email: str, password: str, platform: str = "web",
                    ip_address: str | None = None, user_agent: str | None = None) -> dict:
        # Try Employee first (unified model)
        employee = await self._get_employee_by_email(email)

        if not employee:
            # Fallback to User table
            user = await self.user_repo.get_by_email(email)
            if not user:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")
            if not verify_password(password, user.hashed_password):
                await self.user_repo.update(user.id, failed_login_attempts=user.failed_login_attempts + 1)
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")
            if not user.is_active:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cuenta deshabilitada")
            if user.mfa_enabled:
                temp_token = create_access_token({"sub": user.id, "type": "mfa"}, expires_delta=None)
                return {"requires_mfa": True, "temp_token": temp_token, "access_token": "", "refresh_token": "", "user": None}
            token_data = {"sub": user.id, "email": user.email, "role": user.role_id or "", "company_id": user.company_id or ""}
            access_token = create_access_token(token_data)
            refresh_token = create_refresh_token(token_data)
            expires = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            await self.session_repo.create(user_id=user.id, token=access_token, refresh_token=refresh_token, ip_address=ip_address, user_agent=user_agent, expires_at=expires)
            await self.user_repo.update(user.id, last_login=datetime.now(timezone.utc).isoformat(), failed_login_attempts=0)
            await self.audit_repo.log(user_id=user.id, action="login", module="auth", ip_address=ip_address, user_agent=user_agent)
            return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer", "user": {"id": user.id, "email": user.email, "full_name": user.full_name, "is_superuser": user.is_superuser, "company_id": user.company_id}}

        if not employee.hashed_password:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="La cuenta no tiene contraseña configurada")

        # Account status checks
        if employee.account_status == "locked":
            if employee.locked_until:
                try:
                    if datetime.now(timezone.utc) < employee.locked_until:
                        raise HTTPException(status_code=status.HTTP_423_LOCKED,
                                            detail="Cuenta bloqueada temporalmente por demasiados intentos fallidos")
                    else:
                        await self._update_employee(employee.id, account_status="active",
                                                    failed_login_attempts=0, locked_until=None)
                        employee = await self._get_employee_by_id(employee.id)
                except TypeError:
                    pass
            else:
                raise HTTPException(status_code=status.HTTP_423_LOCKED, detail="Cuenta bloqueada")

        if employee.account_status == "suspended":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cuenta suspendida")
        if employee.account_status == "inactive":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cuenta inactiva")
        if employee.account_status == "pending_activation":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cuenta pendiente de activación")

        # Platform access check
        if platform and employee.platform_access not in ("both", platform):
            platform_names = {"web": "Web (ERP)", "mobile": "App Móvil", "both": "Web y App", "none": "Ninguno"}
            required = platform_names.get(employee.platform_access, employee.platform_access)
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail=f"No tiene acceso desde {platform_names.get(platform, platform)}. Acceso requerido: {required}")

        # Password verification
        if not verify_password(password, employee.hashed_password):
            attempts = employee.failed_login_attempts + 1
            update_data = {"failed_login_attempts": attempts}
            if attempts >= settings.PASSWORD_LOCKOUT_ATTEMPTS:
                lock_until = datetime.now(timezone.utc) + timedelta(minutes=settings.PASSWORD_LOCKOUT_MINUTES)
                update_data["account_status"] = "locked"
                update_data["locked_until"] = lock_until
            await self._update_employee(employee.id, **update_data)
            remaining = settings.PASSWORD_LOCKOUT_ATTEMPTS - attempts
            detail = "Credenciales inválidas"
            if remaining <= 2 and remaining > 0:
                detail = f"Credenciales inválidas. {remaining} intentos restantes antes del bloqueo"
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)

        # MFA check
        if employee.mfa_enabled:
            temp_token = create_access_token({"sub": employee.id, "type": "mfa"}, expires_delta=None)
            return {
                "requires_mfa": True, "temp_token": temp_token,
                "access_token": "", "refresh_token": "", "user": None,
            }

        # Successful login
        token_data = {
            "sub": employee.id, "email": employee.email or "",
            "role": employee.role_id or "", "company_id": employee.company_id or "",
        }
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)
        expires = (datetime.now(timezone.utc) + timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%SZ")

        await self.session_repo.create(
            employee_id=employee.id, token=access_token, refresh_token=refresh_token,
            platform=platform, ip_address=ip_address, user_agent=user_agent,
            expires_at=expires,
        )

        now = datetime.now(timezone.utc)
        update_fields = {
            "last_login": now,
            "last_platform": platform,
            "failed_login_attempts": 0,
            "locked_until": None,
        }
        if employee.account_status == "locked":
            update_fields["account_status"] = "active"
        await self._update_employee(employee.id, **update_fields)

        await self.audit_repo.log(
            employee_id=employee.id,
            action="login", module="auth",
            ip_address=ip_address, user_agent=user_agent, platform=platform,
        )

        full_name = f"{employee.first_name} {employee.last_name or ''}".strip()
        role_name = None
        if employee.role:
            role_name = employee.role.display_name or employee.role.name

        return {
            "access_token": access_token, "refresh_token": refresh_token,
            "token_type": "bearer", "first_login": not employee.first_login_completed,
            "force_password_change": employee.force_password_change,
            "user": {
                "id": employee.id, "email": employee.email or "", "full_name": full_name,
                "is_superuser": employee.is_superuser, "company_id": employee.company_id,
                "role_id": employee.role_id, "role_name": role_name,
                "mfa_enabled": employee.mfa_enabled,
                "first_login_completed": employee.first_login_completed,
                "platform_access": employee.platform_access,
                "account_status": employee.account_status,
                "employee_id": employee.id, "code": employee.code,
            },
        }

    async def verify_mfa(self, temp_token: str, code: str) -> dict:
        payload = verify_token(temp_token)
        if not payload or payload.get("type") != "mfa":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

        # Try Employee first
        employee = await self._get_employee_by_id(payload["sub"])
        if employee:
            if not employee.mfa_secret or not verify_mfa_code(employee.mfa_secret, code):
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid MFA code")
            token_data = {
                "sub": employee.id, "email": employee.email or "",
                "role": employee.role_id or "", "company_id": employee.company_id or "",
            }
            access_token = create_access_token(token_data)
            refresh_token = create_refresh_token(token_data)
            full_name = f"{employee.first_name} {employee.last_name or ''}".strip()
            return {
                "access_token": access_token, "refresh_token": refresh_token,
                "token_type": "bearer", "first_login": not employee.first_login_completed,
                "force_password_change": employee.force_password_change,
                "user": {
                    "id": employee.id, "email": employee.email or "", "full_name": full_name,
                    "is_superuser": employee.is_superuser, "company_id": employee.company_id,
                },
            }

        # Fallback to User table
        user = await self.user_repo.get_by_id(payload["sub"])
        if not user or not user.mfa_secret:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        if not verify_mfa_code(user.mfa_secret, code):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid MFA code")
        token_data = {"sub": user.id, "email": user.email, "role": user.role_id or "", "company_id": user.company_id or ""}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)
        return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer", "user": {"id": user.id, "email": user.email, "full_name": user.full_name}}

    async def register(self, email: str, username: str, password: str, full_name: str, company_id: str | None = None) -> dict:
        existing = await self.user_repo.get_by_email(email)
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
        existing_username = await self.user_repo.get_by_username(username)
        if existing_username:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")
        if len(password) < 8:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Password must be at least 8 characters long")
        user = await self.user_repo.create(email=email, username=username, hashed_password=hash_password(password), full_name=full_name, company_id=company_id, is_active=True, is_verified=False)
        token_data = {"sub": user.id, "email": user.email, "role": "", "company_id": company_id or ""}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)
        return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer", "user": {"id": user.id, "email": user.email, "full_name": user.full_name}}

    async def refresh_token(self, refresh: str) -> dict:
        payload = verify_token(refresh)
        if not payload or payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

        # Try Employee first
        employee = await self._get_employee_by_id(payload["sub"])
        if employee:
            token_data = {
                "sub": employee.id, "email": employee.email or "",
                "role": employee.role_id or "", "company_id": employee.company_id or "",
            }
            access_token = create_access_token(token_data)
            new_refresh = create_refresh_token(token_data)
            full_name = f"{employee.first_name} {employee.last_name or ''}".strip()
            return {
                "access_token": access_token, "refresh_token": new_refresh,
                "token_type": "bearer", "user": {
                    "id": employee.id, "email": employee.email or "", "full_name": full_name,
                    "is_superuser": employee.is_superuser, "company_id": employee.company_id,
                },
            }

        # Fallback to User
        user = await self.user_repo.get_by_id(payload["sub"])
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
        sessions = await self.session_repo.get_active_by_user(user.id)
        for s in sessions:
            if s.refresh_token == refresh:
                await self.session_repo.deactivate(s.id)
        token_data = {"sub": user.id, "email": user.email, "role": user.role_id or "", "company_id": user.company_id or ""}
        access_token = create_access_token(token_data)
        new_refresh = create_refresh_token(token_data)
        return {"access_token": access_token, "refresh_token": new_refresh, "token_type": "bearer"}

    async def enable_mfa(self, user_id: str) -> dict:
        secret = generate_mfa_secret()
        try:
            await self._update_employee(user_id, mfa_secret=secret, mfa_enabled=True)
        except Exception:
            await self.user_repo.update(user_id, mfa_secret=secret, mfa_enabled=True)
        import pyotp
        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(name=user_id, issuer_name=settings.APP_NAME)
        return {"secret": secret, "provisioning_uri": provisioning_uri}

    async def logout(self, user_id: str) -> None:
        sessions = await self.session_repo.get_active_by_employee(user_id)
        if not sessions:
            sessions = await self.session_repo.get_active_by_user(user_id)
        for s in sessions:
            await self.session_repo.deactivate(s.id)
        await self.audit_repo.log(employee_id=user_id, action="logout", module="auth")

