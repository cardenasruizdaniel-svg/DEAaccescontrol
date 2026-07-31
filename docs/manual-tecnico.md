# Manual Tecnico - DLA Access Enterprise

## 1. Arquitectura del Sistema

### 1.1 Vista General

```
+------------------+     +------------------+     +------------------+
|   Frontend Web   |     |   App Movil      |     |   Backend API   |
|   Next.js 14     |     |   Expo SDK 50    |     |   FastAPI       |
|   :3000          |     |   :19006         |     |   :8888         |
+--------+---------+     +--------+---------+     +--------+---------+
         |                        |                        |
         +------------------------+------------------------+
                                  |
                    +-------------+-------------+
                    |         PostgreSQL         |
                    |         :5432              |
                    +---------------------------+
```

### 1.2 Stack Tecnologico

| Capa | Tecnologia | Version |
|------|-----------|---------|
| **Backend** | Python + FastAPI | >=0.104.0 |
| **ORM** | SQLAlchemy 2.0 (async) | >=2.0.23 |
| **Base de datos** | PostgreSQL + asyncpg | >=15.0 |
| **Migraciones** | Alembic | >=1.13.0 |
| **Frontend** | Next.js 14 (React) | 14.0.4 |
| **App Movil** | Expo SDK 50 + React Native | 0.73.6 |
| **Servidor ASGI** | Uvicorn | >=0.24.0 |
| **Cache/Colas** | Redis + RabbitMQ (Celery) | 5.0 / 5.3 |
| **Auth** | JWT (HS256) + bcrypt + TOTP MFA | - |
| **BI** | OpenCV + face-recognition | 4.8 / 1.3 |
| **GIS** | geopy + shapely | 2.4 / 2.0 |
| **Python** | >= 3.11 | 3.11+ |

### 1.3 Estructura de Directorios

```
dla-access-enterprise/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI app + router registration
│   │   ├── core/
│   │   │   ├── config.py              # Settings (pydantic-settings)
│   │   │   ├── deps.py                # Dependency injection
│   │   │   └── database.py            # Engine + session factory
│   │   ├── modules/
│   │   │   ├── auth/                  # Autenticacion
│   │   │   ├── employees/             # Empleados
│   │   │   ├── clients/               # Clientes
│   │   │   ├── contracts/             # Contratos
│   │   │   ├── payroll/               # Nomina
│   │   │   ├── scheduling/            # Programacion
│   │   │   ├── geolocation/           # Geolocalizacion
│   │   │   ├── access_control/        # Control de acceso
│   │   │   ├── facial_recognition/    # Reconocimiento facial
│   │   │   ├── notifications/         # Notificaciones
│   │   │   ├── reports/               # Reportes
│   │   │   ├── ai_assistant/          # Asistente IA
│   │   │   ├── iam/                   # Gestion de identidades
│   │   │   └── mobile/                # Endpoints movil
│   │   └── shared/
│   │       └── database/
│   │           ├── models_base.py     # Base model mixins
│   │           ├── models_hr.py       # Employee, Department, etc.
│   │           ├── models_auth.py     # Role, Permission, Session, Audit
│   │           └── migrations/        # Alembic migrations
│   ├── pyproject.toml                 # Dependencias Python
│   └── .env                           # Variables de entorno
├── frontend/
│   ├── src/
│   │   ├── app/                       # Next.js App Router pages
│   │   ├── components/                # Componentes React
│   │   ├── lib/                       # Utilities (apiClient, utils)
│   │   └── types/                     # TypeScript interfaces
│   ├── package.json                   # Dependencias Node
│   └── .env.local                     # Variables de entorno frontend
├── mobile/
│   ├── App.tsx                        # Entry point
│   ├── src/
│   │   ├── screens/                   # 14 pantallas
│   │   ├── navigation/                # AppNavigator (stack + tabs)
│   │   ├── services/                  # api.ts (axios client)
│   │   ├── store/                     # Zustand stores
│   │   └── theme/                     # ThemeContext + colors
│   ├── app.json                       # Expo config
│   └── package.json                   # Dependencias Node
└── docs/                              # Esta documentacion
```

### 1.4 Arquitectura de Modulos Backend

Cada modulo sigue la arquitectura en capas:

```
modules/{module_name}/
├── application/
│   └── service.py           # Logica de negocio
├── infrastructure/
│   └── repositories.py      # Acceso a datos (SQLAlchemy)
└── presentation/
    ├── routes.py            # Endpoints FastAPI
    └── schemas.py           # Request/Response schemas (Pydantic)
```

---

## 2. Base de Datos

### 2.1 Configuracion

