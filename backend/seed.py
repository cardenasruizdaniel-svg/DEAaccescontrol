"""Seed script: creates default company, roles, permissions, and admin user."""
import asyncio
import uuid
from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.core.config import settings
from app.core.security import hash_password


# IAM MODULES AND ACTIONS
MODULES = [
    ("dashboard", "Dashboard"),
    ("employees", "Empleados"),
    ("clients", "Clientes"),
    ("contracts", "Contratos"),
    ("payroll", "Nómina"),
    ("scheduling", "Turnos"),
    ("geolocation", "Geolocalización"),
    ("access_control", "Control de Acceso"),
    ("facial_recognition", "Reconocimiento Facial"),
    ("notifications", "Notificaciones"),
    ("reports", "Reportes"),
    ("ai_assistant", "Asistente IA"),
    ("users", "Usuarios"),
    ("roles", "Roles"),
    ("permissions", "Permisos"),
    ("audit_logs", "Auditoría"),
    ("branches", "Sedes"),
    ("cost_centers", "Centros de Costo"),
    ("departments", "Departamentos"),
    ("dotaciones", "Dotaciones"),
]

ACTIONS = ["view", "create", "update", "delete", "export", "import", "approve", "manage"]

# Default roles with their permission sets
DEFAULT_ROLES = [
    {
        "name": "Super Admin",
        "display_name": "Super Administrador",
        "desc": "Acceso total al sistema",
        "level": 100,
        "color": "#DC2626",
        "icon": "shield",
        "all_permissions": True,
    },
    {
        "name": "Gerencia",
        "display_name": "Gerencia",
        "desc": "Acceso de lectura general + aprobaciones",
        "level": 80,
        "color": "#7C3AED",
        "icon": "briefcase",
        "modules": [
            ("dashboard", ["view"]),
            ("employees", ["view", "approve"]),
            ("clients", ["view"]),
            ("contracts", ["view", "approve"]),
            ("payroll", ["view", "approve"]),
            ("scheduling", ["view"]),
            ("reports", ["view", "export"]),
            ("users", ["view"]),
            ("branches", ["view"]),
            ("cost_centers", ["view"]),
            ("departments", ["view"]),
        ],
    },
    {
        "name": "Administración",
        "display_name": "Administración",
        "desc": "Gestión completa de operaciones administrativas",
        "level": 70,
        "color": "#2563EB",
        "icon": "cog",
        "modules": [
            ("dashboard", ["view"]),
            ("employees", ["view", "create", "update"]),
            ("clients", ["view", "create", "update"]),
            ("contracts", ["view", "create", "update"]),
            ("payroll", ["view", "create", "update"]),
            ("scheduling", ["view", "create", "update"]),
            ("geolocation", ["view"]),
            ("access_control", ["view"]),
            ("reports", ["view", "export"]),
            ("users", ["view", "create", "update"]),
            ("branches", ["view", "create", "update"]),
            ("cost_centers", ["view", "create", "update"]),
            ("departments", ["view", "create", "update"]),
            ("dotaciones", ["view", "create", "update"]),
            ("notifications", ["view", "create"]),
        ],
    },
    {
        "name": "Administrativo",
        "display_name": "Administrativo",
        "desc": "Gestión de datos administrativos y turnos",
        "level": 50,
        "color": "#0891B2",
        "icon": "clipboard",
        "modules": [
            ("dashboard", ["view"]),
            ("employees", ["view"]),
            ("clients", ["view", "create", "update"]),
            ("contracts", ["view"]),
            ("payroll", ["view"]),
            ("scheduling", ["view", "create", "update"]),
            ("reports", ["view"]),
            ("branches", ["view"]),
            ("cost_centers", ["view"]),
            ("departments", ["view"]),
            ("dotaciones", ["view", "create", "update"]),
        ],
    },
    {
        "name": "Médico",
        "display_name": "Médico",
        "desc": "Acceso a información médica y pacientes",
        "level": 45,
        "color": "#059669",
        "icon": "heart",
        "modules": [
            ("dashboard", ["view"]),
            ("employees", ["view"]),
            ("clients", ["view"]),
            ("access_control", ["view"]),
            ("reports", ["view"]),
        ],
    },
    {
        "name": "Enfermero",
        "display_name": "Enfermero",
        "desc": "Control de acceso y cuidado básico",
        "level": 40,
        "color": "#16A34A",
        "icon": "activity",
        "modules": [
            ("dashboard", ["view"]),
            ("employees", ["view"]),
            ("access_control", ["view", "manage"]),
            ("scheduling", ["view"]),
        ],
    },
    {
        "name": "Cuidador",
        "display_name": "Cuidador",
        "desc": "Acceso básico para cuidadores",
        "level": 30,
        "color": "#CA8A04",
        "icon": "user",
        "modules": [
            ("dashboard", ["view"]),
            ("access_control", ["view"]),
            ("scheduling", ["view"]),
        ],
    },
    {
        "name": "Supervisor",
        "display_name": "Supervisor",
        "desc": "Supervisión de operaciones y personal",
        "level": 60,
        "color": "#EA580C",
        "icon": "eye",
        "modules": [
            ("dashboard", ["view"]),
            ("employees", ["view"]),
            ("clients", ["view"]),
            ("contracts", ["view"]),
            ("scheduling", ["view", "create", "update"]),
            ("geolocation", ["view"]),
            ("access_control", ["view"]),
            ("reports", ["view", "export"]),
            ("dotaciones", ["view"]),
        ],
    },
    {
        "name": "Auditor",
        "display_name": "Auditor",
        "desc": "Solo lectura + acceso a auditoría y reportes",
        "level": 65,
        "color": "#9333EA",
        "icon": "search",
        "modules": [
            ("dashboard", ["view"]),
            ("employees", ["view"]),
            ("clients", ["view"]),
            ("contracts", ["view"]),
            ("payroll", ["view"]),
            ("scheduling", ["view"]),
            ("geolocation", ["view"]),
            ("access_control", ["view"]),
            ("reports", ["view", "export"]),
            ("audit_logs", ["view"]),
            ("users", ["view"]),
        ],
    },
]


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False)
    now = datetime.now(timezone.utc)

    async with Session() as db:
        company_id = str(uuid.uuid4())

        # 1. Company
        await db.execute(text("""
            INSERT INTO companies (id, nit, name, address, phone, email, country, timezone, is_active, is_deleted, created_at, updated_at)
            VALUES (:id, :nit, :name, :address, :phone, :email, 'CO', 'America/Bogota', true, false, :now, :now)
            ON CONFLICT (nit) DO NOTHING
        """), {
            "id": company_id, "nit": "900123456-7", "name": "DLA Redes y Seguridad S.A.S.",
            "address": "Cra 7 # 40-62, Bogotá", "phone": "+576011234567",
            "email": "admin@dlaredes.com.co", "now": now,
        })

        # Get or create company
        result = await db.execute(text("SELECT id FROM companies WHERE nit = :nit"), {"nit": "900123456-7"})
        row = result.fetchone()
        company_id = row[0] if row else company_id

        # 2. Permissions
        perm_ids = {}
        for mod_code, mod_name in MODULES:
            for action in ACTIONS:
                perm_id = str(uuid.uuid4())
                await db.execute(text("""
                    INSERT INTO permissions (id, module, action, display_name, description, is_active, is_deleted, created_at, updated_at)
                    VALUES (:id, :module, :action, :display, :desc, true, false, :now, :now)
                    ON CONFLICT (module, action) DO UPDATE SET display_name = EXCLUDED.display_name
                """), {
                    "id": perm_id, "module": mod_code, "action": action,
                    "display": f"{mod_name}: {action}",
                    "desc": f"Permite {action} en {mod_name}",
                    "now": now,
                })

        # Read back actual permission IDs
        result = await db.execute(text("SELECT id, module, action FROM permissions"))
        for row in result.fetchall():
            perm_ids[(row[1], row[2])] = row[0]

        # 3. Roles
        for role_def in DEFAULT_ROLES:
            role_id = str(uuid.uuid4())
            await db.execute(text("""
                INSERT INTO roles (id, name, display_name, description, is_active, is_system, level, color, icon, is_deleted, created_at, updated_at)
                VALUES (:id, :name, :display, :desc, true, true, :level, :color, :icon, false, :now, :now)
                ON CONFLICT (name) DO UPDATE SET display_name = EXCLUDED.display_name, level = EXCLUDED.level, color = EXCLUDED.color
            """), {
                "id": role_id, "name": role_def["name"], "display": role_def["display_name"],
                "desc": role_def["desc"], "level": role_def["level"],
                "color": role_def["color"], "icon": role_def["icon"], "now": now,
            })

        # Read back actual role IDs
        result = await db.execute(text("SELECT id, name FROM roles"))
        role_ids = {row[1]: row[0] for row in result.fetchall()}

        # Assign permissions to roles
        for role_def in DEFAULT_ROLES:
            role_id = role_ids[role_def["name"]]
            if role_def.get("all_permissions"):
                for (mod_code, action), pid in perm_ids.items():
                    await db.execute(text("""
                        INSERT INTO role_permissions (id, role_id, permission_id, is_deleted, created_at, updated_at)
                        VALUES (:id, :rid, :pid, false, :now, :now)
                        ON CONFLICT (role_id, permission_id) DO NOTHING
                    """), {"id": str(uuid.uuid4()), "rid": role_id, "pid": pid, "now": now})
            else:
                for mod_code, actions_list in role_def.get("modules", []):
                    for action in actions_list:
                        pid = perm_ids.get((mod_code, action))
                        if pid:
                            await db.execute(text("""
                                INSERT INTO role_permissions (id, role_id, permission_id, is_deleted, created_at, updated_at)
                                VALUES (:id, :rid, :pid, false, :now, :now)
                                ON CONFLICT (role_id, permission_id) DO NOTHING
                            """), {"id": str(uuid.uuid4()), "rid": role_id, "pid": pid, "now": now})

        # 4. Admin user
        admin_role_id = role_ids["Super Admin"]
        user_id = str(uuid.uuid4())
        hashed = hash_password("admin123")
        await db.execute(text("""
            INSERT INTO users (id, email, username, hashed_password, full_name, role_id, company_id,
                               is_active, is_superuser, is_verified, mfa_enabled, failed_login_attempts,
                               account_status, platform_access, first_login_completed,
                               is_deleted, created_at, updated_at)
            VALUES (:id, :email, :username, :pwd, :name, :role_id, :company_id,
                    true, true, true, false, 0, 'active', 'both', true, false, :now, :now)
            ON CONFLICT (email) DO UPDATE SET role_id = EXCLUDED.role_id
        """), {
            "id": user_id, "email": "admin@dlaredes.com.co", "username": "admin",
            "pwd": hashed, "name": "Administrador DLA", "role_id": admin_role_id,
            "company_id": company_id, "now": now,
        })

        await db.commit()
        print(f"Seed completado:")
        print(f"  Empresa:     {company_id}")
        print(f"  Roles:       {len(DEFAULT_ROLES)} (Super Admin, Gerencia, Administracion, Administrativo, Medico, Enfermero, Cuidador, Supervisor, Auditor)")
        print(f"  Permisos:    {len(perm_ids)} ({len(MODULES)} modulos x {len(ACTIONS)} acciones)")
        print(f"  Usuario:     admin@dlaredes.com.co / admin123")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
