from datetime import date

from fastapi import HTTPException, status

from app.core.config import settings
from app.core.pagination import PaginatedResult
from app.modules.payroll.infrastructure.repositories import (
    PayrollConceptRepository,
    PayrollPeriodRepository,
    PayrollRecordRepository,
)


class PayrollEngine:
    """Colombian payroll calculation engine compliant with labor legislation."""

    @staticmethod
    def calculate_hour_value(monthly_salary: float, daily_hours: float = 8.0) -> float:
        return (monthly_salary / 30) / daily_hours

    @staticmethod
    def calculate_overtime_value(hour_value: float, hours: float, factor: float = 1.25) -> float:
        return hour_value * hours * factor

    @staticmethod
    def calculate_night_value(hour_value: float, hours: float) -> float:
        return hour_value * hours * settings.NIGHT_HOUR_FACTOR

    @staticmethod
    def calculate_sunday_holiday_value(hour_value: float, hours: float) -> float:
        return hour_value * hours * settings.SUNDAY_HOLIDAY_FACTOR

    @staticmethod
    def calculate_night_sunday_holiday(hour_value: float, hours: float) -> float:
        return hour_value * hours * settings.NIGHT_SUNDAY_HOLIDAY_FACTOR

    @staticmethod
    def calculate_health_deduction(base: float) -> float:
        return round(base * settings.HEALTH_PERCENTAGE / 100, 2)

    @staticmethod
    def calculate_pension_deduction(base: float) -> float:
        return round(base * settings.PENSION_PERCENTAGE / 100, 2)

    @staticmethod
    def calculate_solidarity_fund(base: float) -> float:
        if base > settings.MINIMUM_WAGE * 4:
            return round(base * 1.0 / 100, 2)
        return 0.0

    @staticmethod
    def calculate_health_employer(base: float) -> float:
        return round(base * settings.HEALTH_PERCENTAGE / 100, 2)

    @staticmethod
    def calculate_pension_employer(base: float) -> float:
        return round(base * settings.PENSION_PERCENTAGE / 100, 2)

    @staticmethod
    def calculate_arl_employer(base: float, risk_level: str = "1") -> float:
        rates = {"1": 0.522, "2": 1.044, "3": 2.440, "4": 4.350, "5": 5.930}
        rate = rates.get(risk_level, 0.522)
        return round(base * rate / 100, 2)

    @staticmethod
    def calculate_icbf(base: float) -> float:
        return round(base * settings.ICBF_PERCENTAGE / 100, 2)

    @staticmethod
    def calculate_sena(base: float) -> float:
        return round(base * settings.SENA_PERCENTAGE / 100, 2)

    @staticmethod
    def calculate_caja_compensacion(base: float) -> float:
        return round(base * settings.CAJA_COMPENSACION_PERCENTAGE / 100, 2)

    @staticmethod
    def calculate_service_bonus(semi_annual_salary: float, days_worked: int, total_days: int = 180) -> float:
        return round((semi_annual_salary / total_days) * days_worked, 2)

    @staticmethod
    def calculate_vacation_value(monthly_salary: float, vacation_days: float = 15) -> float:
        return round((monthly_salary / 30) * vacation_days, 2)

    @staticmethod
    def calculate_retefuente(base: float, deductions: float) -> float:
        taxable = base - deductions
        if taxable <= 0:
            return 0.0
        if taxable <= 95 * settings.MINIMUM_WAGE / 12:
            return round(taxable * 0.19, 2)
        return round(taxable * 0.28, 2)


