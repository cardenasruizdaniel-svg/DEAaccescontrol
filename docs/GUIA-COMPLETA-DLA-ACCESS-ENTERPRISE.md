# GUIA COMPLETA - DLA ACCESS ENTERPRISE

## DESARROLLADO POR DLA REDES Y SEGURIDAD

---

## 1. INTRODUCCION

### 1.1 Descripcion del Sistema

DLA Access Enterprise es un ERP Enterprise integral especializado en:

- Control de acceso biométrico del personal
- Programación inteligente de turnos y visitas
- Administración completa de clientes, IPS, hospitales, clínicas y pacientes
- Geolocalización en tiempo real con geocercas
- Reconocimiento facial con detección de vida (Liveness Detection)
- Motor de nómina colombiana conforme a legislación laboral vigente
- Dashboard ejecutivo con indicadores en tiempo real
- Asistente de inteligencia artificial
- Reportes en PDF y Excel

Este sistema está diseñado para empresas de seguridad electrónica, redes y automatización empresarial que requieren control preciso de personal operativo, gestión de turnos en múltiples sedes de clientes, y cálculo correcto de nómina colombiana con todos los factores legales vigentes.

### 1.2 Identidad Corporativa

Todo el sistema está identificado como desarrollo de **DLA Redes y Seguridad**, empresa especializada en:

- Desarrollo de Software
- Inteligencia Artificial
- Seguridad Electrónica
- Redes
- Automatización Empresarial

### 1.3 Arquitectura del Sistema

El sistema está compuesto por:

| Componente | Tecnología | Puerto |
|------------|------------|--------|
| **ERP Web Enterprise** | Next.js 14 + TypeScript + ShadCN + TailwindCSS | 3000 |
| **API REST** | FastAPI + Python 3.11 + SQLAlchemy (async) + Pydantic | 8000 |
| **Base de Datos** | PostgreSQL 16 con migraciones Alembic | 5432 |
| **Cache** | Redis 7 | 6379 |
| **Cola de Mensajes** | RabbitMQ 3 + Celery | 5672 / 15672 |
| **App Móvil** | React Native + Expo (Android + iOS) | N/A |
| **Contenedores** | Docker + Docker Compose | N/A |
| **Reverse Proxy** | Nginx | 80/443 |

---

## 2. REQUISITOS PREVIOS

### 2.1 Requisitos de Hardware

**Para servidor de producción:**

| Recurso | Mínimo | Recomendado |
|---------|--------|-------------|
| CPU | 4 núcleos | 8+ núcleos |
| RAM | 8 GB | 16 GB+ |
| Disco | 50 GB SSD | 100 GB SSD |
| Red | Conexión estable a internet | 100 Mbps+ |

**Para desarrollo:**

| Recurso | Mínimo |
|---------|--------|
| CPU | 2+ núcleos |
| RAM | 4 GB+ |
| Disco | 10 GB libres |

### 2.2 Requisitos de Software

| Software | Versión Requerida |
|----------|-------------------|
| Sistema Operativo | Windows 10/11, macOS 12+, Ubuntu 20.04+ |
| Python | 3.11 o superior |
| Node.js | 18+ (recomendado 20) |
| Docker | 24.0+ (opcional pero recomendado) |
| Docker Compose | v2.20+ |
| Git | 2.40+ |
| PostgreSQL | 16 (si no usa Docker) |
| Redis | 7 (si no usa Docker) |

### 2.3 Herramientas Recomendadas

| Categoría | Herramienta | Uso |
|-----------|-------------|-----|
| IDE | VS Code con extensiones Python, Pylance, ES7+ Snippets | Desarrollo |
| API Testing | Postman o Insomnia | Pruebas de endpoints |
| Base de Datos | DBeaver o pgAdmin 4 | Gestión de BD |
| Control de Versiones | Git + GitHub | Repositorios |

---

## 3. INSTALACION PASO A PASO

### 3.1 Opcion A: Instalacion con Docker (Recomendada)

**Paso 1: Clonar el repositorio**

```bash
git clone https://github.com/dlaredes/dla-access-enterprise.git
cd dla-access-enterprise
```

**Paso 2: Configurar variables de entorno**

```bash
cp .env.example .env
```

Editar el archivo `.env` con los valores apropiados (ver sección 6.1 para referencia completa).

**Paso 3: Levantar todos los servicios**

```bash
docker compose up -d
```

Esto levantará:

- PostgreSQL en puerto 5432
- Redis en puerto 6379
- RabbitMQ en puerto 5672 (admin en 15672)
- Backend API en puerto 8000
- Frontend Web en puerto 3000
- Celery Worker

**Paso 4: Verificar que todos los servicios estan corriendo**

```bash
docker compose ps
```

Salida esperada con todos los servicios en estado `Up`:

```
NAME                  STATUS          PORTS
dla_postgres          Up              0.0.0.0:5432->5432/tcp
dla_redis             Up              0.0.0.0:6379->6379/tcp
dla_rabbitmq          Up              0.0.0.0:5672->5672/tcp, 0.0.0.0:15672->15672/tcp
dla_backend           Up              0.0.0.0:8000->8000/tcp
dla_frontend          Up              0.0.0.0:3000->3000/tcp
dla_celery_worker     Up
```

**Paso 5: Acceder al sistema**

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| API Docs (ReDoc) | http://localhost:8000/redoc |
| RabbitMQ Admin | http://localhost:15672 (guest/guest) |

