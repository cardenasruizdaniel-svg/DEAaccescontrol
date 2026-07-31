from datetime import date, datetime, timedelta, timezone
import logging

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select, update as sa_update
from sqlalchemy.orm import selectinload

from app.core.deps import CurrentUser, DbSession
from app.modules.scheduling.infrastructure.repositories import ShiftRepository
from app.shared.database.models_access import AccessRecord
from app.shared.database.models_clients import Client
from app.shared.database.models_contract import Contract
from app.shared.database.models_hr import Employee
from app.shared.database.models_payroll import PayrollPeriod, PayrollRecord
from app.shared.database.models_scheduling import Shift

router = APIRouter(prefix="/mobile", tags=["Mobile"])


async def _get_employee(db: DbSession, current_user: CurrentUser) -> Employee | None:
    emp_id = getattr(current_user, "id", None)
    if emp_id:
        result = await db.execute(
            select(Employee).where(
                Employee.id == emp_id,
                Employee.company_id == current_user.company_id,
                Employee.is_deleted == False,
            )
        )
        emp = result.scalar_one_or_none()
        if emp:
            return emp
    email = getattr(current_user, "email", None)
    if email:
        result = await db.execute(
            select(Employee).where(
                Employee.company_id == current_user.company_id,
                Employee.email == email,
                Employee.is_deleted == False,
            )
        )
        emp = result.scalar_one_or_none()
        if emp:
            return emp
    return None


@router.get("/me/employee")
async def get_my_employee(current_user: CurrentUser, db: DbSession):
    emp = await _get_employee(db, current_user)
    if not emp:
        return {"error": "No employee record found"}
    return {
        "id": emp.id, "code": emp.code, "first_name": emp.first_name,
        "last_name": emp.last_name, "email": emp.email, "phone": emp.phone,
        "mobile": emp.mobile, "address": emp.address, "city": emp.city,
        "status": emp.status, "photo_url": emp.photo_url,
        "document_type": emp.document_type, "document_number": emp.document_number,
        "company_id": emp.company_id, "department_id": emp.department_id,
        "job_position_id": emp.job_position_id,
        "hire_date": str(emp.hire_date) if emp.hire_date else None,
        "eps": emp.eps, "arl": emp.arl, "afp": emp.afp,
        "can_assign_georeference": emp.can_assign_georeference,
    }


@router.get("/me/shifts")
async def get_my_shifts(
    current_user: CurrentUser, db: DbSession,
    start_date: str | None = Query(None), end_date: str | None = Query(None),
):
    emp = await _get_employee(db, current_user)
    if not emp:
        return []
    repo = ShiftRepository(db)
    return await repo.list_by_employee(emp.id, start_date=start_date, end_date=end_date)


