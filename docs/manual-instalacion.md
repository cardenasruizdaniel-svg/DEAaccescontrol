# Manual de Instalacion - DLA Access Enterprise

## 1. Requisitos Previos

### 1.1 Software Requerido

| Componente | Version Minima | Proposito |
|------------|---------------|-----------|
| **Node.js** | 18.0+ | Frontend y app movil |
| **npm** | 9.0+ | Gestor de paquetes Node |
| **Python** | 3.11+ | Backend |
| **PostgreSQL** | 15+ | Base de datos |
| **Git** | 2.0+ | Control de versiones |

### 1.2 Software Opcional

| Componente | Version | Proposito |
|------------|---------|-----------|
| Redis | 7.0+ | Cache (requerido para produccion) |
| RabbitMQ | 3.12+ | Colas de tareas async |
| Expo CLI | Latest | Desarrollo movil |
| VS Code | Latest | Editor recomendado |

### 1.3 Hardware Minimo

| Recurso | Minimo | Recomendado |
|---------|--------|-------------|
| RAM | 8 GB | 16 GB |
| Disco | 10 GB libres | 20 GB |
| CPU | 2 cores | 4+ cores |

---

## 2. Instalacion Paso a Paso

### 2.1 Clonar el Repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd dla-access-enterprise
```

### 2.2 Base de Datos

#### Opcion A: PostgreSQL Local (Windows)

1. Descargar e instalar PostgreSQL 16 desde:
   `https://www.postgresql.org/download/windows/`

2. Durante la instalacion, configurar:
   - Puerto: `5432`
   - Contrasena del usuario `postgres`: (guardar)
   - Locale: `Spanish - Colombia`

3. Para desarrollo, configurar `trust` auth en `pg_hba.conf`:
   ```
   # Windows: C:\pgsql16\data\pg_hba.conf
   # Local connections:
   host    all    all    127.0.0.1/32    trust
   host    all    all    ::1/128         trust
   ```

4. Reiniciar el servicio de PostgreSQL

#### Opcion B: Docker

```bash
docker run -d \
  --name dla-postgres \
  -e POSTGRES_DB=dla_access_enterprise \
  -e POSTGRES_PASSWORD=dla_password \
  -p 5432:5432 \
  -v dla_data:/var/lib/postgresql/data \
  postgres:16-alpine
```

#### Crear la Base de Datos

```bash
psql -U postgres -c "CREATE DATABASE dla_access_enterprise;"
```

> Nota: Si usa trust auth, no necesita contrasena.

### 2.3 Backend

```bash
cd backend

# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Instalar dependencias
pip install -e .

# Si bcrypt da problemas, fijar version:
pip install bcrypt==4.2.1

# Copiar archivo de entorno
copy .env.example .env

# Aplicar migraciones de base de datos
alembic upgrade head

# Verificar que funciona
python -c "from app.main import app; print('OK')"
```

#### Configurar `.env` (Backend)

Copie `.env.example` a `.env` y ajuste:

```ini
# Seguridad (CAMBIAR en produccion)
SECRET_KEY=mi-clave-secreta-muy-larga-y-completa
ENCRYPTION_KEY=mi-clave-de-encriptacion

# Base de datos
DATABASE_URL=postgresql+asyncpg://postgres@localhost:5432/dla_access_enterprise

# Desarrollo
DEBUG=true
ENVIRONMENT=development
```

### 2.4 Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Copiar archivo de entorno
copy .env.example .env.local
```

#### Configurar `.env.local` (Frontend)

```ini
NEXT_PUBLIC_API_URL=http://localhost:8888/api/v1
```

### 2.5 App Movil

```bash
cd mobile

# Instalar dependencias
npm install

# Instalar Expo CLI globalmente (opcional)
npm install -g expo-cli
```

---

## 3. Iniciar los Servicios

### 3.1 Backend

```bash
cd backend
venv\Scripts\activate
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8888
```

Verificar: Abrir `http://localhost:8888/health`

### 3.2 Frontend

```bash
cd frontend
npm run dev
```

Verificar: Abrir `http://localhost:3000/login`

### 3.3 App Movil

```bash
cd mobile
npx expo start --web
```