### 3.2 Opcion B: Instalacion Manual (Desarrollo)

**Paso 1: Configurar Base de Datos**

```bash
# Crear la base de datos
createdb -U postgres dla_access_enterprise

# O usar Docker solo para la base de datos
docker compose -f docker-compose.dev.yml up -d
```

**Paso 2: Configurar Backend**

```bash
cd backend

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Instalar dependencias
pip install -e ".[dev]"

# Configurar variables de entorno
cp ../.env.example ../.env
# Editar ../.env con las credenciales de BD

# Ejecutar migraciones
alembic upgrade head

# Iniciar el servidor
uvicorn app.main:app --reload --port 8000
```

**Paso 3: Configurar Frontend**

```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm run dev
```

**Paso 4: Verificar**

| Servicio | URL |
|----------|-----|
| Backend | http://localhost:8000/docs |
| Frontend | http://localhost:3000 |

---

## 4. PARAMETRIZACION DEL SISTEMA

### 4.1 Parametrizacion Inicial Obligatoria

Una vez instalado el sistema, se debe realizar la siguiente parametrización en orden:

#### 4.1.1 Empresa (Company)

Registrar la empresa principal del sistema con los siguientes datos:

| Campo | Tipo | Descripcion | Obligatorio |
|-------|------|-------------|-------------|
| NIT | Texto | Número de Identificación Tributaria | Sí |
| Nombre Comercial | Texto | Nombre que se muestra en el sistema | Sí |
| Razón Social | Texto | Nombre legal completo | Sí |
| Dirección | Texto | Dirección física de la empresa | Sí |
| Ciudad | Texto | Ciudad sede principal | Sí |
| Departamento | Texto | Departamento | Sí |
| País | Texto | País (default: Colombia) | Sí |
| Teléfono | Texto | Número telefónico | Sí |
| Email | Texto | Correo electrónico corporativo | Sí |
| Website | Texto | Sitio web (opcional) | No |
| Logo | Imagen | Logo de la empresa (PNG, fondo transparente) | Sí |
| Zona Horaria | Texto | America/Bogota (para Colombia) | Sí |
| Moneda | Texto | COP (Peso Colombiano) | Sí |

**Endpoint**: `POST /api/v1/companies`

**Ejemplo de payload:**

```json
{
  "nit": "900123456-7",
  "commercial_name": "DLA Redes y Seguridad",
  "legal_name": "DLA REDES Y SEGURIDAD S.A.S.",
  "address": "Calle 100 #15-20",
  "city": "Bogotá",
  "department": "Bogotá D.C.",
  "country": "Colombia",
  "phone": "+57 601 1234567",
  "email": "info@dlaredes.com.co",
  "website": "https://www.dlaredes.com.co",
  "timezone": "America/Bogota",
  "currency": "COP"
}
```

#### 4.1.2 Sucursales (Branches)

Registrar las sedes de la empresa:

| Campo | Tipo | Descripcion | Obligatorio |
|-------|------|-------------|-------------|
| Código | Texto | Código único de la sucursal (ej: BOG-001) | Sí |
| Nombre | Texto | Nombre de la sucursal | Sí |
| Dirección | Texto | Dirección física | Sí |
| Ciudad | Texto | Ciudad | Sí |
| Departamento | Texto | Departamento | Sí |
| Latitud | Número | Coordenada GPS latitud | Sí |
| Longitud | Número | Coordenada GPS longitud | Sí |
| Radio Geocerca | Número | Radio en metros (default 100) | Sí |
| Es Principal | Boolean | Marcar si es la sede principal | Sí |

**Endpoint**: `POST /api/v1/branches`

#### 4.1.3 Roles del Sistema

Crear los roles de usuario con sus permisos:

| Rol | Nivel | Descripcion | Permisos Principales |
|-----|-------|-------------|----------------------|
| Super Admin | 100 | Acceso total al sistema | Todos los permisos |
| Admin | 80 | Administracion general | CRUD de empleados, clientes, reportes |
| Gerente | 60 | Vista ejecutiva y reportes | Lectura general, reportes, dashboard |
| Coordinador | 40 | Gestion de empleados y turnos | Empleados, turnos, asistencia |
| Operador | 20 | Registro de accesos y turnos | Acceso, turnos, geolocalización |
| Empleado | 10 | Consulta propia | Consulta propia, perfil |

**Endpoint**: `POST /api/v1/auth/register` + asignar rol

#### 4.1.4 Usuario Administrador

Crear el primer usuario administrador:

| Campo | Valor |
|-------|-------|
| Email | admin@dlaredes.com.co |
| Username | admin |
| Password | [definir contraseña segura] |
| Nombre Completo | Administrador DLA |
| Rol | Super Admin |

**Endpoint**: `POST /api/v1/auth/register`

**Ejemplo de payload:**

```json
{
  "email": "admin@dlaredes.com.co",
  "username": "admin",
  "password": "ContraseñaSegura2024!",
  "first_name": "Administrador",
  "last_name": "DLA",
  "role_id": 1
}
```

### 4.2 Parametrizacion de Recursos Humanos

#### 4.2.1 Departamentos

Crear la estructura organizacional:

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| Código | Texto | Código único del departamento |
| Nombre | Texto | Nombre del departamento |
| Centro de Costo | Texto | Código del centro de costos asociado |
| Jefe de Departamento | Empleado | Empleado responsable |

**Ejemplo de estructura jerárquica:**