@router.get("/me/access-history")
async def get_my_access_history(
    current_user: CurrentUser, db: DbSession,
    start_date: str | None = Query(None), end_date: str | None = Query(None),
    page: int = Query(1, ge=1), page_size: int = Query(25, ge=1, le=100),
):
    emp = await _get_employee(db, current_user)
    if not emp:
        return {"items": [], "total": 0}

    query = select(AccessRecord).where(
        AccessRecord.employee_id == emp.id, AccessRecord.is_deleted == False
    )
    if start_date:
        query = query.where(AccessRecord.timestamp >= start_date)
    if end_date:
        query = query.where(AccessRecord.timestamp <= end_date + " 23:59:59")

    count_q = select(func.count(AccessRecord.id)).where(
        AccessRecord.employee_id == emp.id, AccessRecord.is_deleted == False
    )
    total = (await db.execute(count_q)).scalar() or 0

    skip = (page - 1) * page_size
    result = await db.execute(
        query.order_by(AccessRecord.timestamp.desc()).offset(skip).limit(page_size)
    )
    items = []
    for r in result.scalars().all():
        items.append({
            "id": r.id, "record_type": r.record_type, "timestamp": r.timestamp,
            "latitude": r.latitude, "longitude": r.longitude,
            "accuracy": r.location_accuracy,
            "inside_geofence": r.inside_geofence, "face_verified": r.face_verified,
            "worked_hours": r.worked_hours, "overtime_hours": r.overtime_hours,
            "auto_closed": r.auto_closed, "is_late_arrival": r.is_late_arrival,
            "is_early_departure": r.is_early_departure, "warnings": [],
        })
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/me/payroll-summary")
async def get_my_payroll_summary(current_user: CurrentUser, db: DbSession):
    emp = await _get_employee(db, current_user)
    if not emp:
        return {"periods": [], "latest_record": None}

    periods_q = (
        select(PayrollPeriod)
        .where(PayrollPeriod.company_id == current_user.company_id, PayrollPeriod.is_deleted == False)
        .order_by(PayrollPeriod.created_at.desc())
        .limit(12)
    )
    periods = list((await db.execute(periods_q)).scalars().all())

    latest_record = None
    for p in periods:
        rec_q = select(PayrollRecord).where(
            PayrollRecord.period_id == p.id,
            PayrollRecord.employee_id == emp.id,
            PayrollRecord.is_deleted == False,
        )
        rec = (await db.execute(rec_q)).scalar_one_or_none()
        if rec:
            latest_record = {
                "id": rec.id, "period_id": rec.period_id,
                "base_salary": float(rec.base_salary or 0),
                "transportation_assistance": float(rec.transportation_assistance or 0),
                "overtime_hours": float(rec.overtime_hours or 0),
                "overtime_value": float(rec.overtime_value or 0),
                "night_hours": float(rec.night_hours or 0),
                "night_value": float(rec.night_value or 0),
                "bonuses": float(rec.bonuses or 0),
                "commissions": float(rec.commissions or 0),
                "health_deduction": float(rec.health_deduction or 0),
                "pension_deduction": float(rec.pension_deduction or 0),
                "retefuente": float(rec.retefuente or 0),
                "total_earnings": float(rec.total_earnings or 0),
                "total_deductions": float(rec.total_deductions or 0),
                "net_pay": float(rec.net_pay or 0),
                "total_employer_cost": float(rec.total_employer_cost or 0),
                "worked_days": rec.worked_days or 0,
                "status": rec.status,
            }
            break

    return {
        "periods": [
            {
                "id": p.id, "name": p.name,
                "start_date": str(p.start_date), "end_date": str(p.end_date),
                "payment_date": str(p.payment_date),
                "status": p.status, "is_closed": p.is_closed,
            }
            for p in periods
        ],
        "latest_record": latest_record,
    }


@router.get("/me/dashboard")
async def get_my_dashboard(current_user: CurrentUser, db: DbSession):
    emp = await _get_employee(db, current_user)
    if not emp:
        return {"error": "No employee record found"}

    today = date.today()
    today_str = today.isoformat()
    week_start = (today - timedelta(days=today.weekday())).isoformat()
    week_end = (today + timedelta(days=6 - today.weekday())).isoformat()

    shift_repo = ShiftRepository(db)
    today_shifts = await shift_repo.list_by_employee(emp.id, start_date=today_str, end_date=today_str)
    week_shifts = await shift_repo.list_by_employee(emp.id, start_date=week_start, end_date=week_end)

    access_q = select(AccessRecord).where(
        AccessRecord.employee_id == emp.id,
        AccessRecord.is_deleted == False,
        AccessRecord.timestamp >= today_str,
    )
    today_records = list((await db.execute(access_q)).scalars().all())

    return {
        "employee_name": f"{emp.first_name} {emp.last_name}",
        "employee_id": emp.id,
        "today_shifts_count": len(today_shifts),
        "today_shifts": [
            {
                "id": s.id, "name": s.name,
                "start_time": s.start_time, "end_time": s.end_time,
                "status": s.status, "color": s.color,
                "client_name": s.client_rel.name if s.client_rel else None,
                "client_id": s.client_id,
                "observations": s.observations,
                "shift_date": str(s.shift_date),
            }
            for s in today_shifts
        ],
        "week_completed": sum(1 for s in week_shifts if s.status == "completed"),
        "week_pending": sum(1 for s in week_shifts if s.status == "scheduled"),
        "today_entries": len([r for r in today_records if r.record_type == "entry"]),
        "today_exits": len([r for r in today_records if r.record_type == "exit"]),
        "today_auto_closures": len([r for r in today_records if getattr(r, "auto_closed", False)]),
    }


