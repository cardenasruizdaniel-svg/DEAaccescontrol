"""Seed datos de prueba realistas para pruebas funcionales.

Población (idempotente):
- Estructura organizacional: sedes, departamentos, cargos, centros de costo, equipos
- Empleados funcionales (con login) + contratos
- Series de turnos y turnos (2 semanas: pasada + futura)
- Registros de acceso (entrada/salida) en la semana
- Periodo de nómina AGOSTO 2026 + registros preliminares
- Notificaciones de prueba
"""
import asyncio
import uuid
from datetime import datetime, date, timezone, timedelta

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.core.config import settings
from app.core.security import hash_password

COMPANY_ID = "6bba0cbb-3349-43fb-9686-ed0197b5164f"
TEST_PASSWORD = "Prueba2026!"

ROLE_IDS = {
    "Cuidador": "ef842ed6-e6b4-45a5-b3d2-d87a24146a50",
    "Enfermero": "c26643a3-bfa9-4f4d-92b5-631d4d943949",
    "Medico": "0bc2219b-63c7-48a3-8a15-dedc313b0c38",
    "Administrativo": "f3bb0c54-836b-4230-ae43-a74f38175305",
    "Supervisor": "d96c85c1-7039-40ac-ab08-528219fd056e",
    "Auditor": "46dfbb47-0774-451c-8599-bc553f828ebc",
    "Administracion": "1f049a12-de31-4123-a98a-9e556bac5177",
    "Gerencia": "da513c9f-f73f-4662-a6a8-b0bced988a90",
    "Super Admin": "bf4d9652-82d8-477e-a3c9-01b1d53ea620",
}

CONTRACT_TYPE_IDS = {
    "fijo": "0ac05da0-9363-4d37-bf91-fbc4eb09bb61",
    "indefinido": "940c544f-81c5-466c-8c96-b533cca56dca",
    "obra": "1d21052d-d978-49fb-9a35-e5ed875ed47b",
    "servicios": "6d0b9344-bd2a-4b51-b38e-0a3cfb8e19cb",
    "aprendizaje": "95ba6040-420b-449e-ad26-dddbabf9db6e",
}

CLIENT_HOSPITAL = "6af9b6b8-e5f4-4ee8-bb4e-bd25bfca757d"
CLIENT_RESIDENCIA = "91d5ea76-2a61-4900-a83c-20f7d2b8f9ed"

TEMPLATE_MANANA = "8a6f9db8-1176-4fc6-9c00-9280da1f7557"     # 07:00-15:00
TEMPLATE_TARDE = "55e10841-3b00-40cd-8ab7-c049e06e3097"     # 14:00-22:00
TEMPLATE_DIURNO = "c9dd898c-83e3-45dd-91e7-1672655d5b3c"     # 08:00-17:00

# ---------------------------------------------------------------------------
# ESTRUCTURA ORGANIZACIONAL
# ---------------------------------------------------------------------------
BRANCHES = [
    ("SEDE-MED", "Sede Medellín", "Cra 43A # 11A-52, El Poblado", "Medellín", "Antioquia", 6.2442, -75.5812, 200.0, True),
    ("SEDE-BOG", "Sede Bogotá", "Cra 7 # 40-62", "Bogotá", "Cundinamarca", 4.6583, -74.0937, 200.0, False),
]

DEPARTMENTS = [
    ("DEP-ADM", "Administración", "Gestión administrativa y financiera"),
    ("DEP-OPS", "Operaciones", "Coordinación de turnos y cuidadores"),
    ("DEP-ENF", "Enfermería", "Personal de cuidado y enfermería"),
    ("DEP-RH", "Recursos Humanos", "Gestión de talento humano"),
]

JOB_POSITIONS = [
    ("POS-ADM", "Auxiliar Administrativo", 1400000, 2200000),
    ("POS-COORD", "Coordinador Operativo", 2500000, 3800000),
    ("POS-ENF", "Auxiliar de Enfermería", 1600000, 2400000),
    ("POS-CUID", "Cuidador", 1300000, 1900000),
    ("POS-SUP", "Supervisor de Turnos", 2000000, 3200000),
]

COST_CENTERS = [
    ("CC-ADM", "Centro de Costo Administrativo", "Gastos administrativos"),
    ("CC-OPS", "Centro de Costo Operativo", "Costos de operación y cuidado"),
]