```
- Dirección General (DIR-001)
  ├── Operaciones (OPE-001)
  │   ├── Seguridad (SEG-001)
  │   └── Monitoreo (MON-001)
  ├── Administración (ADM-001)
  │   ├── Contabilidad (CON-001)
  │   └── Talento Humano (THU-001)
  └── Tecnología (TEC-001)
      ├── Desarrollo (DES-001)
      └── Infraestructura (INF-001)
```

**Endpoint**: `POST /api/v1/departments`

#### 4.2.2 Cargos (Job Positions)

Registrar los cargos disponibles:

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| Código | Texto | Código único del cargo |
| Nombre | Texto | Nombre del cargo |
| Salario Mínimo | Número | Salario mínimo del rango |
| Salario Máximo | Número | Salario máximo del rango |
| Departamento | Departamento | Departamento al que pertenece |

**Ejemplo:**

| Codigo | Nombre | Salario Min | Salario Max | Departamento |
|--------|--------|-------------|-------------|--------------|
| DIR-001 | Director General | $5,000,000 | $15,000,000 | Dirección General |
| COO-001 | Coordinador de Operaciones | $3,000,000 | $6,000,000 | Operaciones |
| ATE-001 | Asistente de Seguridad | $1,300,000 | $2,500,000 | Seguridad |
| MON-001 | Monitor de CCTV | $1,300,000 | $2,000,000 | Monitoreo |

**Endpoint**: `POST /api/v1/job-positions`

#### 4.2.3 Centros de Costos

Registrar los centros de costos para contabilización:

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| Código | Texto | Código único del centro de costos |
| Nombre | Texto | Nombre del centro de costos |
| Presupuesto | Número | Presupuesto asignado |
| Centro Padre | Centro | Centro padre (para jerarquía) |

**Endpoint**: `POST /api/v1/cost-centers`

#### 4.2.4 Equipos de Trabajo

Crear los equipos de trabajo:

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| Nombre | Texto | Nombre del equipo |
| Descripción | Texto | Descripción del equipo |
| Líder | Empleado | Empleado líder del equipo |

**Endpoint**: `POST /api/v1/teams`

### 4.3 Parametrizacion de Contratos

#### 4.3.1 Tipos de Contrato

El sistema viene preconfigurado con los tipos de contrato de la legislación colombiana:

| Tipo | Codigo | Descripcion |
|------|--------|-------------|
| Indefinido | IND | Contrato a término indefinido |
| Término Fijo | FIJ | Contrato a término fijo (máx 3 años) |
| Obra/Labor | OBR | Contrato por obra o labor específica |
| Prestación de Servicios | PSR | Contrato de prestación de servicios |
| Aprendiz SENA | SENA | Contrato de aprendizaje |
| Medio Tiempo | MTI | Contrato a medio tiempo |
| Tiempo Parcial | TPA | Contrato a tiempo parcial |
| Por Horas | HOR | Contrato por horas |
| Por Turnos | TUR | Contrato por turnos |
| Especial | ESP | Contrato especial |

#### 4.3.2 Configuracion Salarial

Parametrizar los valores para la nómina:

| Parametro | Valor | Descripcion |
|-----------|-------|-------------|
| Salario Minimo | $1,300,000 | Salario minimo legal vigente (2024) |
| Auxilio Transporte | $200,000 | Auxilio de transporte |
| Horas Extra Diurna | 125% | Recargo hora extra diurna (salario/240 x 1.25) |
| Horas Extra Nocturna | 175% | Recargo hora extra nocturna (salario/240 x 1.75) |
| Dominical/Festivo | 200% | Recargo domingo/festivo (salario/240 x 2.0) |
| Nocturno Dominical | 250% | Recargo nocturno dominical (salario/240 x 2.5) |
| Cesantías | 8.33% | Cesantías anuales |
| Prima Servicios | 8.33% | Prima de servicios semestral |
| Intereses Cesantías | 12% | Intereses sobre cesantías acumuladas |
| Salud (trabajador) | 4% | Deducción salud trabajador |
| Pension (trabajador) | 4% | Deducción pensión trabajador |
| Salud (empleador) | 8.5% | Aporte empleador salud |
| Pension (empleador) | 12% | Aporte empleador pensión |
| ICBF | 3% | Instituto Colombiano Bienestar Familiar |
| SENA | 2% | Servicio Nacional de Aprendizaje |
| Caja Compensación | 4% | Caja de compensación familiar |
| Fondo Solidaridad | 1% | Si salario > 4 SMMLV |

**Endpoint**: `POST /api/v1/settings/payroll-parameters`

### 4.4 Parametrizacion de Clientes

#### 4.4.1 Tipos de Cliente

| Tipo | Descripcion |
|------|-------------|
| Empresa | Empresa general |
| IPS | Institución Prestadora de Servicios de Salud |
| Hospital | Hospital |
| Clínica | Clínica |
| Proyecto | Proyecto específico |

#### 4.4.2 Datos Requeridos por Cliente

Para cada cliente se debe registrar:

| Campo | Tipo | Descripcion | Obligatorio |
|-------|------|-------------|-------------|
| NIT | Texto | Número de Identificación Tributaria | Sí |
| Razón Social | Texto | Nombre legal | Sí |
| Tipo Cliente | Enum | Empresa, IPS, Hospital, Clínica, Proyecto | Sí |
| Dirección | Texto | Dirección física | Sí |
| Latitud | Número | Coordenada GPS latitud | Sí |
| Longitud | Número | Coordenada GPS longitud | Sí |
| Radio Geocerca | Número | Radio en metros | Sí |
| Contactos | Lista | Contactos responsables del cliente | Sí |
| Ubicaciones | Lista | Ubicaciones físicas con coordenadas | Sí |
| Horarios | Lista | Horarios de atención | Sí |
| Documentos | Lista | Documentos adjuntos | No |