Verificar: Abrir `http://localhost:19006`

### 3.4 Todos los Servicios (una ventana)

Windows PowerShell:
```powershell
Start-Process powershell -ArgumentList "-Command", "cd backend; .\venv\Scripts\activate; python -m uvicorn app.main:app --reload --port 8888"
Start-Process powershell -ArgumentList "-Command", "cd frontend; npm run dev"
Start-Process powershell -ArgumentList "-Command", "cd mobile; npx expo start --web"
```

---

## 4. Credenciales Iniciales

### 4.1 Base de Datos

| Campo | Valor |
|-------|-------|
| Usuario PostgreSQL | `postgres` |
| Contrasena | (configurada en instalacion) |
| Base de datos | `dla_access_enterprise` |

### 4.2 Login del ERP

| Campo | Valor |
|-------|-------|
| Email | `admin@dlaredes.com.co` |
| Contrasena | `admin123` |
| Plataforma | Web |

> Cambiar la contrasena inmediatamente despues del primer login.

---

## 5. Puertos

| Servicio | Puerto | URL |
|----------|--------|-----|
| PostgreSQL | 5432 | `localhost:5432` |
| Backend API | 8888 | `http://localhost:8888` |
| Frontend Web | 3000 | `http://localhost:3000` |
| Expo Dev | 19000 | UDP (Expo DevTools) |
| Metro Bundler | 8081 | `http://localhost:8081` |
| Expo Web | 19006 | `http://localhost:19006` |
| Redis | 6379 | `localhost:6379` (produccion) |
| RabbitMQ | 5672 | `localhost:5672` (produccion) |
| Ollama | 11434 | `localhost:11434` (opcional) |

---

## 6. Solucion de Problemas

### 6.1 Errores Comunes

| Error | Causa | Solucion |
|-------|-------|---------|
| `bcrypt incompatible` | bcrypt 5.0+ | `pip install bcrypt==4.2.1` |
| `Connection refused 5432` | PostgreSQL no corriendo | Iniciar servicio PostgreSQL |
| `trust auth failed` | pg_hba.conf mal configurado | Verificar `host all all 127.0.0.1/32 trust` |
| `ModuleNotFoundError` | Dependencias faltantes | `pip install -e .` en venv |
| `ECONNREFUSED :8888` | Backend no corriendo | Iniciar backend primero |
| `Hydration error` | Cache del browser | Limpiar cache / Hard refresh |
| `Metro bundler timeout` | Expo lento en iniciar | Esperar 30-60s, verificar memoria |
| `out of memory` en build | Poca RAM | Usar `npm run dev` en vez de `build` |

### 6.2 Limpiar Estado

```bash
# Limpiar cache de Next.js
cd frontend
Remove-Item -Recurse -Force .next

# Limpiar node_modules
npm install

# Reaplicar migraciones
cd backend
alembic downgrade base
alembic upgrade head
```

### 6.3 Verificar Instalacion

```bash
# Verificar Python
python --version  # Debe ser >= 3.11

# Verificar Node
node --version    # Debe ser >= 18

# Verificar PostgreSQL
psql -U postgres -c "SELECT version();"

# Verificar base de datos
psql -U postgres -d dla_access_enterprise -c "\dt"  # Debe listar 35 tablas

# Verificar backend
cd backend
python -c "from app.main import app; print('Backend OK')"

# Verificar frontend
cd frontend
npm run build  # Debe compilar sin errores
```

---

## 7. Estructura de la Base de Datos

Despues de aplicar las migraciones (`alembic upgrade head`), la base de datos contiene 35 tablas organizadas en:

- **Auth:** employees (central), roles, permissions, role_permissions, user_sessions, audit_logs
- **HR:** departments, job_positions, cost_centers, work_teams, employee_documents, employee_dotaciones
- **Clientes:** clients, client_contacts, client_locations, client_personas, client_projects
- **Contratos:** contracts, contract_types
- **Nomina:** payroll_periods, payroll_records, payroll_concepts
- **Turnos:** shift_templates, schedules, shifts, shift_series
- **Seguridad:** companies, branches, notifications, push_tokens
- **Geolocalizacion:** geofences, location_history
- **Acceso:** access_logs, visits, personas