WORK_TEAMS = [
    ("Turno A", "Equipo de turno mañana"),
    ("Turno B", "Equipo de turno tarde/noche"),
]

# ---------------------------------------------------------------------------
# EMPLEADOS FUNCIONALES
# (code, documento, nombre, apellido, email, username, role, plataforma,
#  sede, depto, cargo, centro, equipo, salario, transporte)
# ---------------------------------------------------------------------------
EMPLOYEES = [
    ("ADM-001", "CC", "1036642201", "Paula", "Ramírez", "paula.ramirez@dlaredes.com.co",
     "paula.ramirez", "Administrativo", "web", "SEDE-MED", "DEP-ADM", "POS-ADM", "CC-ADM", "Turno A", 1800000, True),
    ("SUP-001", "CC", "1017123456", "Carolina", "Ospina", "carolina.ospina@dlaredes.com.co",
     "carolina.ospina", "Supervisor", "both", "SEDE-MED", "DEP-OPS", "POS-SUP", "CC-OPS", "Turno A", 2800000, False),
    ("ENF-001", "CC", "1020456789", "Andrea", "Morales", "andrea.morales@dlaredes.com.co",
     "andrea.morales", "Enfermero", "mobile", "SEDE-BOG", "DEP-ENF", "POS-ENF", "CC-OPS", "Turno B", 2200000, True),
    ("CUI-001", "CC", "79854231", "Roberto", "Pérez", "roberto.perez@dlaredes.com.co",
     "roberto.perez", "Cuidador", "mobile", "SEDE-MED", "DEP-ENF", "POS-CUID", "CC-OPS", "Turno A", 1650000, True),
    ("GER-001", "CC", "79854232", "Jorge", "Estrada", "jorge.estrada@dlaredes.com.co",
     "jorge.estrada", "Gerencia", "web", "SEDE-MED", "DEP-ADM", "POS-COORD", "CC-ADM", "Turno A", 5500000, False),
]

# (code_emp, type_id, start, end, salary, transporte, status)
CONTRACTS = [
    ("ADM-001", "indefinido", date(2025, 3, 1), None, 1800000, True, "active"),
    ("SUP-001", "indefinido", date(2024, 9, 15), None, 2800000, False, "active"),
    ("ENF-001", "fijo", date(2026, 1, 20), date(2027, 1, 19), 2200000, True, "active"),
    ("CUI-001", "fijo", date(2025, 6, 1), date(2026, 5, 31), 1650000, True, "active"),
    ("GER-001", "indefinido", date(2023, 1, 10), None, 5500000, False, "active"),
]

# ---------------------------------------------------------------------------
# TURNOS (series + shifts), 2 semanas: desde 2026-07-27 hasta 2026-08-09
# ---------------------------------------------------------------------------
SERIES = [
    # (nombre, empleado, cliente, template, dias_semana, hora_ini, hora_fin, desc)
    ("Turno Diurno Enfermería", "ENF-001", CLIENT_HOSPITAL, TEMPLATE_MANANA, [0, 1, 2, 3, 4], "07:00", "15:00", "Cuidado de pacientes hospitalizados"),
    ("Turno Tarde Cuidados", "CUI-001", CLIENT_RESIDENCIA, TEMPLATE_TARDE, [0, 1, 2, 3, 4, 5], "14:00", "22:00", "Acompañamiento y cuidado en residencia"),
    ("Turno Administrativo", "ADM-001", None, TEMPLATE_DIURNO, [0, 1, 2, 3, 4], "08:00", "17:00", "Gestión administrativa sede central"),
    ("Turno Supervisión", "SUP-001", CLIENT_HOSPITAL, TEMPLATE_DIURNO, [0, 2, 4], "08:00", "17:00", "Supervisión de turnos en campo"),
]

SERIES_START = date(2026, 7, 27)
SERIES_END = date(2026, 8, 9)