**Endpoint**: `POST /api/v1/clients`

### 4.5 Parametrizacion de Geocercas

#### 4.5.1 Crear Geocercas

Para cada punto de control se debe crear una geocerca:

| Campo | Tipo | Descripcion | Ejemplo |
|-------|------|-------------|---------|
| Nombre | Texto | Nombre del punto | "Sede Principal Bogotá" |
| Latitud | Número | Latitud del centro | 4.6097 |
| Longitud | Número | Longitud del centro | -74.0817 |
| Radio | Número | Distancia en metros | 100 |
| Forma | Enum | Circular o Poligonal | Circular |
| Alertas | Enum | Al entrar, al salir, o ambas | Ambas |
| Color | Texto | Color para visualización en mapa | "#FF0000" |

**Endpoint**: `POST /api/v1/geolocation/geofences`

#### 4.5.2 Validaciones de Geocerca

El sistema valida automáticamente:

1. El empleado está dentro del perímetro permitido (fórmula Haversine)
2. La distancia exacta desde el centro de la geocerca en metros
3. Detecta intentos de GPS falso (mock location)
4. Registra la dirección aproximada mediante geocoding inverso

### 4.6 Parametrizacion de Reconocimiento Facial

#### 4.6.1 Configuracion del Motor

| Parametro | Default | Descripcion |
|-----------|---------|-------------|
| Tolerancia | 0.6 | Menor = más estricto (rango 0.0 - 1.0) |
| Modelo de Detección | "hog" | "hog" (CPU) o "cnn" (GPU) |
| Liveness Detection | true | Activar para prevenir fraude |
| Anti-Fraude | true | Detectar mock location + fotos manipuladas |

#### 4.6.2 Registro de Empleados

Cada empleado debe seguir este proceso de registro:

1. Tomar fotografía frontal con buena iluminación
2. Sin accesorios (lentes, gorras) si es posible
3. El sistema extrae encoding facial de 128 dimensiones
4. Se almacena de forma segura en la base de datos
5. Se valida con liveness detection

**Endpoint**: `POST /api/v1/facial-recognition/register`

---

## 5. FUNCIONAMIENTO DEL SISTEMA

### 5.1 Flujo de Trabajo Diario

#### 5.1.1 Flujo de Entrada (Check-in)

```
1. El trabajador abre la APP móvil
2. La APP solicita permisos (GPS, cámara)
3. La APP captura la ubicación GPS actual
4. La APP valida si está dentro de la geocerca
5. La APP captura selfie con cámara frontal
6. La APP ejecuta liveness detection
7. La APP ejecuta face recognition contra el empleado registrado
8. La APP valida el turno programado
9. Si todo es correcto, registra la entrada con:
   - Timestamp exacto
   - Coordenadas GPS + precisión
   - selfie_url + face_match_score
   - Verificación de geocerca
   - Datos del dispositivo (modelo, OS, batería, conexión)
   - Si es offline, guarda localmente para sincronizar después
10. Si falla alguna validación, muestra alerta y rechaza entrada
```

#### 5.1.2 Flujo de Salida (Check-out)

```
1. El trabajador abre la APP al finalizar jornada
2. Se captura nueva selfie y ubicación
3. Se calculan automáticamente:
   - Horas trabajadas (diferencia entrada-salida)
   - Horas extras (si trabajó más de 8 horas)
   - Horas nocturnas (21:00 - 06:00)
4. El trabajador puede agregar observaciones
5. Se registra la salida
```

#### 5.1.3 Validaciones de Seguridad en Tiempo Real

Para cada registro de acceso, el sistema verifica:

| # | Validacion | Metodo | Descripcion |
|---|-----------|--------|-------------|
| 1 | Geocerca | Haversine | ¿Está dentro del perímetro? |
| 2 | Rostro | face_recognition | ¿La selfie coincide con el empleado? |
| 3 | Liveness | Anti-spoofing | ¿Es una persona real o una foto? |
| 4 | GPS Falso | Mock detection | ¿Está usando ubicación simulada? |
| 5 | Turno | Programación | ¿Tiene turno programado para hoy? |
| 6 | Dispositivo | Hardware ID | ¿Es un dispositivo registrado? |
| 7 | Batería | Battery API | Nivel de batería del dispositivo |
| 8 | Conexión | Network API | Tipo de conexión (WiFi/Mobile/Offline) |

### 5.2 Motor de Nómina Colombiana

#### 5.2.1 Calculo Automatico

El motor de nómina calcula automáticamente conforme a la legislación colombiana:

**DEVENGADOS:**

| Concepto | Formula | Ejemplo (SMMLV $1,300,000) |
|----------|---------|---------------------------|
| Salario base mensual | Salario contratado | $1,300,000 |
| Auxilio transporte | Aplica si salario ≤ 2 SMMLV | $200,000 |
| Horas extras diurnas | (Salario/240) × 1.25 × horas | $6,771/hora |
| Horas extras nocturnas | (Salario/240) × 1.75 × horas | $9,458/hora |
| Recargos dominicales | (Salario/240) × 2.0 × horas | $10,833/hora |
| Recargos nocturnos dominicales | (Salario/240) × 2.5 × horas | $13,542/hora |
| Prima de servicios | (Promedio semestral) × 8.33% | Cálculo semestral |
| Cesantías | (Promedio anual) × 8.33% | Cálculo anual |
| Intereses cesantías | Cesantías acumuladas × 12% | Cálculo mensual |
| Vacaciones | 15 días por año trabajado | Proporcional |

