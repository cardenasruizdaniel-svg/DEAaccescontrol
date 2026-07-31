from sqlalchemy import Boolean, Date, Float, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.database.models_base import BaseModel


class PayrollPeriod(BaseModel):
    __tablename__ = "payroll_periods"

    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    start_date: Mapped[str] = mapped_column(Date, nullable=False)
    end_date: Mapped[str] = mapped_column(Date, nullable=False)
    payment_date: Mapped[str] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)
    is_closed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    records: Mapped[list["PayrollRecord"]] = relationship(back_populates="period")


class PayrollRecord(BaseModel):
    __tablename__ = "payroll_records"

    period_id: Mapped[str] = mapped_column(String(36), ForeignKey("payroll_periods.id"), nullable=False, index=True)
    contract_id: Mapped[str] = mapped_column(String(36), ForeignKey("contracts.id"), nullable=False, index=True)
    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False, index=True)
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id"), nullable=False)
    base_salary: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    transportation_assistance: Mapped[float] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    overtime_hours: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    overtime_value: Mapped[float] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    night_hours: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    night_value: Mapped[float] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    sunday_holiday_hours: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    sunday_holiday_value: Mapped[float] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    bonuses: Mapped[float] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    commissions: Mapped[float] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    other_earnings: Mapped[float] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    service_bonus: Mapped[float] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    vacation_days: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    vacation_value: Mapped[float] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    health_deduction: Mapped[float] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    pension_deduction: Mapped[float] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    solidarity_fund: Mapped[float] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    retefuente: Mapped[float] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    embargo: Mapped[float] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    libranza: Mapped[float] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    other_deductions: Mapped[float] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    health_employer: Mapped[float] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    pension_employer: Mapped[float] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    arl_employer: Mapped[float] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    icbf: Mapped[float] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    sena: Mapped[float] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    caja_compensacion_employer: Mapped[float] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    total_earnings: Mapped[float] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    total_deductions: Mapped[float] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    total_employer_cost: Mapped[float] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    net_pay: Mapped[float] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    worked_days: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)
    payslip_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    period: Mapped["PayrollPeriod"] = relationship(back_populates="records")


class PayrollConcept(BaseModel):
    __tablename__ = "payroll_concepts"

    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    calculation_type: Mapped[str] = mapped_column(String(20), nullable=False)
    value: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    percentage: Mapped[float | None] = mapped_column(Float, nullable=True)
    formula: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_fixed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_taxable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    affects_cesantias: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    affects_prima: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    affects_vacaciones: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
