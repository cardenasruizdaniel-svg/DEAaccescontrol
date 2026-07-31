# Manual del Administrador - DLA Access Enterprise

## 1. Roles y Permisos

### 1.1 Roles Predefinidos

El sistema viene con 9 roles configurados:

| Nivel | Rol | Descripcion |
|-------|-----|-------------|
| 1 | **Super Admin** | Acceso total al sistema, gestion de usuarios y configuracion |
| 2 | **Gerencia** | Vision general de la empresa, reportes y metricas |
| 3 | **Administracion** | Gestion operativa de empleados, contratos y nomina |
| 4 | **Auditor** | Solo lectura para auditoria y revision |
| 5 | **Supervisor** | Gestion de turnos y supervision de personal |
| 6 | **Administrativo** | Tareas administrativas y documentos |
| 7 | **Medico** | Acceso a informacion medica y salud de empleados |
| 8 | **Enfermero** | Registro de atencion medica basica |
| 9 | **Cuidador** | Acceso basico desde la app movil |

### 1.2 Crear un Rol Nuevo

1. Navegue a **IAM > Roles** (`/iam/roles`)
2. Click en **"Nuevo Rol"**
3. Complete:
   - **Nombre**: identificador unico (ej: `seguridad_externo`)
   - **Nombre visible**: nombre para mostrar (ej: `Seguridad Externo`)
   - **Descripcion**: breve descripcion del rol
   - **Nivel**: jerarquia (1=mas alto, 9=mas bajo)
   - **Color**: color para la UI (ej: `#ef4444`)
4. Click en **"Guardar"**

### 1.3 Asignar Permisos

1. Seleccione el rol de la lista
2. Click en **"Permisos"**
3. Use la **matriz de permisos** para asignar acciones por modulo:
   - `create` - Crear registros
   - `read` - Consultar registros
   - `update` - Modificar registros
   - `delete` - Eliminar registros
   - `export` - Exportar datos
4. Click en **"Guardar Permisos"**

### 1.4 Modulos Disponibles

| Modulo | Descripcion |
|--------|-------------|
| `employees` | Gestion de empleados |
| `clients` | Gestion de clientes |
| `contracts` | Gestion de contratos |
| `payroll` | Nomina y liquidaciones |
| `scheduling` | Programacion de turnos |
| `geolocation` | Geolocalizacion |
| `access_control` | Control de acceso |
| `facial_recognition` | Reconocimiento facial |
| `reports` | Reportes |
| `iam` | Gestion de usuarios y permisos |
| `notifications` | Notificaciones |
| `dashboard` | Panel principal |

---

## 2. Gestion de Usuarios (Empleados con Acceso)

### 2.1 Crear un Usuario con Acceso al Sistema

1. Navegue a **Empleados** (`/employees`)
2. Cree un empleado nuevo o seleccione uno existente
3. En la vista de detalle, vaya a la pestana **"Acceso"**
4. Configure:
   - **Usuario**: username para login (unico en el sistema)
   - **Contrasena**: contrasena inicial
   - **Rol**: asigne uno de los 9 roles disponibles
   - **Acceso a plataforma**: `Web`, `App`, o `Ambas`
   - **Estado de cuenta**: `Activa`, `Suspendida`, `Bloqueada`, `Inactiva`, `Pendiente activacion`
   - **Forzar cambio de contrasena**: activar para primer login
   - **MFA**: habilitar autenticacion de dos factores
5. Click en **"Guardar Acceso"**

### 2.2 Configuracion de Acceso a Plataformas

| Opcion | Comportamiento |
|--------|---------------|
| **Web** | Solo puede acceder desde el ERP web (`localhost:3000`) |
| **App** | Solo puede acceder desde la app movil |
| **Ambas** | Acceso desde web y movil |
| **Ninguna** | Sin acceso al sistema (solo registro en base de datos) |

> El sistema valida la plataforma en el momento del login. Si un usuario configurado solo para "Web" intenta acceder desde la app movil, recibira un error 403.

### 2.3 Restablecer Contrasena

1. Seleccione el empleado
2. Vaya a **"Acceso"**
3. Click en **"Restablecer Contrasena"**
4. Ingrese la nueva contrasena
5. El empleado debera cambiarla en su proximo login si esta marcada la opcion

### 2.4 Bloquear/Desbloquear Cuenta

Las cuentas se bloquean automaticamente despues de 5 intentos fallidos durante 30 minutos.

Para desbloquear manualmente:
1. Seleccione el empleado
2. Vaya a **"Acceso"**
3. Cambie el **Estado de cuenta** a `Activa`
4. Reinicie el contador de intentos fallidos

### 2.5 Suspender una Cuenta

1. Cambie el estado a `Suspendida`
2. El empleado no podra iniciar sesion hasta que se reactive

---

## 3. Auditoria y Sesiones

### 3.1 Logs de Auditoria

Todas las acciones importantes quedan registradas:

- **Accion**: que se hizo (login, create, update, delete, etc.)
- **Modulo**: en que area del sistema
- **Empleado**: quien lo hizo
- **Valores anteriores/despues**: cambio completo (JSON)
- **Direccion IP** y **User Agent**
- **Plataforma**: web o movil
- **Estado**: exitoso o fallido

### 3.2 Gestion de Sesiones