# ── Shift Session Endpoints ──────────────────────────────────────────────────

@router.get("/me/active-session")
async def get_active_session(current_user: CurrentUser, db: DbSession):
    emp = await _get_employee(db, current_user)
    if not emp:
        return {"active": False, "shift": None, "session": None}

    today = date.today().isoformat()
    shift_repo = ShiftRepository(db)
    today_shifts = await shift_repo.list_by_employee(emp.id, start_date=today, end_date=today)

    in_progress_shift = next((s for s in today_shifts if s.status == "in_progress"), None)
    if not in_progress_shift:
        next_shift = None
        for s in today_shifts:
            if s.status == "scheduled":
                next_shift = s
                break
        if not next_shift:
            upcoming = await shift_repo.list_by_employee(emp.id, start_date=today, end_date=None)
            for s in upcoming:
                if s.shift_date.isoformat() > today and s.status == "scheduled":
                    next_shift = s
                    break
        return {
            "active": False,
            "shift": None,
            "next_shift": {
                "id": next_shift.id, "name": next_shift.name,
                "start_time": next_shift.start_time, "end_time": next_shift.end_time,
                "client_name": next_shift.client_rel.name if next_shift.client_rel else None,
                "client_id": next_shift.client_id,
                "shift_date": str(next_shift.shift_date),
                "color": next_shift.color,
            } if next_shift else None,
            "today_shifts": [
                {
                    "id": s.id, "name": s.name,
                    "start_time": s.start_time, "end_time": s.end_time,
                    "status": s.status, "color": s.color,
                    "client_name": s.client_rel.name if s.client_rel else None,
                    "client_id": s.client_id,
                    "shift_date": str(s.shift_date),
                }
                for s in today_shifts
            ],
        }

    entry_q = select(AccessRecord).where(
        AccessRecord.shift_id == in_progress_shift.id,
        AccessRecord.record_type == "entry",
        AccessRecord.is_deleted == False,
    ).order_by(AccessRecord.created_at.desc()).limit(1)
    entry_record = (await db.execute(entry_q)).scalar_one_or_none()

    return {
        "active": True,
        "shift": {
            "id": in_progress_shift.id, "name": in_progress_shift.name,
            "start_time": in_progress_shift.start_time, "end_time": in_progress_shift.end_time,
            "client_name": in_progress_shift.client_rel.name if in_progress_shift.client_rel else None,
            "client_id": in_progress_shift.client_id,
            "shift_date": str(in_progress_shift.shift_date),
            "color": in_progress_shift.color,
            "observations": in_progress_shift.observations,
        },
        "session": {
            "entry_time": entry_record.timestamp if entry_record else None,
            "inside_geofence": entry_record.inside_geofence if entry_record else None,
            "face_verified": entry_record.face_verified if entry_record else None,
            "entry_record_id": entry_record.id if entry_record else None,
        } if entry_record else None,
    }


class CheckGeofenceRequest(BaseModel):
    latitude: float
    longitude: float
    client_id: str