**DEDUCCIONES:**

| Concepto | Porcentaje | Base |
|----------|------------|------|
| Salud trabajador | 4% | Ingreso base de cotización |
| Pensión trabajador | 4% | Ingreso base de cotización |
| Fondo solidaridad | 1% | Si salario > 4 SMMLV |
| Retención en la fuente | Tabla DIAN | Sobre exento de retención |
| Embargos judiciales | Variable | Porcentaje del salario |
| Libranzas | Variable | Cuota fija o porcentaje |

**APORTES EMPLEADOR:**

| Concepto | Porcentaje | Base |
|----------|------------|------|
| Salud empleador | 8.5% | Ingreso base de cotización |
| Pensión empleador | 12% | Ingreso base de cotización |
| ARL | 0.522% - 5.93% | Ingreso base de cotización (según riesgo) |
| ICBF | 3% | Ingreso base de cotización |
| SENA | 2% | Ingreso base de cotización |
| Caja compensación | 4% | Ingreso base de cotización |

#### 5.2.2 Periodo de Nómina

Para cada periodo se debe:

1. Crear el periodo (nombre, fechas, fecha de pago)
2. Calcular nómina por empleado
3. Revisar los cálculos
4. Cerrar el periodo (genera desprendibles)
5. Exportar reportes en Excel

**Endpoint para cálculo**: `POST /api/v1/payroll/calculate`

**Ejemplo de payload:**

```json
{
  "period_id": 1,
  "employee_ids": [1, 2, 3],
  "include_transportation_assistance": true,
  "include_overtime": true,
  "include_night_shift": true
}
```

### 5.3 Dashboard Ejecutivo

El dashboard muestra en tiempo real:

| Seccion | Metricas | Descripcion |
|---------|----------|-------------|
| **Empleados** | Total activos, en turno, ausentes, retardos | Resumen del estado del personal |
| **Horas** | Total trabajadas, horas extra, promedio/empleado | Productividad horaria |
| **Financiero** | Costo nómina actual, costo promedio/empleado | Impacto financiero |
| **Productividad** | Turnos programados vs completados, tasa cumplimiento | Eficiencia operativa |
| **Actividad** | Últimos registros de acceso | Eventos recientes del sistema |

**Endpoint**: `GET /api/v1/dashboard`

### 5.4 Programación de Turnos

#### 5.4.1 Crear Programación

1. Crear schedule (programación) con fechas
2. Agregar turnos individuales:

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| Empleado | Empleado | Empleado asignado al turno |
| Fecha | Fecha | Fecha del turno |
| Hora Inicio | Hora | Hora de inicio del turno |
| Hora Fin | Hora | Hora de fin del turno |
| Descanso | Número | Tiempo de descanso en minutos |
| Prioridad | Enum | Baja, Normal, Alta, Urgente |
| Cliente | Cliente | Cliente/Proyecto asociado |
| Checklist | Lista | Lista de tareas (opcional) |

**Endpoint**: `POST /api/v1/scheduling/shifts`

#### 5.4.2 Calendario Visual

El sistema muestra un calendario tipo Outlook con:

- Vista diaria, semanal, mensual
- Colores por estado del turno:
  - **Verde**: Turno completado
  - **Azul**: Turno en curso
  - **Naranja**: Turno programado
  - **Rojo**: Turno cancelado
- Drag & drop para reasignar
- Notificaciones de cambios

**Endpoint**: `GET /api/v1/scheduling/calendar`

### 5.5 Geolocalización y Mapas

#### 5.5.1 Mapa en Tiempo Real

- Ubicación de todos los empleados activos
- Círculos de geocercas visibles
- Actualización automática cada 30 segundos
- Click en empleado para ver detalles (nombre, turno, cliente, última ubicación)

**Endpoint**: `GET /api/v1/geolocation/active-map`

#### 5.5.2 Historial de Rutas

- Recorrido completo por día
- Distancia total en km
- Tiempo total de desplazamiento
- Puntos de parada
- Exportar ruta en formato GPX/KML

**Endpoint**: `GET /api/v1/geolocation/location/employee/{id}/history`

### 5.6 Reportes Disponibles

| Reporte | Formato | Contenido |
|---------|---------|-----------|
| Nómina por período | PDF/Excel | Desglose completo de nómina por empleado |
| Asistencia | PDF/Excel | Registro de entrada/salida por empleado |
| Productividad | PDF/Excel | Métricas de cumplimiento de turnos |
| Empleados | Excel | Listado completo del personal con datos |
| Clientes | Excel | Directorio de clientes y ubicaciones |
| Geolocalización | PDF/Excel | Historial de ubicaciones por empleado |
| Auditoría | Excel | Logs de actividad del sistema |
| Turnos | PDF/Excel | Programación de turnos por período |
| Horas Extra | PDF/Excel | Detalle de horas extras trabajadas |
| Aportes Parafiscales | Excel | Desglose de aportes empleador |

**Endpoint**: `POST /api/v1/reports/generate`

