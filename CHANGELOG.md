# CHANGELOG - DLA Access Enterprise

## [1.0.1] - 2026-07-31

### Seguridad (auditoria de produccion)
- **Cerrados 4 endpoints sin autenticacion**: `/access/entry`, `/access/exit`, `/facial-recognition/verify`, `/facial-recognition/liveness` ahora exigen JWT
- `/facial-recognition/verify` deriva la identidad del token (ya no acepta `employee_id` en el body) — elimina suplantacion de identidad
- Contrato biometrico alineado Backend-PWA: payload `photo_base64`, respuesta `{verified, score, message}` (antes el PWA enviaba `photo` y esperaba campos inexistentes: flujo roto con 422)

### Base de datos (auditoria)
- Eliminado `push_token` huerfano de prueba (`test-push-token-123`)
- Eliminado empleado duplicado de prueba `DEL001` "Delete Me" (mismo documento que EMP-FULL-001)
- Marcadas 141 sesiones expiradas como inactivas (limpieza)
- Verificada cadena de migraciones alembic en head (`g3_add_is_auto_exit`)

### Infraestructura
- Iconos PWA PNG 192/512/180 (apple-touch-icon) para iOS/Android; manifest unificado en `manifest.webmanifest` (eliminado `public/manifest.json` duplicado)
- `docs/DEPLOYMENT.md`: guia completa de despliegue en Render, backup y rollback
- `scripts/backup-db.sh`: backup automatizado de PostgreSQL con retencion de 14 dias

### Pruebas
- 6 nuevas pruebas de regresion de seguridad (`tests/unit/test_security.py`): total 18/18 PASS
- `npm run typecheck` y `npm run build` PWA: sin errores

### Deuda tecnica documentada
- `users` y sus columnas siguen presentes aunque el CHANGELOG 2.0.0 declaro su eliminacion: el auth activo usa `employees` como fuente principal y `users` como fallback legacy (ambos funcionan)

---

## [2.0.0] - 2026-07-25

### Refactorizacion: Unificacion de Empleados y Usuarios

#### FASE 2A - Migracion de Base de Datos
- Migrada tabla `notifications`: eliminada columna `user_id`, conservada `employee_id` como FK unico
- Migrada tabla `push_tokens`: eliminada columna `user_id`, agregada `employee_id` como FK a `employees`
- Corregidos nombres de constraints: `fk_patients_*` -> `fk_personas_*`, `pk_patients` -> `pk_personas`
- Corregido indice: `ix_shifts_patient_id` -> `ix_shifts_persona_id`
- Tabla `users` eliminada completamente (duplicaba campos auth de `employees`)

#### FASE 2B - Limpieza Backend
- Eliminado modelo `User` de `models_auth.py`
- Eliminada relacion `Role.users` (reemplazada por `Role.employees`)
- Eliminados metodos `sync_user_record()` y `sync_user_from_employee()` del EmployeeRepository
- Eliminadas llamadas a sync en `EmployeeService` (create_access, update_access, reset_password)
- Employee es ahora la unica entidad de autenticacion

#### FASE 2C - Limpieza Frontend Web
- Eliminadas 9 dependencias npm sin usar: `@tanstack/react-table`, `recharts`, `leaflet`, `react-leaflet`, `react-hook-form`, `@hookform/resolvers`, `zod`, `react-hot-toast`, `date-fns`
- Eliminadas 7 interfaces TypeScript muertas del types/index.ts
- Eliminadas 3 funciones utilitarias muertas (formatDate, formatDateTime, getInitials)
- Header dropdown: "Mi Perfil" ahora navega a `/employees/[id]`, "Configuracion" a `/settings`

#### FASE 3A - Correccion Mobile: API URL
- API URL ahora es dinamica: web usa `window.location.hostname:8888`, native usa IP LAN configurable
- Eliminada dependencia de `127.0.0.1` que fallaba en dispositivos reales

#### FASE 3B - Correccion Mobile: Bugs Criticos
- Skeleton: color de fondo ahora usa tema en vez de hardcoded `#374151`
- EnrollmentScreen: guard para web en boton de permisos de camara (evita crash)
- AccessScreen: battery_level ahora lee nivel real via `expo-battery` (fallback a 100)

#### FASE 3C - Correccion Mobile: Persistencia y UX
- SettingsScreen: toggles autoLock y notifications ahora persisten en SecureStore
- NotificationsScreen: colores de icono corregidos con mapa de tipos (shift, payroll, system, alert)

#### FASE 4 - Validacion de Plataforma
- Login valida `platform_access` contra el parametro `platform` del query string
- Usuario solo WEB: bloqueado desde app movil
- Usuario solo APP: bloqueado desde ERP web
- Usuario ambas plataformas: acceso desde ambos

---

## [1.0.0] - 2026-07-20

### Version Inicial
- Backend FastAPI con 15+ modulos
- Frontend Next.js 14 con 16 paginas funcionales
- App movil React Native Expo con soporte offline
- Sistema de autenticacion JWT con MFA
- Gestion de empleados, clientes, contratos, nomina
- Programacion de turnos con calendario
- Geolocalizacion y geocerca
- Control de acceso con reconocimiento facial
- Reportes y asistente IA