@router.post("/me/check-geofence")
async def check_geofence(body: CheckGeofenceRequest, current_user: CurrentUser, db: DbSession):
    result = await db.execute(
        select(Client).where(Client.id == body.client_id, Client.is_deleted == False)
    )
    client = result.scalar_one_or_none()
    if not client or client.latitude is None or client.longitude is None:
        return {"inside": True, "distance": 0.0, "has_geofence": False}

    from app.modules.geolocation.application.service import GeolocationService
    from app.modules.geolocation.infrastructure.repositories import GeofenceRepository, LocationHistoryRepository, RouteHistoryRepository

    geo_service = GeolocationService(
        geofence_repo=GeofenceRepository(db),
        location_repo=LocationHistoryRepository(db),
        route_repo=RouteHistoryRepository(db),
    )
    geo_result = geo_service.check_geofence(
        body.latitude, body.longitude,
        client.latitude, client.longitude, client.geofence_radius,
    )
    return {
        "inside": geo_result["inside"],
        "distance": geo_result["distance"],
        "has_geofence": True,
        "geofence_radius": client.geofence_radius,
    }


class StartVisitRequest(BaseModel):
    shift_id: str
    latitude: float
    longitude: float
    photo_base64: str | None = None
    device_id: str | None = None
    device_model: str | None = None
    device_os: str | None = None
    battery_level: int | None = None
    connection_type: str | None = None
    is_mock_location: bool = False
    offline_timestamp: str | None = None


@router.post("/me/start-visit")
async def start_visit(body: StartVisitRequest, current_user: CurrentUser, db: DbSession):
    emp = await _get_employee(db, current_user)
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    shift_q = select(Shift).options(
        selectinload(Shift.client_rel)
    ).where(Shift.id == body.shift_id, Shift.is_deleted == False)
    shift = (await db.execute(shift_q)).scalar_one_or_none()
    if not shift:
        raise HTTPException(status_code=404, detail="Turno no encontrado")
    if shift.employee_id != emp.id:
        raise HTTPException(status_code=403, detail="Este turno no le pertenece")
    if shift.status not in ("scheduled",):
        raise HTTPException(status_code=400, detail=f"El turno ya está en estado '{shift.status}'")

    geofence_lat = None
    geofence_lon = None
    geofence_radius = None
    client_id = shift.client_id
    if shift.client_rel and shift.client_rel.latitude is not None:
        geofence_lat = shift.client_rel.latitude
        geofence_lon = shift.client_rel.longitude
        geofence_radius = shift.client_rel.geofence_radius

    now = datetime.now(timezone.utc)
    is_late = False
    try:
        start_h, start_m = map(int, shift.start_time.split(":"))
        scheduled_start = datetime.combine(
            shift.shift_date,
            datetime.min.time().replace(hour=start_h, minute=start_m),
            tzinfo=timezone.utc,
        )
        if now > scheduled_start + timedelta(minutes=5):
            is_late = True
    except Exception as e:
        logging.getLogger(__name__).warning("Late arrival check failed for shift %s: %s", shift_id, e)

    from app.modules.access_control.application.service import AccessControlService
    from app.modules.access_control.infrastructure.repositories import AccessRecordRepository

    svc = AccessControlService(record_repo=AccessRecordRepository(db), db=db)
    result = await svc.register_entry(
        employee_id=emp.id,
        latitude=body.latitude,
        longitude=body.longitude,
        photo_base64=body.photo_base64,
        device_id=body.device_id,
        device_model=body.device_model,
        device_os=body.device_os,
        battery_level=body.battery_level,
        connection_type=body.connection_type,
        is_mock_location=body.is_mock_location,
        shift_id=body.shift_id,
        client_id=client_id,
        geofence_lat=geofence_lat,
        geofence_lon=geofence_lon,
        geofence_radius=geofence_radius,
        offline_timestamp=body.offline_timestamp,
    )

    if is_late:
        record_q = select(AccessRecord).where(
            AccessRecord.id == result["id"]
        )
        rec = (await db.execute(record_q)).scalar_one_or_none()
        if rec:
            rec.is_late_arrival = True
            await db.flush()

    return {**result, "is_late_arrival": is_late}


