from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.shared.database.models_hr import Employee


class FaceRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_employee_with_face(self, employee_id: str) -> Employee | None:
        result = await self.db.execute(
            select(Employee).where(Employee.id == employee_id, Employee.is_deleted == False)
        )
        return result.scalar_one_or_none()

    async def update_face_encoding(self, employee_id: str, encoding: str) -> None:
        await self.db.execute(
            update(Employee).where(Employee.id == employee_id).values(facial_encoding=encoding)
        )
        await self.db.flush()

    async def update_photo(self, employee_id: str, photo_url: str) -> None:
        await self.db.execute(
            update(Employee).where(Employee.id == employee_id).values(photo_url=photo_url)
        )
        await self.db.flush()

    async def list_registered_employees(self, company_id: str) -> list[Employee]:
        result = await self.db.execute(
            select(Employee).where(
                Employee.company_id == company_id,
                Employee.facial_encoding.isnot(None),
                Employee.is_deleted == False,
            )
        )
        return list(result.scalars().all())