| Parametro | Valor |
|-----------|-------|
| Host | `localhost` |
| Port | `5432` |
| Database | `dla_access_enterprise` |
| User | `postgres` |
| Auth | `trust` (desarrollo) |
| Driver | `asyncpg` (async) |
| Pool size | 20 + 10 overflow |

### 2.2 Tablas Principales (35 tablas)

| Tabla | Descripcion |
|-------|-------------|
| `employees` | Empleados (tabla central unificada) |
| `roles` | Roles del sistema |
| `permissions` | Permisos granulares |
| `role_permissions` | Relacion rol-permiso (M2M) |
| `user_sessions` | Sesiones activas (FK → employees) |
| `audit_logs` | Registro de auditoria (FK → employees) |
| `departments` | Departamentos (jerarquicos) |
| `job_positions` | Cargos/puestos |
| `cost_centers` | Centros de costo |
| `work_teams` | Equipos de trabajo |
| `companies` | Empresas |
| `clients` | Clientes |
| `client_contacts` | Contactos de clientes |
| `client_locations` | Ubicaciones de clientes |
| `client_personas` | Personas asociadas a clientes |
| `client_projects` | Proyectos de clientes |
| `contracts` | Contratos laborales |
| `contract_types` | Tipos de contrato |
| `payroll_periods` | Periodos de nomina |
| `payroll_records` | Registros de nomina |
| `payroll_concepts` | Conceptos de nomina |
| `shift_templates` | Plantillas de turno |
| `schedules` | Programaciones |
| `shifts` | Turnos individuales |
| `shift_series` | Series recurrentes |
| `notifications` | Notificaciones (FK → employees) |
| `push_tokens` | Tokens push (FK → employees) |
| `employee_documents` | Documentos de empleados |
| `employee_dotaciones` | Dotaciones de empleados |
| `personas` | Personas (beneficiarios) |
| `visits` | Visitantes |
| `access_logs` | Registros de acceso |
| `geofences` | Geocercas |
| `location_history` | Historial de ubicaciones |

### 2.3 Modelo Base

Todas las tablas heredan de `BaseModel` que incluye:

| Mixin | Campos | Tipo |
|-------|--------|------|
| `UUIDMixin` | `id` | String(36), PK, UUID4 auto |
| `TimestampMixin` | `created_at`, `updated_at` | DateTime(tz), UTC |
| `SoftDeleteMixin` | `is_deleted`, `deleted_at` | Boolean + DateTime nullable |
| `AuditMixin` | `created_by`, `updated_by` | String(36) nullable |

### 2.4 Modelo Employee (Central)

El modelo `employees` es la tabla central del sistema, unificando perfil HR, credenciales de acceso, datos biométricos y seguridad social:

**Organizacion:** company_id, branch_id, department_id, job_position_id, cost_center_id, work_team_id, code

**Identidad:** document_type, document_number, first_name, last_name, middle_name, second_last_name

**Contacto:** email, phone, mobile, address, city, department_loc, country

**Personal:** birth_date, gender, blood_type, marital_status

**Biometrico:** photo_url, facial_photo_url, facial_photo_verified, facial_encoding, fingerprint_template, signature_url

**Seguridad Social:** eps, arl, afp, caja_compensacion

**Emergencia:** emergency_contact_name, emergency_contact_phone, emergency_contact_relation

**Empleo:** status, hire_date, termination_date

**Bancario:** bank_name, bank_account_type, bank_account_number

**Acceso al sistema:** username (unique), hashed_password, role_id (FK), platform_access, account_status, is_superuser, force_password_change, mfa_enabled, mfa_secret, first_login_completed, biometric_enrolled, failed_login_attempts, locked_until, app_status

### 2.5 Migraciones (Alembic)

```bash
# Aplicar todas las migraciones pendientes
alembic upgrade head

# Crear nueva migracion
alembic revision --autogenerate -m "descripcion"

# Ver version actual
alembic current

# Revertir ultima migracion
alembic downgrade -1
```

Migracion actual: `f3_auth_unification` (unificacion de tablas users → employees)

---

## 3. API REST

### 3.1 Base URL

```
http://localhost:8888/api/v1
```

### 3.2 Autenticacion

```
POST /auth/login?platform=web
Body: {"email": "...", "password": "..."}
Response: {"access_token": "eyJ...", "refresh_token": "eyJ...", "user": {...}}
```

**Headers requeridos:**
```
Authorization: Bearer {access_token}
```

### 3.3 Endpoints (121 total)

