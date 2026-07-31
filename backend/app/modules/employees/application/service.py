from fastapi import HTTPException, status

from app.core.pagination import PaginatedResult
from app.core.security import hash_password
from app.modules.employees.infrastructure.repositories import (
    EmployeeDocumentRepository,
    EmployeeRepository,
)
from app.shared.database.models_hr import Employee


class EmployeeService:
    def __init__(self, employee_repo: EmployeeRepository, document_repo: EmployeeDocumentRepository) -> None:
        self.employee_repo = employee_repo
        self.document_repo = document_repo

    async def create_employee(self, **kwargs: dict) -> dict:
        existing = await self.employee_repo.get_by_document(kwargs.get("document_number", ""))
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Employee with this document already exists")
        username = kwargs.pop("username", None)
        password = kwargs.pop("password", None)
        role_id = kwargs.pop("role_id", None)
        platform_access = kwargs.pop("platform_access", None)
        from datetime import date as _date
        for field in ("hire_date", "birth_date"):
            if field in kwargs and kwargs[field] and isinstance(kwargs[field], str):
                try:
                    kwargs[field] = _date.fromisoformat(kwargs[field])
                except (ValueError, TypeError):
                    kwargs[field] = None
        employee = await self.employee_repo.create(**kwargs)
        if username and password:
            hashed = hash_password(password)
            await self.employee_repo.update(employee.id,
                username=username, hashed_password=hashed, role_id=role_id,
                platform_access=platform_access or "both", account_status="active",
            )
        return {"id": employee.id, "code": employee.code, "full_name": f"{employee.first_name} {employee.last_name}"}

    async def get_employee(self, employee_id: str) -> Employee | None:
        employee = await self.employee_repo.get_by_id(employee_id)
        if not employee:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
        return employee

    async def update_employee(self, employee_id: str, **kwargs: dict) -> dict:
        employee = await self.employee_repo.get_by_id(employee_id)
        if not employee:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
        from datetime import date as _date
        for field in ("hire_date", "birth_date"):
            if field in kwargs and kwargs[field] and isinstance(kwargs[field], str):
                try:
                    kwargs[field] = _date.fromisoformat(kwargs[field])
                except (ValueError, TypeError):
                    kwargs[field] = None
        updated = await self.employee_repo.update(employee_id, **kwargs)
        return {"id": updated.id, "message": "Employee updated successfully"}

    async def delete_employee(self, employee_id: str) -> dict:
        employee = await self.employee_repo.get_by_id(employee_id)
        if not employee:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
        await self.employee_repo.update(employee_id, is_deleted=True, status="terminated")
        return {"message": "Employee deleted successfully"}

    async def list_employees(
        self,
        company_id: str | None = None,
        department_id: str | None = None,
        status: str | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 25,
    ) -> PaginatedResult:
        skip = (page - 1) * page_size
        items, total = await self.employee_repo.list_employees(
            company_id=company_id,
            department_id=department_id,
            status=status,
            search=search,
            skip=skip,
            limit=page_size,
        )
        return PaginatedResult.create(
            items=[
                {
                    "id": e.id,
                    "code": e.code,
                    "document_type": e.document_type,
                    "document_number": e.document_number,
                    "first_name": e.first_name,
                    "last_name": e.last_name,
                    "email": e.email,
                    "phone": e.phone,
                    "status": e.status,
                    "photo_url": e.photo_url,
                    "department_id": e.department_id,
                    "company_id": e.company_id,
                    "has_access": bool(e.username),
                    "username": e.username,
                    "platform_access": e.platform_access,
                    "account_status": e.account_status,
                }
                for e in items
            ],
            total=total,
            page=page,
            page_size=page_size,
        )

    async def get_employee_documents(self, employee_id: str) -> list[dict]:
        docs = await self.document_repo.list_by_employee(employee_id)
        return [{"id": d.id, "document_type": d.document_type, "name": d.name, "file_url": d.file_url, "expiry_date": str(d.expiry_date) if d.expiry_date else None} for d in docs]

    async def add_employee_document(self, employee_id: str, **kwargs: dict) -> dict:
        employee = await self.employee_repo.get_by_id(employee_id)
        if not employee:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
        doc = await self.document_repo.create(employee_id=employee_id, **kwargs)
        return {"id": doc.id, "name": doc.name}

    async def get_company_stats(self, company_id: str) -> dict:
        total = await self.employee_repo.count_by_company(company_id)
        active = await self.employee_repo.count_by_status(company_id, "active")
        inactive = await self.employee_repo.count_by_status(company_id, "inactive")
        terminated = await self.employee_repo.count_by_status(company_id, "terminated")
        return {"total": total, "active": active, "inactive": inactive, "terminated": terminated}

    async def create_access(self, employee_id: str, username: str, password: str,
                            role_id: str | None = None, platform_access: str = "both") -> dict:
        employee = await self.employee_repo.get_by_id(employee_id)
        if not employee:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
        if employee.username:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Employee already has system access")
        existing_username = await self.employee_repo.get_by_username(username)
        if existing_username:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")
        hashed = hash_password(password)
        await self.employee_repo.update(employee_id,
            username=username, hashed_password=hashed, role_id=role_id,
            platform_access=platform_access or "both", account_status="active",
        )
        return {"message": "Access created successfully", "username": username}

    async def update_access(self, employee_id: str, **kwargs: dict) -> dict:
        employee = await self.employee_repo.get_by_id(employee_id)
        if not employee:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
        if not employee.username:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee has no system access")
        new_username = kwargs.pop("username", None)
        if new_username and new_username != employee.username:
            existing = await self.employee_repo.get_by_username(new_username)
            if existing:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")
            kwargs["username"] = new_username
        new_password = kwargs.pop("password", None)
        if new_password:
            kwargs["hashed_password"] = hash_password(new_password)
        allowed = {"username", "hashed_password", "role_id", "platform_access", "account_status"}
        filtered = {k: v for k, v in kwargs.items() if k in allowed and v is not None}
        if filtered:
            await self.employee_repo.update(employee_id, **filtered)
        return {"message": "Access updated successfully"}

    async def reset_password(self, employee_id: str, new_password: str) -> dict:
        employee = await self.employee_repo.get_by_id(employee_id)
        if not employee:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
        if not employee.username:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee has no system access")
        hashed = hash_password(new_password)
        await self.employee_repo.update(employee_id, hashed_password=hashed)
        return {"message": "Password reset successfully"}