1. Navegue a **IAM > Sesiones** via API (`/api/v1/iam/sessions`)
2. Consulte todas las sesiones activas
3. **Cerrar sesion remota**: Finalice una sesion especifica
4. **Cerrar todas las sesiones**: Finalice todas las sesiones de un empleado

### 3.3 Estadisticas del Admin

Endpoint: `GET /api/v1/iam/dashboard/stats`

Retorna:
- Total de usuarios activos
- Sesiones activas
- Intentos de login fallidos
- Acciones por modulo
- Alertas de seguridad

---

## 4. Parametrizacion de la Empresa

### 4.1 Datos de la Empresa

La empresa se configura al momento de la instalacion. Campos principales:
- **NIT**: numero de identificacion tributaria
- **Razon Social**: nombre legal
- **Direccion**: ubicacion fisica
- **Telefono, Email**: datos de contacto

### 4.2 Departamentos

Configure la estructura organizacional:

1. Cree departamentos jerarquicos (padre/hijo)
2. Asigne un gerente/encargado
3. Asocie un centro de costo
4. Los departamentos se usan en filtros de empleados y reportes

### 4.3 Centros de Costo

Defina centros de costo para contabilizacion:
- Codigo unico
- Nombre y descripcion
- Presupuesto asignado
- Jerarquia padre/hijo

### 4.4 Cargos (Puestos de Trabajo)

Configure los cargos disponibles:
- Asociados a departamento
- Rango salarial (minimo/maximo)
- Codigo unico

### 4.5 Equipos de Trabajo

Agrupe empleados en equipos:
- Lider de equipo
- Descripcion
- Asociados a departamento

---

## 5. Nomina - Parametrizacion

### 5.1 Conceptos de Nomina

Defina los conceptos de pago y deduccion:

| Tipo | Ejemplos |
|------|----------|
| **Devengo** | Salario base, horas extras diurnas/nocturnas, dominicales, auxilio transporte, prima de servicios, cesantias |
| **Deduccion** | Salud (4%), Pension (4%), retencion fuente, anticipo, embargo |
| **Parafiscal** | ARL, ICBF (3%), SENA (2%), Caja Compensacion (4%) |

### 5.2 Parametros Legales 2025

El sistema incluye los siguientes parametros preconfigurados:

| Parametro | Valor | Base Legal |
|-----------|-------|------------|
| Salario minimo (SMMLV) | $1.423.500 | Ley 2025 |
| Auxilio transporte | $206.000 | Res. DIAN |
| Hora ordinaria | 1.25x | Art. 58 CST |
| Hora nocturna | 1.35x (35%) | Art. 57 CST |
| Dominical/Festivo | 1.75x (75%) | Art. 57 CST |
| Nocturno Dominical | 2.0x (100%) | Art. 57 CST |
| Hora extra diurna | 1.25x (25%) | Art. 59 CST |
| Hora extra nocturna | 1.75x (75%) | Art. 59 CST |
| Cesantias | 8.33% | Art. 249 CST |
| Prima servicios | 8.33% | Art. 306 CST |
| Intereses cesantias | 12% | Art. 99 Ley 50/90 |
| Salud | 4% | Ley 100/93 |
| Pension | 4% | Ley 100/93 |
| ARL Nivel 1 | 0.522% | Res. 1534/2016 |
| Vacaciones | 15 dias/año | Art. 186 CST |

> Estos valores pueden actualizarse desde la configuracion o directamente en el archivo `.env` del backend.

### 5.3 Cerrar Periodo de Nomina

1. Calcule la nomina del periodo
2. Revise los registros individuales
3. Cierre el periodo (accion irreversible)
4. Los registros quedan bloqueados para edicion

---

## 6. Configuracion del Sistema

### 6.1 Variables de Entorno (`.env`)

Archivos de configuracion:
- `backend/.env` - Configuracion del backend
- `frontend/.env.local` - Configuracion del frontend

### 6.2 Seguridad

| Configuracion | Default | Descripcion |
|---------------|---------|-------------|
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 30 | Minutos de vida del token de acceso |
| `REFRESH_TOKEN_EXPIRE_DAYS` | 7 | Dias de vida del token de refresco |
| `PASSWORD_LOCKOUT_ATTEMPTS` | 5 | Intentos fallidos antes de bloqueo |
| `PASSWORD_LOCKOUT_MINUTES` | 30 | Minutos de bloqueo |
| `PASSWORD_MIN_LENGTH` | 8 | Longitud minima de contrasena |
| `PASSWORD_MAX_AGE_DAYS` | 90 | Dias antes de forzar cambio |
| `MAX_ACTIVE_SESSIONS` | 5 | Sesiones simultaneas maximas |
| `MFA_ENABLED` | true | Habilitar MFA globalmente |

### 6.3 Reconocimiento Facial

| Configuracion | Default | Descripcion |
|---------------|---------|-------------|
| `FACE_RECOGNITION_TOLERANCE` | 0.6 | Tolerancia de coincidencia (menor = mas estricto) |
| `FACE_DETECTION_MODEL` | `hog` | Modelo de deteccion (`hog` rapido, `cnn` preciso) |

### 6.4 Geolocalizacion

| Configuracion | Default | Descripcion |
|---------------|---------|-------------|
| `DEFAULT_GEOFENCE_RADIUS` | 100m | Radio por defecto de geocercas |
| `GOOGLE_MAPS_API_KEY` | vacio | API key de Google Maps |
