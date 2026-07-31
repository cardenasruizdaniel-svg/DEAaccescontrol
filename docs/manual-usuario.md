# Manual del Usuario - DLA Access Enterprise

## 1. Inicio de Sesion

1. Navegue a `http://localhost:3000/login`
2. Ingrese su **correo electronico** y **contrasena**
3. Si tiene MFA habilitado, ingrese el codigo de su aplicacion autenticadora
4. Si es su primer inicio de sesion, sera redirigido para cambiar su contrasena y completar su perfil

### Credenciales por defecto
| Campo | Valor |
|-------|-------|
| Email | `admin@dlaredes.com.co` |
| Contrasena | `admin123` |

> Cambie la contrasena inmediatamente despues del primer ingreso.

---

## 2. Dashboard

Al iniciar sesion, se muestra el panel principal con:

- **Resumen de empleados**: total, activos, inactivos
- **Acciones rapidas**: acceso rapido a modulos frecuentes
- **Notificaciones**: avisos importantes del sistema

---

## 3. Modulos Disponibles

### 3.1 Empleados (`/employees`)

Gestion del directorio de empleados de la empresa.

| Accion | Descripcion |
|--------|-------------|
| **Crear empleado** | Click en "Nuevo Empleado" para registrar un nuevo empleado con datos personales, de contacto y laborales |
| **Buscar** | Use la barra de busqueda por nombre, documento o codigo |
| **Filtros** | Filtre por departamento, estado o cargo |
| **Ver detalle** | Click en un empleado para ver su ficha completa |
| **Editar** | Click en "Editar" en la vista de detalle |
| **Documentos** | Adjunte y gestione documentos del empleado (contratos, certificados, etc.) |
| **Dotaciones** | Registre equipamiento entregado al empleado |
| **Acceso al sistema** | Configure usuario, contrasena, rol y acceso a plataformas (Super Admin) |

### 3.2 Clientes (`/clients`)

Directorio de clientes de la empresa de seguridad.

| Accion | Descripcion |
|--------|-------------|
| **Crear cliente** | Registre un nuevo cliente con tipo, NIT/Razon social, datos de contacto |
| **Contactos** | Agultiple personas de contacto por cliente |
| **Ubicaciones** | Registre las direcciones/ubicaciones del cliente |
| **Personas** | Gestione las personas asociadas al cliente (beneficiarios, vigilados, etc.) |
| **Proyectos** | Asocie proyectos al cliente |

### 3.3 Contratos (`/contracts`)

Gestion de contratos laborales.

| Accion | Descripcion |
|--------|-------------|
| **Crear contrato** | Asocie un empleado a un contrato con tipo, fechas, salario y terminos |
| **Tipos de contrato** | Defina tipos: termino fijo, termino indefinido, obra/labor, prestacion servicios |
| **Terminar contrato** | Registre la finalizacion con fecha, motivo y tipo de terminacion |
| **Filtros** | Busque por empleado, estado (activo/terminado/vencido), tipo |

### 3.4 Nomina (`/payroll`)

Gestion de nomina colombiana con calculo automatico segun legislacion vigente.

| Accion | Descripcion |
|--------|-------------|
| **Periodo de nomina** | Cree periodos quincenales o mensuales |
| **Calcular nomina** | Ejecute el calculo automatico para todos los empleados activos |
| **Conceptos** | Defina conceptos de pago (salario base, horas extras, deducciones, auxilios) |
| **Cerrar periodo** | Cierre definitivo del periodo de nomina |
| **Ver registros** | Consulte los registros individuales de nomina por empleado |

**Leyes colombianas aplicadas automaticamente:**
- Ley 100/93: Salud (4%), Pension (4%)
- Res. 1534/2016: ARL (0.522% Nivel 1)
- Art. 57 CST: Recargo nocturno (35%), dominical/festivo (75%)
- Art. 58 CST: Hora ordinaria (1.25x)
- Art. 59 CST: Horas extras segun tipo
- Art. 249 CST: Cesantias (8.33%)
- Art. 306 CST: Prima de servicios (8.33%)
- Ley 50/90 Art. 99: Intereses de cesantias (12%)

### 3.5 Programacion (`/scheduling`)

Programacion de turnos y cuadrantes de vigilancia.

| Accion | Descripcion |
|--------|-------------|
| **Plantillas** | Cree plantillas de turno reutilizables (horarios predefinidos) |
| **Programacion** | Cree programas que agrupan turnos por periodo |
| **Turnos** | Asigne turnos individuales a empleados con fecha, hora inicio/fin y ubicacion |
| **Calendario** | Vista calendario de todos los turnos programados |
| **Resumen diario** | Consulte el resumen de turnos para una fecha especifica |
| **Series** | Cree series recurrentes (ej: lunes a viernes 6am-2pm) |
| **Validacion** | El sistema detecta automaticamente conflictos de horario |