| Modulo | Prefijo | Endpoints |
|--------|---------|-----------|
| Auth | `/auth` | 8 |
| Employees | `/employees` | 14 |
| Clients | `/clients` | 21 |
| Contracts | `/contracts` | 10 |
| IAM | `/iam` | 16 |
| Payroll | `/payroll` | 10 |
| Scheduling | `/scheduling` | 28 |
| Notifications | `/notifications` | 5 |
| Reports | `/reports` | 4 |
| AI Assistant | `/ai` | 3 |
| Health | `/` | 2 |
| Geolocation | `/geolocation` | - |
| Access Control | `/access-control` | - |
| Facial Recognition | `/facial-recognition` | - |
| Dashboard | `/dashboard` | - |
| Mobile | `/mobile` | - |

### 3.4 Paginacion

Todos los endpoints de lista soportan:
```
GET /employees?page=1&page_size=20&search=juan&sort_by=created_at&sort_order=desc
```

Response:
```json
{
  "items": [...],
  "total": 150,
  "page": 1,
  "page_size": 20,
  "pages": 8
}
```

### 3.5 Codigos de Respuesta

| Codigo | Significado |
|--------|------------|
| 200 | Exito |
| 201 | Creado |
| 400 | Solicitud invalida |
| 401 | No autenticado |
| 403 | Sin permisos |
| 404 | No encontrado |
| 409 | Conflicto (duplicado) |
| 422 | Error de validacion |
| 423 | Cuenta bloqueada |
| 500 | Error interno |

---

## 4. Seguridad

### 4.1 Flujo de Autenticacion

```
Login → Verificar credenciales → Verificar estado cuenta → Verificar plataforma
→ Verificar contrasena → Verificar MFA (si aplica) → Generar JWT
→ Crear sesion en BD → Registrar en audit_log → Responder tokens
```

### 4.2 JWT Tokens

| Tipo | Duracion | Uso |
|------|----------|-----|
| Access Token | 30 minutos | Autenticar requests |
| Refresh Token | 7 dias | Obtener nuevo access token |
| MFA Token | 1 uso | Completar login con MFA |

### 4.3 Hashing de Contrasenas

- Algoritmo: **bcrypt** (version 4.2.1)
- Work factor: default (10)
- Nunca se almacenan contrasenas en texto plano

### 4.4 Auditoria

Toda accion significativa genera un registro en `audit_logs`:
- employee_id (quien)
- action (que: login, create, update, delete)
- module (donde: employees, payroll, etc.)
- old_values / new_values (JSON con cambios)
- ip_address, user_agent, platform

---

## 5. Dependencias Principales

### 5.1 Backend (Python)

| Paquete | Uso |
|---------|-----|
| fastapi | Framework web async |
| uvicorn | Servidor ASGI |
| sqlalchemy | ORM async |
| asyncpg | Driver PostgreSQL |
| alembic | Migraciones |
| pydantic | Validacion de datos |
| python-jose | JWT |
| passlib + bcrypt | Hashing contrasenas |
| pyotp | TOTP MFA |
| opencv-python | Vision por computadora |
| face-recognition | Reconocimiento facial |
| shapely | Geocercas |
| openpyxl | Exportar Excel |
| reportlab | Generar PDF |
| pandas | Analisis de datos |
| celery | Tareas asincronas |
| redis | Cache |
| httpx | Cliente HTTP async |

### 5.2 Frontend (Node.js)

| Paquete | Uso |
|---------|-----|
| next | Framework React SSR |
| react / react-dom | UI |
| typescript | Type safety |

### 5.3 App Movil (Node.js)

| Paquete | Uso |
|---------|-----|
| expo | Framework React Native |
| react-native | Runtime movil |
| zustand | State management |
| axios | HTTP client |
| expo-camera | Camara |
| expo-location | GPS |
| expo-local-authentication | Biometrico |
| expo-secure-store | Storage encriptado |
| expo-notifications | Push notifications |
| expo-sqlite | DB local (offline) |
| react-native-maps | Mapas |

---

## 6. Despliegue

### 6.1 Desarrollo

```bash
# Backend
cd backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8888

# Frontend
cd frontend
npm run dev  # Puerto 3000

# Mobile
cd mobile
npx expo start --web  # Puerto 19006
```

### 6.2 Produccion

```bash
# Backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8888 --workers 4

# Frontend
cd frontend
npm run build
npm start  # Puerto 3000
```

### 6.3 Variables de Entorno Criticas

| Variable | Descripcion | Valor defecto |
|----------|-------------|---------------|
| `SECRET_KEY` | Clave JWT | (debe cambiar en prod) |
| `DATABASE_URL` | URL PostgreSQL | postgresql+asyncpg://... |
| `ENCRYPTION_KEY` | Clave encriptacion | (debe cambiar en prod) |
| `AI_API_KEY` | API Key OpenAI | (requerido para IA) |
| `GOOGLE_MAPS_API_KEY` | API Key Maps | (requerido para geolocalizacion) |