class EndVisitRequest(BaseModel):
    shift_id: str
    latitude: float
    longitude: float
    photo_base64: str | None = None
    observations: str | None = None
    device_id: str | None = None
    connection_type: str | None = None
    offline_timestamp: str | None = None


@router.post("/me/end-visit")
async def end_visit(body: EndVisitRequest, current_user: CurrentUser, db: DbSession):
    emp = await _get_employee(db, current_user)
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    shift_q = select(Shift).where(Shift.id == body.shift_id, Shift.is_deleted == False)
    shift = (await db.execute(shift_q)).scalar_one_or_none()
    if not shift:
        raise HTTPException(status_code=404, detail="Turno no encontrado")
    if shift.employee_id != emp.id:
        raise HTTPException(status_code=403, detail="Este turno no le pertenece")
    if shift.status != "in_progress":
        raise HTTPException(status_code=400, detail=f"El turno no está en progreso (estado: '{shift.status}')")

    now = datetime.now(timezone.utc)
    is_early = False
    try:
        end_h, end_m = map(int, shift.end_time.split(":"))
        scheduled_end = datetime.combine(
            shift.shift_date,
            datetime.min.time().replace(hour=end_h, minute=end_m),
            tzinfo=timezone.utc,
        )
        if now < scheduled_end - timedelta(minutes=5):
            is_early = True
    except Exception as e:
        logging.getLogger(__name__).warning("Early departure check failed for shift %s: %s", shift_id, e)

    from app.modules.access_control.application.service import AccessControlService
    from app.modules.access_control.infrastructure.repositories import AccessRecordRepository

    svc = AccessControlService(record_repo=AccessRecordRepository(db), db=db)
    result = await svc.register_exit(
        employee_id=emp.id,
        latitude=body.latitude,
        longitude=body.longitude,
        photo_base64=body.photo_base64,
        observations=body.observations,
        device_id=body.device_id,
        connection_type=body.connection_type,
        offline_timestamp=body.offline_timestamp,
        shift_id=body.shift_id,
        client_id=shift.client_id,
    )

    if is_early:
        record_q = select(AccessRecord).where(
            AccessRecord.id == result["id"]
        )
        rec = (await db.execute(record_q)).scalar_one_or_none()
        if rec:
            rec.is_early_departure = True
            await db.flush()

    return {**result, "is_early_departure": is_early}


# ── Auto-close ───────────────────────────────────────────────────────────────