# ---------------------------------------------------------------------------
# REGISTROS DE ACCESO (semana 2026-07-27 al 2026-07-31)
# ---------------------------------------------------------------------------
ACCESS_RECORDS = [
    # (empleado, cliente, tipo, dia, hora_iso, lat, lon, accuracy, address,
    #  dentro_geofence, distancia, geo_nombre, face, liveness, worked_hours, overtime, night, late, early)
    ("ENF-001", CLIENT_HOSPITAL, "entry", "2026-07-27", "06:58:00-05:00", 4.7110, -74.0721, 8.5, "Av. El Dorado # 90-10, Bogotá", True, 3.2, "Hospital Universitario San Juan", True, True, None, None, None, False, False),
    ("ENF-001", CLIENT_HOSPITAL, "exit", "2026-07-27", "15:06:00-05:00", 4.7108, -74.0723, 7.9, "Av. El Dorado # 90-10, Bogotá", True, 4.1, "Hospital Universitario San Juan", True, True, 8.13, 0.0, 0.0, False, False),
    ("CUI-001", CLIENT_RESIDENCIA, "entry", "2026-07-27", "13:57:00-05:00", 4.5494, -75.6582, 6.2, "Cra 5 # 12-34, Armenia", True, 2.8, "Residencia María Elena", True, True, None, None, None, False, False),
    ("CUI-001", CLIENT_RESIDENCIA, "exit", "2026-07-27", "22:03:00-05:00", 4.5493, -75.6581, 6.8, "Cra 5 # 12-34, Armenia", True, 3.5, "Residencia María Elena", True, True, 8.1, 0.0, 0.0, False, False),
    ("ENF-001", CLIENT_HOSPITAL, "entry", "2026-07-28", "06:55:00-05:00", 4.7111, -74.0720, 9.0, "Av. El Dorado # 90-10, Bogotá", True, 3.0, "Hospital Universitario San Juan", True, True, None, None, None, False, False),
    ("ENF-001", CLIENT_HOSPITAL, "exit", "2026-07-28", "15:10:00-05:00", 4.7109, -74.0722, 8.1, "Av. El Dorado # 90-10, Bogotá", True, 3.8, "Hospital Universitario San Juan", True, True, 8.25, 0.0, 0.0, False, False),
    ("CUI-001", CLIENT_RESIDENCIA, "entry", "2026-07-28", "14:01:00-05:00", 4.5495, -75.6580, 5.9, "Cra 5 # 12-34, Armenia", True, 2.5, "Residencia María Elena", True, True, None, None, None, False, False),
    ("CUI-001", CLIENT_RESIDENCIA, "exit", "2026-07-28", "22:00:00-05:00", 4.5493, -75.6583, 7.0, "Cra 5 # 12-34, Armenia", True, 3.1, "Residencia María Elena", True, True, 7.98, 0.0, 0.0, False, False),
    ("ENF-001", CLIENT_HOSPITAL, "entry", "2026-07-29", "07:02:00-05:00", 4.7112, -74.0721, 8.7, "Av. El Dorado # 90-10, Bogotá", True, 3.4, "Hospital Universitario San Juan", True, True, None, None, None, True, False),
    ("ENF-001", CLIENT_HOSPITAL, "exit", "2026-07-29", "15:08:00-05:00", 4.7108, -74.0720, 8.0, "Av. El Dorado # 90-10, Bogotá", True, 4.2, "Hospital Universitario San Juan", True, True, 8.1, 0.0, 0.0, False, False),
    ("CUI-001", CLIENT_RESIDENCIA, "entry", "2026-07-29", "13:55:00-05:00", 4.5494, -75.6581, 6.0, "Cra 5 # 12-34, Armenia", True, 2.9, "Residencia María Elena", True, True, None, None, None, False, False),
    ("CUI-001", CLIENT_RESIDENCIA, "exit", "2026-07-29", "22:05:00-05:00", 4.5492, -75.6580, 6.5, "Cra 5 # 12-34, Armenia", True, 3.3, "Residencia María Elena", True, True, 8.17, 0.0, 0.0, False, False),
    ("ENF-001", CLIENT_HOSPITAL, "entry", "2026-07-30", "06:59:00-05:00", 4.7110, -74.0722, 8.3, "Av. El Dorado # 90-10, Bogotá", True, 3.6, "Hospital Universitario San Juan", True, True, None, None, None, False, False),
    ("ENF-001", CLIENT_HOSPITAL, "exit", "2026-07-30", "15:04:00-05:00", 4.7109, -74.0721, 7.8, "Av. El Dorado # 90-10, Bogotá", True, 4.0, "Hospital Universitario San Juan", True, True, 8.08, 0.0, 0.0, False, False),
    ("CUI-001", CLIENT_RESIDENCIA, "entry", "2026-07-30", "14:03:00-05:00", 4.5493, -75.6582, 6.4, "Cra 5 # 12-34, Armenia", True, 2.7, "Residencia María Elena", True, True, None, None, None, False, False),
    ("CUI-001", CLIENT_RESIDENCIA, "exit", "2026-07-30", "21:58:00-05:00", 4.5495, -75.6581, 6.1, "Cra 5 # 12-34, Armenia", True, 3.0, "Residencia María Elena", True, True, 7.92, 0.0, 0.0, False, True),
    ("ENF-001", CLIENT_HOSPITAL, "entry", "2026-07-31", "06:57:00-05:00", 4.7111, -74.0720, 8.6, "Av. El Dorado # 90-10, Bogotá", True, 3.3, "Hospital Universitario San Juan", True, True, None, None, None, False, False),
    ("ENF-001", CLIENT_HOSPITAL, "exit", "2026-07-31", "15:05:00-05:00", 4.7109, -74.0722, 8.2, "Av. El Dorado # 90-10, Bogotá", True, 3.9, "Hospital Universitario San Juan", True, True, 8.13, 0.0, 0.0, False, False),
    ("CUI-001", CLIENT_RESIDENCIA, "entry", "2026-07-31", "13:58:00-05:00", 4.5494, -75.6580, 6.3, "Cra 5 # 12-34, Armenia", True, 2.6, "Residencia María Elena", True, True, None, None, None, False, False),
    ("CUI-001", CLIENT_RESIDENCIA, "exit", "2026-07-31", "22:01:00-05:00", 4.5493, -75.6583, 6.9, "Cra 5 # 12-34, Armenia", True, 3.4, "Residencia María Elena", True, True, 8.05, 0.0, 0.0, False, False),
]