**Ejemplo de payload para reporte de asistencia:**

```json
{
  "report_type": "attendance",
  "start_date": "2024-01-01",
  "end_date": "2024-01-31",
  "employee_ids": [1, 2, 3],
  "format": "pdf",
  "include_photos": true
}
```

### 5.7 Asistente de Inteligencia Artificial

El asistente IA puede:

| Funcion | Ejemplo de Consulta | Descripcion |
|---------|---------------------|-------------|
| Buscar empleados | "Buscar empleado Juan Pérez" | Búsqueda semántica de personal |
| Analizar productividad | "¿Cómo está la productividad este mes?" | Análisis de métricas |
| Detectar anomalías | "¿Hay empleados con frecuente impuntualidad?" | Detección de patrones |
| Predecir ausencias | "¿Qué empleados podrían faltar mañana?" | Predicción basada en historial |
| Optimizar rutas | "Optimizar rutas de campo" | Algoritmos de optimización |
| Generar informes | "Resumir nómina del mes de enero" | Generación de resúmenes |
| Análisis de costos | "¿Cuál es el costo promedio por empleado?" | Análisis financiero |
| Recomendaciones | "Recomendar turnos para la próxima semana" | Sugerencias inteligentes |

**Endpoint**: `POST /api/v1/ai/query`

**Ejemplo de payload:**

```json
{
  "query": "¿Cuántos empleados tienen turnos programados para mañana?",
  "context": "dashboard",
  "company_id": 1
}
```

---

## 6. CONFIGURACION AVANZADA

### 6.1 Variables de Entorno

| Variable | Descripcion | Default |
|----------|-------------|---------|
| DATABASE_URL | URL de conexión PostgreSQL | `postgresql+asyncpg://dla:dla_password@localhost:5432/dla_access_enterprise` |
| REDIS_URL | URL de Redis | `redis://localhost:6379/0` |
| SECRET_KEY | Clave secreta JWT | [cambiar en producción] |
| ACCESS_TOKEN_EXPIRE_MINUTES | Duración access token | 30 |
| REFRESH_TOKEN_EXPIRE_DAYS | Duración refresh token | 7 |
| CORS_ORIGINS | Orígenes permitidos | `["http://localhost:3000"]` |
| GOOGLE_MAPS_API_KEY | API Key Google Maps | [requerido para mapas] |
| FACE_RECOGNITION_TOLERANCE | Tolerancia facial | 0.6 |
| MINIMUM_WAGE | Salario mínimo | 1300000 |
| TRANSPORTATION_ASSISTANCE | Auxilio transporte | 200000 |
| RABBITMQ_URL | URL de RabbitMQ | `amqp://guest:guest@localhost:5672/` |
| CELERY_BROKER_URL | URL del broker Celery | `redis://localhost:6379/1` |
| CELERY_RESULT_BACKEND | Backend de resultados Celery | `redis://localhost:6379/2` |
| SMTP_HOST | Servidor de correo | [configurar para notificaciones] |
| SMTP_PORT | Puerto SMTP | 587 |
| SMTP_USER | Usuario SMTP | [configurar] |
| SMTP_PASSWORD | Contraseña SMTP | [configurar] |

### 6.2 Seguridad

#### 6.2.1 Autenticación

| Mecanismo | Configuracion | Descripcion |
|-----------|---------------|-------------|
| JWT Access Token | 30 minutos | Token de acceso de corta duración |
| JWT Refresh Token | 7 días | Token de renovación |
| MFA (TOTP) | Opcional por usuario | Autenticación de dos factores |
| Bloqueo de cuenta | 5 intentos fallidos | Bloqueo temporal por intentos fallidos |
| Sesiones concurrentes | Controladas | Limite de sesiones activas por usuario |

#### 6.2.2 Autorizacion (RBAC)

Cada rol tiene permisos específicos por módulo:

| Modulo | Permisos Disponibles |
|--------|---------------------|
| auth | create, read, update, delete |
| employees | create, read, update, delete |
| contracts | create, read, update, terminate |
| payroll | create, read, calculate, close |
| clients | create, read, update |
| scheduling | create, read, update |
| reports | read, export |
| settings | read, update |
| geolocation | create, read, update |
| facial-recognition | register, verify, liveness |

#### 6.2.3 Cifrado

| Componente | Metodo | Descripcion |
|------------|--------|-------------|
| Contraseñas | bcrypt con salt | Hash seguro de contraseñas |
| Datos sensibles | AES-256-GCM | Cifrado simétrico de datos |
| Comunicación | TLS 1.3 | Transporte seguro |
| Tokens | HS256 | Firma HMAC-SHA256 |

### 6.3 Rendimiento

#### 6.3.1 Base de Datos

| Configuracion | Valor | Descripcion |
|---------------|-------|-------------|
| Pool de conexiones | 20 | Conexiones máximas simultáneas |
| Índices | Automáticos | En todas las columnas de búsqueda |
| Paginación | 100 elementos | Máximo por página |
| Soft delete | Habilitado | No eliminación física de registros |
| Timeout de consulta | 30 segundos | Tiempo máximo de ejecución |

#### 6.3.2 Cache

| Configuracion | Valor | Descripcion |
|---------------|-------|-------------|
| TTL | 300 segundos | Tiempo de vida de cache |
| Invalidación | Por patrón | Eliminación selectiva |
| Sesiones | Redis | Almacenamiento de sesiones activas |

### 6.4 Backups