class PayrollService:
    def __init__(
        self,
        period_repo: PayrollPeriodRepository,
        record_repo: PayrollRecordRepository,
        concept_repo: PayrollConceptRepository,
    ) -> None:
        self.period_repo = period_repo
        self.record_repo = record_repo
        self.concept_repo = concept_repo
        self.engine = PayrollEngine()

    async def create_period(self, **kwargs: dict) -> dict:
        period = await self.period_repo.create(**kwargs)
        return {"id": period.id, "name": period.name, "status": period.status}

    async def get_period(self, period_id: str) -> dict:
        period = await self.period_repo.get_by_id(period_id)
        if not period:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payroll period not found")
        return {
            "id": period.id, "name": period.name, "year": period.year,
            "month": period.month, "start_date": str(period.start_date),
            "end_date": str(period.end_date), "payment_date": str(period.payment_date),
            "status": period.status, "is_closed": period.is_closed,
        }

    async def list_periods(self, company_id: str, page: int = 1, page_size: int = 25) -> PaginatedResult:
        skip = (page - 1) * page_size
        items, total = await self.period_repo.list_by_company(company_id, skip=skip, limit=page_size)
        return PaginatedResult.create(
            items=[{"id": p.id, "name": p.name, "year": p.year, "month": p.month, "status": p.status} for p in items],
            total=total, page=page, page_size=page_size,
        )

    async def calculate_payroll(self, period_id: str, employee_id: str, contract: dict, overtime_hours: float = 0,
                                 night_hours: float = 0, sunday_holiday_hours: float = 0, bonuses: float = 0,
                                 commissions: float = 0, other_earnings: float = 0, worked_days: int = 30) -> dict:
        salary = contract["salary"]
        daily_hours = contract.get("daily_hours", 8.0)
        risk_level = contract.get("risk_level", "1")
        base_for_benefits = salary + (salary / 30) if contract.get("transportation_assistance", True) else salary

        hour_value = self.engine.calculate_hour_value(salary, daily_hours)
        overtime_value = self.engine.calculate_overtime_value(hour_value, overtime_hours)
        night_value = self.engine.calculate_night_value(hour_value, night_hours)
        sh_value = self.engine.calculate_sunday_holiday_value(hour_value, sunday_holiday_hours)

        transportation = settings.TRANSPORTATION_ASSISTANCE if salary <= settings.MINIMUM_WAGE * 2 else 0

        total_earnings = salary + transportation + overtime_value + night_value + sh_value + bonuses + commissions + other_earnings

        health_ded = self.engine.calculate_health_deduction(salary)
        pension_ded = self.engine.calculate_pension_deduction(salary)
        solidarity = self.engine.calculate_solidarity_fund(salary)

        total_deductions = health_ded + pension_ded + solidarity

        health_emp = self.engine.calculate_health_employer(base_for_benefits)
        pension_emp = self.engine.calculate_pension_employer(base_for_benefits)
        arl_emp = self.engine.calculate_arl_employer(base_for_benefits, risk_level)
        icbf = self.engine.calculate_icbf(base_for_benefits)
        sena = self.engine.calculate_sena(base_for_benefits)
        caja = self.engine.calculate_caja_compensacion(base_for_benefits)

        total_employer_cost = base_for_benefits + health_emp + pension_emp + arl_emp + icbf + sena + caja
        net_pay = total_earnings - total_deductions

        record = await self.record_repo.create(
            period_id=period_id,
            contract_id=contract["id"],
            employee_id=employee_id,
            company_id=contract["company_id"],
            base_salary=salary,
            transportation_assistance=transportation,
            overtime_hours=overtime_hours,
            overtime_value=overtime_value,
            night_hours=night_hours,
            night_value=night_value,
            sunday_holiday_hours=sunday_holiday_hours,
            sunday_holiday_value=sh_value,
            bonuses=bonuses,
            commissions=commissions,
            other_earnings=other_earnings,
            health_deduction=health_ded,
            pension_deduction=pension_ded,
            solidarity_fund=solidarity,
            health_employer=health_emp,
            pension_employer=pension_emp,
            arl_employer=arl_emp,
            icbf=icbf,
            sena=sena,
            caja_compensacion_employer=caja,
            total_earnings=total_earnings,
            total_deductions=total_deductions,
            total_employer_cost=total_employer_cost,
            net_pay=net_pay,
            worked_days=worked_days,
        )

        return {"id": record.id, "net_pay": net_pay, "total_earnings": total_earnings, "total_deductions": total_deductions}

    async def list_records_by_period(self, period_id: str) -> list[dict]:
        records = await self.record_repo.list_by_period(period_id)
        return [
            {
                "id": r.id, "employee_id": r.employee_id, "contract_id": r.contract_id,
                "base_salary": float(r.base_salary), "net_pay": float(r.net_pay),
                "total_earnings": float(r.total_earnings), "total_deductions": float(r.total_deductions),
                "status": r.status,
            }
            for r in records
        ]

    async def close_period(self, period_id: str) -> dict:
        period = await self.period_repo.get_by_id(period_id)
        if not period:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Period not found")
        await self.period_repo.update(period_id, status="closed", is_closed=True)
        return {"message": "Payroll period closed successfully"}