async def auto_close_shifts(db):
    now = datetime.now(timezone.utc)
    today = now.date()

    active_shifts_q = select(Shift).options(
        selectinload(Shift.client_rel)
    ).where(
        Shift.status == "in_progress",
        Shift.shift_date <= today,
        Shift.is_deleted == False,
    )
    active_shifts = list((await db.execute(active_shifts_q)).scalars().unique().all())

    closed_count = 0
    for shift in active_shifts:
        entry_q = select(AccessRecord).where(
            AccessRecord.shift_id == shift.id,
            AccessRecord.record_type == "entry",
            AccessRecord.is_deleted == False,
        ).order_by(AccessRecord.created_at.desc()).limit(1)
        entry = (await db.execute(entry_q)).scalar_one_or_none()
        if not entry:
            continue

        if shift.client_rel and shift.client_rel.latitude is not None:
            from app.modules.geolocation.application.service import GeolocationService
            from app.modules.geolocation.infrastructure.repositories import GeofenceRepository, LocationHistoryRepository, RouteHistoryRepository

            geo_svc = GeolocationService(
                geofence_repo=GeofenceRepository(db),
                location_repo=LocationHistoryRepository(db),
                route_repo=RouteHistoryRepository(db),
            )
            geo_result = geo_svc.check_geofence(
                entry.latitude, entry.longitude,
                shift.client_rel.latitude, shift.client_rel.longitude,
                shift.client_rel.geofence_radius,
            )
            if not geo_result["inside"]:
                try:
                    exit_h, exit_m = map(int, shift.end_time.split(":"))
                    scheduled_end = datetime.combine(
                        shift.shift_date,
                        datetime.min.time().replace(hour=exit_h, minute=exit_m),
                        tzinfo=timezone.utc,
                    )
                    is_early = now < scheduled_end - timedelta(minutes=5)
                except Exception:
                    is_early = False

                exit_record = AccessRecord(
                    employee_id=shift.employee_id,
                    record_type="exit",
                    timestamp=now.isoformat(),
                    latitude=entry.latitude,
                    longitude=entry.longitude,
                    shift_id=shift.id,
                    client_id=shift.client_id,
                    auto_closed=True,
                    is_early_departure=is_early,
                    inside_geofence=False,
                    face_verified=False,
                    is_synced=True,
                )
                db.add(exit_record)
                await db.flush()

                try:
                    entry_time = datetime.fromisoformat(entry.timestamp.replace("Z", "+00:00"))
                    diff = (now - entry_time).total_seconds() / 3600
                    break_min = shift.break_minutes or 0
                    worked_hours = round(max(diff - (break_min / 60), 0), 2)
                    exit_record.worked_hours = worked_hours
                    if worked_hours > 8:
                        exit_record.overtime_hours = round(worked_hours - 8, 2)
                    from app.modules.access_control.application.service import AccessControlService
                    exit_record.night_hours = AccessControlService._compute_night_hours(entry_time, now)
                    await db.flush()
                except Exception:
                    pass

                await db.execute(
                    sa_update(Shift).where(Shift.id == shift.id).values(status="completed")
                )
                await db.flush()
                closed_count += 1
        else:
            try:
                end_h, end_m = map(int, shift.end_time.split(":"))
                scheduled_end = datetime.combine(
                    shift.shift_date,
                    datetime.min.time().replace(hour=end_h, minute=end_m),
                    tzinfo=timezone.utc,
                )
                if now > scheduled_end + timedelta(minutes=30):
                    exit_record = AccessRecord(
                        employee_id=shift.employee_id,
                        record_type="exit",
                        timestamp=now.isoformat(),
                        latitude=entry.latitude,
                        longitude=entry.longitude,
                        shift_id=shift.id,
                        client_id=shift.client_id,
                        auto_closed=True,
                        is_early_departure=False,
                        inside_geofence=True,
                        face_verified=False,
                        is_synced=True,
                    )
                    db.add(exit_record)
                    await db.flush()

                    entry_time = datetime.fromisoformat(entry.timestamp.replace("Z", "+00:00"))
                    diff = (now - entry_time).total_seconds() / 3600
                    break_min = shift.break_minutes or 0
                    exit_record.worked_hours = round(max(diff - (break_min / 60), 0), 2)
                    if exit_record.worked_hours > 8:
                        exit_record.overtime_hours = round(exit_record.worked_hours - 8, 2)
                    from app.modules.access_control.application.service import AccessControlService
                    exit_record.night_hours = AccessControlService._compute_night_hours(entry_time, now)
                    await db.flush()

                    await db.execute(
                        sa_update(Shift).where(Shift.id == shift.id).values(status="completed")
                    )
                    await db.flush()
                    closed_count += 1
            except Exception as e:
                logging.getLogger(__name__).warning("Auto-close failed for shift %s: %s", shift.id, e)

    return closed_count


# ── Employees contract summary ───────────────────────────────────────────────