#### 6.4.1 Backup de PostgreSQL

**Backup manual:**

```bash
docker exec dla_postgres pg_dump -U dla dla_access_enterprise > backup_$(date +%Y%m%d).sql
```

**Restaurar backup:**

```bash
cat backup_20240101.sql | docker exec -i dla_postgres psql -U dla -d dla_access_enterprise
```

**Backup con compresión:**

```bash
docker exec dla_postgres pg_dump -U dla dla_access_enterprise | gzip > backup_$(date +%Y%m%d).sql.gz
```

**Restaurar desde compresión:**

```bash
gunzip -c backup_20240101.sql.gz | docker exec -i dla_postgres psql -U dla -d dla_access_enterprise
```

#### 6.4.2 Backup de Redis

```bash
docker exec dla_redis redis-cli BGSAVE
docker cp dla_redis:/data/dump.rdb ./redis_backup_$(date +%Y%m%d).rdb
```

#### 6.4.3 Backup Automatizado (Cron)

```bash
# Agregar al crontab (Linux/Mac)
0 2 * * * /path/to/scripts/backup.sh
```

Script de backup automático:

```bash
#!/bin/bash
BACKUP_DIR="/backups/dla"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup PostgreSQL
docker exec dla_postgres pg_dump -U dla dla_access_enterprise | gzip > "$BACKUP_DIR/pg_$DATE.sql.gz"

# Backup Redis
docker exec dla_redis redis-cli BGSAVE
docker cp dla_redis:/data/dump.rdb "$BACKUP_DIR/redis_$DATE.rdb"

# Eliminar backups mayores a 30 días
find $BACKUP_DIR -mtime +30 -delete
```

---

## 7. API REST - ENDPOINTS PRINCIPALES

### 7.1 Autenticacion

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| POST | /api/v1/auth/login | Iniciar sesion | No |
| POST | /api/v1/auth/register | Registrar usuario | Admin |
| POST | /api/v1/auth/refresh | Refrescar token | Refresh Token |
| POST | /api/v1/auth/logout | Cerrar sesion | Sí |
| POST | /api/v1/auth/mfa/enable | Activar MFA | Sí |
| POST | /api/v1/auth/mfa/verify | Verificar MFA | Sí |
| GET | /api/v1/auth/me | Obtener usuario actual | Sí |

### 7.2 Empleados

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| POST | /api/v1/employees | Crear empleado | Admin |
| GET | /api/v1/employees | Listar empleados | Admin |
| GET | /api/v1/employees/{id} | Obtener empleado | Admin |
| PUT | /api/v1/employees/{id} | Actualizar empleado | Admin |
| GET | /api/v1/employees/{id}/documents | Documentos del empleado | Admin |
| POST | /api/v1/employees/{id}/documents | Agregar documento | Admin |
| GET | /api/v1/employees/stats/summary | Estadisticas | Admin |

### 7.3 Contratos

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| POST | /api/v1/contracts | Crear contrato | Admin |
| GET | /api/v1/contracts | Listar contratos | Admin |
| GET | /api/v1/contracts/types | Tipos de contrato | Admin |
| GET | /api/v1/contracts/{id} | Obtener contrato | Admin |
| POST | /api/v1/contracts/{id}/terminate | Terminar contrato | Admin |

### 7.4 Nomina

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| POST | /api/v1/payroll/periods | Crear periodo | Admin |
| GET | /api/v1/payroll/periods | Listar periodos | Admin |
| GET | /api/v1/payroll/periods/{id} | Obtener periodo | Admin |
| POST | /api/v1/payroll/calculate | Calcular nomina | Admin |
| GET | /api/v1/payroll/periods/{id}/records | Registros del periodo | Admin |
| POST | /api/v1/payroll/periods/{id}/close | Cerrar periodo | Admin |

### 7.5 Clientes

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| POST | /api/v1/clients | Crear cliente | Admin |
| GET | /api/v1/clients | Listar clientes | Admin |
| GET | /api/v1/clients/{id} | Obtener cliente | Admin |
| PUT | /api/v1/clients/{id} | Actualizar cliente | Admin |
| POST | /api/v1/clients/{id}/patients | Crear paciente | Admin |
| GET | /api/v1/clients/{id}/patients | Listar pacientes | Admin |
| POST | /api/v1/clients/{id}/projects | Crear proyecto | Admin |
| POST | /api/v1/clients/{id}/contacts | Agregar contacto | Admin |
| POST | /api/v1/clients/{id}/locations | Agregar ubicacion | Admin |

### 7.6 Programacion

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| POST | /api/v1/scheduling/schedules | Crear programacion | Admin |
| GET | /api/v1/scheduling/schedules | Listar programaciones | Admin |
| POST | /api/v1/scheduling/shifts | Crear turno | Admin |
| GET | /api/v1/scheduling/schedules/{id}/shifts | Turnos de programacion | Admin |
| GET | /api/v1/scheduling/employee/{id}/shifts | Turnos de empleado | Admin |
| GET | /api/v1/scheduling/calendar | Vista calendario | Admin |
| PUT | /api/v1/scheduling/shifts/{id}/status | Actualizar estado | Admin |
| GET | /api/v1/scheduling/daily-summary | Resumen diario | Admin |