# ---------------------------------------------------------------------------
# NOTIFICACIONES
# ---------------------------------------------------------------------------
NOTIFICATIONS = [
    ("ENF-001", "Turno asignado", "Tienes un turno asignado hoy: Turno Diurno Enfermería 07:00 - 15:00 en Hospital Universitario San Juan", "shift"),
    ("CUI-001", "Turno asignado", "Tienes un turno asignado hoy: Turno Tarde Cuidados 14:00 - 22:00 en Residencia María Elena", "shift"),
    ("SUP-001", "Novedad de turno", "Registra el cierre del turno de supervisión del día de hoy", "reminder"),
]


def iso(dt: str, day: str) -> str:
    return f"{day}T{dt}"


async def seed_test_data():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False)
    now = datetime.now(timezone.utc)
    company_id = COMPANY_ID

    async with Session() as db:
        stats = {}

        async def insert(table: str, data: dict):
            cols = list(data.keys())
            vals = list(data.values())
            placeholders = ", ".join(f":{c}" for c in cols)
            sql = f"INSERT INTO {table} ({', '.join(cols)}) VALUES ({placeholders})"
            params = dict(zip(cols, vals))
            await db.execute(text(sql), params)
            return data.get("id")

        async def get_existing(table: str, col: str, val):
            row = await db.execute(text(f"SELECT id FROM {table} WHERE {col} = :v"), {"v": val})
            r = row.fetchone()
            return r[0] if r else None

        # ---- 1. Branches
        for code, name, addr, city, dept, lat, lon, rad, is_main in BRANCHES:
            if await get_existing("branches", "code", code):
                continue
            bid = str(uuid.uuid4())
            await insert("branches", {
                "id": bid, "company_id": company_id, "code": code, "name": name,
                "address": addr, "city": city, "department": dept,
                "latitude": lat, "longitude": lon, "geofence_radius": rad,
                "is_main": is_main, "is_active": True, "is_deleted": False,
                "created_at": now, "updated_at": now,
            })
            stats.setdefault("branches", 0)
            stats["branches"] += 1

        # ---- 2. Departments
        for code, name, desc in DEPARTMENTS:
            if await get_existing("departments", "code", code):
                continue
            await insert("departments", {
                "id": str(uuid.uuid4()), "company_id": company_id, "code": code,
                "name": name, "description": desc, "is_active": True,
                "is_deleted": False, "created_at": now, "updated_at": now,
            })
            stats.setdefault("departments", 0)
            stats["departments"] += 1

        # ---- 3. Job positions
        for code, name, lo, hi in JOB_POSITIONS:
            if await get_existing("job_positions", "code", code):
                continue
            await insert("job_positions", {
                "id": str(uuid.uuid4()), "company_id": company_id, "code": code,
                "name": name, "min_salary": lo, "max_salary": hi, "is_active": True,
                "is_deleted": False, "created_at": now, "updated_at": now,
            })
            stats.setdefault("job_positions", 0)
            stats["job_positions"] += 1

        # ---- 4. Cost centers
        for code, name, desc in COST_CENTERS:
            if await get_existing("cost_centers", "code", code):
                continue
            await insert("cost_centers", {
                "id": str(uuid.uuid4()), "company_id": company_id, "code": code,
                "name": name, "description": desc, "is_active": True,
                "is_deleted": False, "created_at": now, "updated_at": now,
            })
            stats.setdefault("cost_centers", 0)
            stats["cost_centers"] += 1

        # ---- 5. Work teams
        for name, desc in WORK_TEAMS:
            if await get_existing("work_teams", "name", name):
                continue
            await insert("work_teams", {
                "id": str(uuid.uuid4()), "company_id": company_id, "name": name,
                "description": desc, "is_active": True, "is_deleted": False,
                "created_at": now, "updated_at": now,
            })
            stats.setdefault("work_teams", 0)
            stats["work_teams"] += 1

        # ---- 6. Employees
        hashed = hash_password(TEST_PASSWORD)
        emp_ids = {}
        for (code, doctype, docnum, first, last, email, username, role, platform,
             branch, dept, pos, cc, team, salary, transport) in EMPLOYEES:
            existing = await get_existing("employees", "code", code)
            if existing:
                emp_ids[code] = existing
                continue
            eid = str(uuid.uuid4())
            branch_id = await get_existing("branches", "code", branch)
            dept_id = await get_existing("departments", "code", dept)
            pos_id = await get_existing("job_positions", "code", pos)
            cc_id = await get_existing("cost_centers", "code", cc)
            team_id = await get_existing("work_teams", "name", team)
            await insert("employees", {
                "id": eid, "company_id": company_id, "branch_id": branch_id,
                "department_id": dept_id, "job_position_id": pos_id,
                "cost_center_id": cc_id, "work_team_id": team_id,
                "code": code, "document_type": doctype, "document_number": docnum,
                "first_name": first, "last_name": last, "email": email,
                "country": "CO", "status": "active", "hire_date": date(2025, 1, 1),
                "username": username, "hashed_password": hashed,
                "role_id": ROLE_IDS[role], "platform_access": platform,
                "account_status": "active", "is_superuser": False,
                "force_password_change": False, "failed_login_attempts": 0,
                "first_login_completed": True, "biometric_enrolled": False,
                "mfa_enabled": False, "app_status": "active",
                "can_assign_georeference": True, "is_deleted": False,
                "created_at": now, "updated_at": now,
            })
            emp_ids[code] = eid
            stats.setdefault("employees", 0)
            stats["employees"] += 1

        # ---- 7. Contracts
        for (code, ctype, start, end, salary, transport, status) in CONTRACTS:
            existing = await get_existing("contracts", "code", code)
            if existing:
                continue
            eid = emp_ids[code]
            branch_id = await db.execute(text("SELECT branch_id FROM employees WHERE id=:e"), {"e": eid})
            await insert("contracts", {
                "id": str(uuid.uuid4()), "employee_id": eid, "company_id": company_id,
                "contract_type_id": CONTRACT_TYPE_IDS[ctype], "branch_id": (branch_id.fetchone() or [None])[0],
                "code": code, "start_date": start, "end_date": end,
                "salary": salary, "transportation_assistance": transport,
                "weekly_hours": 48.0, "daily_hours": 8.0, "work_scheme": "rotativo",
                "payment_frequency": "mensual", "status": status,
                "risk_level": "I", "salary_type": "fijo",
                "max_hours_per_day": 8.0, "contracted_hours": 192.0,
                "overtime_enabled": True, "is_renewable": False,
                "is_deleted": False, "created_at": now, "updated_at": now,
            })
            stats.setdefault("contracts", 0)
            stats["contracts"] += 1

        # ---- 8. Schedule series + schedules + shifts
        schedule_ids = {}
        for (name, emp_code, client, template, days, h_start, h_end, desc) in SERIES:
            eid = emp_ids[emp_code]
            existing = await get_existing("schedule_series", "name", name)
            if existing:
                sid = existing
            else:
                sid = str(uuid.uuid4())
                await insert("schedule_series", {
                    "id": sid, "company_id": company_id, "name": name,
                    "description": desc, "client_id": client, "employee_id": eid,
                    "shift_template_id": template, "recurrence_type": "weekly",
                    "recurrence_days": ",".join(str(d) for d in days),
                    "start_date": SERIES_START, "end_date": SERIES_END,
                    "default_start_time": h_start, "default_end_time": h_end,
                    "default_break_minutes": 0, "default_priority": "normal",
                    "color": "#3B82F6", "status": "active", "total_generated": 0,
                    "is_active": True, "is_deleted": False,
                    "created_at": now, "updated_at": now,
                })
                stats.setdefault("schedule_series", 0)
                stats["schedule_series"] += 1

            existing_schedule = await db.execute(text(
                "SELECT id FROM schedules WHERE series_id=:s LIMIT 1"
            ), {"s": sid})
            sch_row = existing_schedule.fetchone()
            if sch_row:
                schedule_ids[name] = sch_row[0]
            else:
                sch_id = str(uuid.uuid4())
                await insert("schedules", {
                    "id": sch_id, "company_id": company_id, "name": f"{name} - Generado",
                    "description": f"Generado desde serie: {name}", "client_id": client,
                    "start_date": SERIES_START, "end_date": SERIES_END,
                    "series_id": sid, "shift_template_id": template,
                    "recurrence": "weekly", "recurrence_type": "weekly",
                    "recurrence_days": ",".join(str(d) for d in days),
                    "status": "active", "is_active": True, "is_deleted": False,
                    "created_at": now, "updated_at": now,
                })
                schedule_ids[name] = sch_id
                stats.setdefault("schedules", 0)
                stats["schedules"] += 1

        # Shifts for 2 weeks
        shifts_created = 0
        cur = SERIES_START
        while cur <= SERIES_END:
            for (name, emp_code, client, template, days, h_start, h_end, desc) in SERIES:
                if cur.weekday() not in days:
                    continue
                sch_id = schedule_ids[name]
                eid = emp_ids[emp_code]
                existing = await db.execute(text(
                    "SELECT id FROM shifts WHERE schedule_id=:s AND shift_date=:d AND employee_id=:e"
                ), {"s": sch_id, "d": cur, "e": eid})
                if existing.fetchone():
                    continue
                await insert("shifts", {
                    "id": str(uuid.uuid4()), "schedule_id": sch_id, "employee_id": eid,
                    "client_id": client, "name": name, "shift_date": cur,
                    "start_time": h_start, "end_time": h_end, "break_minutes": 0,
                    "priority": "normal", "status": "scheduled", "notes": desc,
                    "shift_template_id": template, "color": "#3B82F6",
                    "is_deleted": False, "created_at": now, "updated_at": now,
                })
                shifts_created += 1
            cur += timedelta(days=1)
        stats["shifts"] = shifts_created

        # ---- 9. Access records
        acc_created = 0
        for (emp_code, client, rtype, day, htime, lat, lon, acc, addr,
             inside, dist, geo, face, live, worked, overtime, night, late, early) in ACCESS_RECORDS:
            eid = emp_ids[emp_code]
            existing = await db.execute(text(
                "SELECT id FROM access_records WHERE employee_id=:e AND timestamp=:t"
            ), {"e": eid, "t": iso(htime, day)})
            if existing.fetchone():
                continue
            await insert("access_records", {
                "id": str(uuid.uuid4()), "employee_id": eid, "client_id": client,
                "record_type": rtype, "timestamp": iso(htime, day),
                "latitude": lat, "longitude": lon, "location_accuracy": acc,
                "address": addr, "device_id": "TEST-DEV-001",
                "device_model": "Android Emulator", "device_os": "Android 14",
                "battery_level": 92, "connection_type": "wifi",
                "face_match_score": 0.984, "face_verified": face,
                "inside_geofence": inside, "geofence_distance": dist,
                "geofence_name": geo, "is_mock_location": False,
                "liveness_detected": live, "worked_hours": worked,
                "overtime_hours": overtime, "night_hours": night,
                "is_synced": True, "auto_closed": False,
                "is_late_arrival": late, "is_early_departure": early,
                "is_auto_exit": False, "is_deleted": False,
                "created_at": now, "updated_at": now,
            })
            acc_created += 1
        stats["access_records"] = acc_created

        # ---- 10. Payroll period AGOSTO 2026 + records
        period = await get_existing("payroll_periods", "name", "NÓMINA AGOSTO 2026")
        if not period:
            period_id = str(uuid.uuid4())
            await insert("payroll_periods", {
                "id": period_id, "company_id": company_id, "name": "NÓMINA AGOSTO 2026",
                "year": 2026, "month": 8, "start_date": date(2026, 8, 1),
                "end_date": date(2026, 8, 31), "payment_date": date(2026, 8, 31),
                "status": "open", "is_closed": False, "is_deleted": False,
                "created_at": now, "updated_at": now,
            })
            period_id = period_id if period_id else await get_existing("payroll_periods", "name", "NÓMINA AGOSTO 2026")
            stats.setdefault("payroll_periods", 0)
            stats["payroll_periods"] += 1
        else:
            period_id = period

        # Records preliminares (draft) para contratos activos
        records_created = 0
        for (code, ctype, start, end, salary, transport, status) in CONTRACTS:
            if status != "active":
                continue
            eid = emp_ids[code]
            contract_id = await get_existing("contracts", "code", code)
            existing = await db.execute(text(
                "SELECT id FROM payroll_records WHERE period_id=:p AND contract_id=:c"
            ), {"p": period_id, "c": contract_id})
            if existing.fetchone():
                continue
            transport_val = 140606 if transport else 0
            base = float(salary)
            health_ded = round(base * 0.04, 2)
            pension_ded = round(base * 0.04, 2)
            total_earnings = base + transport_val
            total_deductions = health_ded + pension_ded
            net_pay = round(total_earnings - total_deductions, 2)
            health_emp = round(base * 0.085, 2)
            pension_emp = round(base * 0.12, 2)
            arl_emp = round(base * 0.00522, 2)
            icbf = round(base * 0.03, 2)
            sena = round(base * 0.02, 2)
            caja = round(base * 0.04, 2)
            total_emp_cost = round(base + transport_val + health_emp + pension_emp + arl_emp + icbf + sena + caja, 2)
            await insert("payroll_records", {
                "id": str(uuid.uuid4()), "period_id": period_id,
                "contract_id": contract_id, "employee_id": eid,
                "company_id": company_id, "base_salary": base,
                "transportation_assistance": transport_val,
                "overtime_hours": 0.0, "overtime_value": 0.0,
                "night_hours": 0.0, "night_value": 0.0,
                "sunday_holiday_hours": 0.0, "sunday_holiday_value": 0.0,
                "bonuses": 0.0, "commissions": 0.0, "other_earnings": 0.0,
                "service_bonus": 0.0, "vacation_days": 0.0, "vacation_value": 0.0,
                "health_deduction": health_ded, "pension_deduction": pension_ded,
                "solidarity_fund": 0.0, "retefuente": 0.0, "embargo": 0.0,
                "libranza": 0.0, "other_deductions": 0.0,
                "health_employer": health_emp, "pension_employer": pension_emp,
                "arl_employer": arl_emp, "icbf": icbf, "sena": sena,
                "caja_compensacion_employer": caja,
                "total_earnings": total_earnings, "total_deductions": total_deductions,
                "total_employer_cost": total_emp_cost, "net_pay": net_pay,
                "worked_days": 30, "status": "draft",
                "cesantias": 0.0, "prima_servicios": 0.0,
                "is_deleted": False, "created_at": now, "updated_at": now,
            })
            records_created += 1
        stats["payroll_records"] = records_created

        # ---- 11. Notifications
        notif_created = 0
        for (emp_code, title, body, ntype) in NOTIFICATIONS:
            eid = emp_ids[emp_code]
            existing = await db.execute(text(
                "SELECT id FROM notifications WHERE user_id=:u AND title=:t AND body=:b"
            ), {"u": eid, "t": title, "b": body})
            if existing.fetchone():
                continue
            await insert("notifications", {
                "id": str(uuid.uuid4()), "company_id": company_id, "user_id": eid,
                "employee_id": eid,
                "title": title, "body": body, "type": ntype, "is_read": False,
                "is_deleted": False, "created_at": now, "updated_at": now,
            })
            notif_created += 1
        stats["notifications"] = notif_created

        await db.commit()

        print("Seed datos de prueba completado:")
        for k, v in stats.items():
            print(f"  {k}: {v}")
        print(f"\nCredenciales de prueba (password: {TEST_PASSWORD}):")
        for e in EMPLOYEES:
            print(f"  {e[6]} / {TEST_PASSWORD}  [{e[7]}, {e[8]}]")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed_test_data())