@router.get("/employees-contract-summary")
async def employees_contract_summary(current_user: CurrentUser, db: DbSession):
    company_id = current_user.company_id

    emp_q = select(Employee).where(
        Employee.company_id == company_id, Employee.is_deleted == False
    )
    employees = list((await db.execute(emp_q)).scalars().all())

    emp_ids = [e.id for e in employees]
    if not emp_ids:
        return {"total": 0, "by_type": {}, "without_contract": [], "terminated_count": 0}

    from app.shared.database.models_contract import ContractType

    all_contracts_q = (
        select(Contract, ContractType.labor_law_type, ContractType.name.label("type_name"))
        .join(ContractType, Contract.contract_type_id == ContractType.id)
        .where(Contract.company_id == company_id, Contract.is_deleted == False)
    )
    all_contracts = (await db.execute(all_contracts_q)).all()

    active_by_type: dict[str, list] = {}
    terminated_count = 0
    contracted_emp_ids: set[str] = set()

    for contract, law_type, type_name in all_contracts:
        if contract.status == "active":
            contracted_emp_ids.add(contract.employee_id)
            bucket = active_by_type.setdefault(law_type, {"label": type_name, "employees": [], "count": 0})
            bucket["count"] += 1
            emp = next((e for e in employees if e.id == contract.employee_id), None)
            if emp:
                bucket["employees"].append({
                    "id": emp.id, "code": emp.code,
                    "full_name": f"{emp.first_name} {emp.last_name}",
                })
        elif contract.status == "terminated":
            terminated_count += 1

    without_contract = []
    for e in employees:
        if e.id not in contracted_emp_ids:
            without_contract.append({
                "id": e.id, "code": e.code,
                "full_name": f"{e.first_name} {e.last_name}",
                "email": e.email, "phone": e.phone,
                "status": e.status, "photo_url": e.photo_url,
            })

    type_labels = {
        "fixed_term": "Fijo / Termino Fijo",
        "indefinite": "Indefinido",
        "specific_work": "Obra / Labor",
        "services": "Prestacion de Servicios",
        "apprenticeship": "Aprendizaje SENA",
    }

    by_type = {}
    for law_type, data in active_by_type.items():
        by_type[law_type] = {
            "label": type_labels.get(law_type, data["label"]),
            "count": data["count"],
            "employees": data["employees"],
        }

    return {
        "total": len(employees),
        "by_type": by_type,
        "total_active_contracts": len(contracted_emp_ids),
        "terminated_count": terminated_count,
        "without_contract": without_contract,
        "uncontracted_count": len(without_contract),
    }


# ── Georeference ─────────────────────────────────────────────────────────────

class AssignGeoreferenceRequest(BaseModel):
    latitude: float
    longitude: float
    geofence_radius: float = 100.0


@router.post("/clients/{client_id}/assign-georeference")
async def assign_client_georeference(
    client_id: str,
    body: AssignGeoreferenceRequest,
    current_user: CurrentUser,
    db: DbSession,
):
    emp = await _get_employee(db, current_user)
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    if not emp.can_assign_georeference:
        raise HTTPException(status_code=403, detail="No tiene autorizacion para asignar georreferencia")

    result = await db.execute(
        select(Client).where(
            Client.id == client_id,
            Client.company_id == current_user.company_id,
            Client.is_deleted == False,
        )
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    if client.latitude is not None and client.longitude is not None:
        raise HTTPException(status_code=400, detail="El cliente ya tiene georreferencia asignada")

    client.latitude = body.latitude
    client.longitude = body.longitude
    client.geofence_radius = body.geofence_radius
    await db.flush()

    return {
        "message": "Georreferencia asignada exitosamente",
        "client_id": client_id,
        "latitude": body.latitude,
        "longitude": body.longitude,
        "geofence_radius": body.geofence_radius,
    }


@router.get("/clients/{client_id}")
async def get_client_info(client_id: str, current_user: CurrentUser, db: DbSession):
    result = await db.execute(
        select(Client).where(
            Client.id == client_id,
            Client.company_id == current_user.company_id,
            Client.is_deleted == False,
        )
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return {
        "id": client.id, "name": client.name,
        "latitude": client.latitude, "longitude": client.longitude,
        "geofence_radius": client.geofence_radius,
        "address": client.address, "city": client.city,
    }