### 7.7 Geolocalizacion

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| POST | /api/v1/geolocation/geofences | Crear geocerca | Admin |
| GET | /api/v1/geolocation/geofences | Listar geocercas | Admin |
| PUT | /api/v1/geolocation/geofences/{id} | Actualizar geocerca | Admin |
| POST | /api/v1/geolocation/location | Registrar ubicacion | Sí |
| GET | /api/v1/geolocation/location/employee/{id} | Ubicacion actual | Admin |
| GET | /api/v1/geolocation/location/employee/{id}/history | Historial ubicacion | Admin |
| GET | /api/v1/geolocation/active-map | Mapa empleados activos | Admin |
| POST | /api/v1/geolocation/route/calculate | Calcular ruta | Admin |

### 7.8 Control de Acceso

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| POST | /api/v1/access/entry | Registrar entrada | Sí |
| POST | /api/v1/access/exit | Registrar salida | Sí |
| GET | /api/v1/access/records | Listar registros | Admin |
| GET | /api/v1/access/history/{employee_id} | Historial empleado | Admin |
| GET | /api/v1/access/attendance/{date} | Asistencia del dia | Admin |

### 7.9 Reconocimiento Facial

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| POST | /api/v1/facial-recognition/register | Registrar rostro | Admin |
| POST | /api/v1/facial-recognition/verify | Verificar rostro | Sí |
| POST | /api/v1/facial-recognition/liveness | Deteccion de vida | Sí |

### 7.10 Dashboard

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| GET | /api/v1/dashboard | Dashboard ejecutivo | Admin |
| GET | /api/v1/dashboard/employee-status | Estado empleados | Admin |
| GET | /api/v1/dashboard/recent-activity | Actividad reciente | Admin |
| GET | /api/v1/dashboard/hourly-trend | Tendencia por hora | Admin |

### 7.11 Reportes

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| POST | /api/v1/reports/generate | Generar reporte | Admin |
| POST | /api/v1/reports/attendance | Reporte asistencia | Admin |
| POST | /api/v1/reports/productivity | Reporte productividad | Admin |
| POST | /api/v1/reports/export/excel | Exportar a Excel | Admin |

### 7.12 IA

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| POST | /api/v1/ai/query | Consulta al asistente | Admin |
| GET | /api/v1/ai/insights/{company_id} | Insights de la empresa | Admin |
| POST | /api/v1/ai/search-employees | Buscar empleados con IA | Admin |

---

## 8. MANTENIMIENTO

### 8.1 Actualizaciones

**Backend:**

```bash
cd backend
git pull
pip install -e ".[dev]"
alembic upgrade head
```

**Frontend:**

```bash
cd frontend
git pull
npm install
npm run build
```

**Docker (actualización completa):**

```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

### 8.2 Monitoreo

| Recurso | URL / Comando |
|---------|---------------|
| Swagger UI | http://localhost:8000/docs |
| Health Check | http://localhost:8000/health |
| Docker Stats | `docker compose stats` |
| Logs Backend | `docker compose logs -f backend` |
| Logs Frontend | `docker compose logs -f frontend` |
| Logs PostgreSQL | `docker compose logs -f postgres` |
| Logs Redis | `docker compose logs -f redis` |
| Logs Celery | `docker compose logs -f celery_worker` |

### 8.3 Solucion de Problemas

| Problema | Causa | Solucion |
|----------|-------|----------|
| BD no conecta | PostgreSQL apagado | `docker compose ps postgres` y reiniciar si es necesario |
| Redis no conecta | Redis apagado | `redis-cli ping` y reiniciar servicio |
| Migraciones fallan | Permisos de BD o esquema desactualizado | Verificar permisos y ejecutar `alembic upgrade head` |
| API 401 Unauthorized | Token expirado o inválido | Verificar token JWT y usar endpoint de refresh |
| GPS no funciona | Permisos de ubicación deshabilitados | Verificar permisos de ubicación en dispositivo móvil |
| Camara no funciona | Permisos de cámara deshabilitados | Verificar permisos de cámara en dispositivo móvil |
| Frontend no carga | Node modules desactualizados | Ejecutar `npm install` y reiniciar |
| Celery no procesa tareas | RabbitMQ o Redis apagado | Verificar servicios dependientes |
| Error 500 en API | Excepción no controlada | Revisar logs del backend con `docker compose logs backend` |
| Puerto en uso | Otro proceso usando el puerto | Identificar proceso y detener, o cambiar puerto |

### 8.4 Logs del Sistema

**Ubicación de logs:**

- Backend: stdout/stderr (capturado por Docker o consola)
- Frontend: consola del navegador
- PostgreSQL: `docker compose logs postgres`
- Redis: `docker compose logs redis`
- RabbitMQ: http://localhost:15672 (pestaña "Queues" y "Connections")
- Celery: `docker compose logs celery_worker`

**Nivel de log configurable:**

| Variable | Valores | Default |
|----------|---------|---------|
| LOG_LEVEL | DEBUG, INFO, WARNING, ERROR, CRITICAL | INFO |
| LOG_FORMAT | text, json | text |

---

## 9. CONTACTO SOPORTE

**DLA Redes y Seguridad**

| Canal | Direccion |
|-------|-----------|
| Email Soporte | soporte@dlaredes.com.co |
| Email Desarrollo | dev@dlaredes.com.co |
| Sitio Web | www.dlaredes.com.co |

---

*Documento generado para DLA Access Enterprise v1.0 - Todos los derechos reservados.*
*DLA Redes y Seguridad - Desarrollo de Software, Inteligencia Artificial, Seguridad Electrónica, Redes y Automatización Empresarial.*