### 3.6 Geolocalizacion (`/geolocation`)

Monitoreo de ubicacion en tiempo real de empleados en campo.

| Accion | Descripcion |
|--------|-------------|
| **Mapa en vivo** | Visualice la ubicacion actual de los empleados activos |
| **Geocercas** | Defina zonas geograficas permitidas para cada ubicacion de cliente |
| **Historial** | Consulte el historial de ubicaciones de un empleado |
| **Alertas** | Reciba notificaciones cuando un empleado salga de la geocerca |

### 3.7 Control de Acceso (`/access-control`)

Gestion del control de acceso fisico y virtual.

| Accion | Descripcion |
|--------|-------------|
| **Registro de acceso** | Consulte los registros de entrada/salida de empleados y visitantes |
| **Visitantes** | Registre y gestione visitantes temporales |
| **Dispositivos** | Administre dispositivos de control de acceso (puertas, torniquetes) |
| **Estado** | Monitoree el estado actual del control de acceso en cada ubicacion |

### 3.8 Reconocimiento Facial (`/facial-recognition`)

Sistema de identificacion biométrica.

| Accion | Descripcion |
|--------|-------------|
| **Registro** | Registre fotos faciales de empleados para identificacion |
| **Verificacion** | Verifique la identidad de un empleado mediante su rostro |
| **Historial** | Consulte el historial de intentos de reconocimiento |

### 3.9 Reportes (`/reports`)

Generacion y exportacion de reportes.

| Tipo de Reporte | Descripcion |
|----------------|-------------|
| **Nomina** | Reporte de nomina por periodo con detalle de conceptos |
| **Empleados** | Directorio completo de empleados con filtros |
| **Asistencia** | Reporte de asistencia por empleado o equipo |
| **Productividad** | Indicadores de productividad por empresa/equipo |
| **Exportar Excel** | Descargue reportes de nomina en formato .xlsx |

### 3.10 Asistente IA (`/ai-assistant`)

Asistente inteligente para consultas en lenguaje natural.

| Accion | Descripcion |
|--------|-------------|
| **Consultar** | Escriba preguntas como "Cuantos empleados activos hay?" o "Cuanto fue la nomina de junio?" |
| **Insights** | Obtenga analisis automaticos sobre datos de la empresa |
| **Buscar empleados** | Busque empleados usando lenguaje natural |

### 3.11 Roles (`/iam/roles`)

Gestion de roles y permisos (solo Super Admin).

| Accion | Descripcion |
|--------|-------------|
| **Ver roles** | Lista de todos los roles del sistema |
| **Crear rol** | Defina un nuevo rol con nombre, nivel y color |
| **Asignar permisos** | Seleccione que acciones puede realizar cada rol en cada modulo |
| **Matriz de permisos** | Vista completa de que puede hacer cada rol |

**Roles predeterminados:**
Super Admin, Gerencia, Administracion, Auditor, Supervisor, Administrativo, Medico, Enfermero, Cuidador

### 3.12 Configuracion (`/settings`)

Ajustes generales del sistema y perfil de usuario.

| Seccion | Descripcion |
|---------|-------------|
| **Perfil** | Edite su nombre, telefono, direccion y foto |
| **Seguridad** | Cambie contrasena, active/desactive MFA |
| **Notificaciones** | Configure sus preferencias de notificacion |
| **Apariencia** | Tema claro/oscuro |

---

## 4. App Movil

La aplicacion movil esta disponible para iOS y Android, y tambien funciona en navegador web.

### 4.1 Login Movil

1. Abra la aplicacion
2. Ingrese email y contrasena
3. Complete el reconocimiento facial si es necesario (primer login)

### 4.2 Tabs Principales

| Tab | Funcion |
|-----|---------|
| **Inicio** | Dashboard con resumen de turnos y notificaciones |
| **Programacion** | Consulte sus turnos asignados y detalles |
| **Acceso** | Registre entradas/salidas, gestione visitantes |
| **Nomina** | Consulte sus liquidaciones de nomina |
| **Perfil** | Ver/editar perfil, configuracion, historial |

### 4.3 Funciones Moviles

- **Registro biométrico**: Capture foto facial para el reconocimiento
- **Geolocalizacion**: La app comparte ubicacion durante turnos activos
- **Notificaciones push**: Reciba alertas de turnos, nomina y sistema
- **Modo offline**: La app almacena datos localmente cuando no hay conexion y sincroniza automaticamente
- **Bateria real**: El nivel de bateria se reporta al sistema desde el dispositivo

---

## 5. Notificaciones

El sistema envia notificaciones por:

- **Turnos**: Asignacion, cambios y recordatorios de turnos
- **Nomina**: Periodos de nomina disponibles
- **Sistema**: Actualizaciones y mantenimientos
- **Alertas**: Eventos de seguridad importantes

Las notificaciones se marcan como leidas individualmente o todas a la vez desde el icono de campana en el encabezado.
