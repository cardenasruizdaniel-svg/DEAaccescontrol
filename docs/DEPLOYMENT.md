# Guia de Despliegue en Produccion - DLA Access Enterprise

Version del proyecto: **1.0.0** (build de produccion auditado: 2026-07-31)

## Arquitectura desplegada

| Servicio  | Stack                 | Puerto prod | URL esperada        |
|-----------|-----------------------|-------------|---------------------|
| Backend   | FastAPI + Uvicorn     | 8000        | https://dla-backend.onrender.com |
| Frontend  | Next.js 14             | 3000        | https://dla-frontend.onrender.com |
| PWA       | Vite + React 19 (estatico) | estatico  | https://dla-pwa.onrender.com |
| Base datos| PostgreSQL 15+        | 5432        | Interno Render (dla-db) |
| Cache/RL  | Redis 7                | 6379        | Interno Render (dla-redis) |

## 1. Pre-requisitos

- Repositorio inicializado en git y subido a GitHub (obligatorio para Render Blueprint).
- Cuenta Render con plan `starter` (o superior) habilitado.
- `render.yaml` ya configurado en la raiz (incluye backend, frontend, PWA, PostgreSQL y Redis).

## 2. Variables de entorno (Backend)

| Variable | Valor en produccion | Nota |
|----------|---------------------|------|
| `ENVIRONMENT` | `production` | Desactiva `/docs`, `/redoc`, `/openapi.json` |
| `SECRET_KEY` | autogenerada | Minimo 32 chars (validado en arranque) |
| `ENCRYPTION_KEY` | autogenerada | Obligatoria en produccion |
| `DATABASE_URL` | de `dla-db` | Render la inyecta automaticamente |
| `REDIS_URL` | de `dla-redis` | Si falla, el rate limiter degrada a memoria |
| `CORS_ORIGINS` | `["https://dla-frontend.onrender.com","https://dla-pwa.onrender.com"]` | JSON array |
| `RABBITMQ_URL` | vacio | Opcional |
| `GOOGLE_MAPS_API_KEY` | manual | Opcional (geocoding) |
| `AI_API_KEY` | manual | Opcional (asistente IA) |
| `SMTP_*` | manual | Opcional (correo) |

## 3. Despliegue

### 3.1 Via Render Blueprint (recomendado)

```bash
git add .
git commit -m "chore: preparar produccion"
git push origin main
```

1. En Render: **New + Blueprint** -> conectar repositorio.
2. Seleccionar `render.yaml`. Render creara automaticamente los 3 servicios, la BD y Redis.
3. Primera deploy: la BD tarda unos minutos en provisionarse. Si backend falla por BD no lista, usar **Deploy** nuevamente.
4. Las migraciones se aplican solas: `alembic upgrade head` (parte del startCommand).

### 3.2 Deploy manual del backend

```bash
cd backend
pip install -e ".[prod]"
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
```

## 4. Verificacion post-deploy

| Chequeo | Comando / URL | Esperado |
|---------|---------------|----------|
| Health | `GET /health` | `{"status":"healthy","version":"1.0.0"}` |
| Login | `POST /api/v1/auth/login` con credenciales admin | 200 + `access_token` |
| Sin token | `GET /api/v1/employees` | `401` |
| Headers seguros | cualquier respuesta | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` |
| Frontend | `GET /login` | 200 HTML |
| PWA | `GET /manifest.webmanifest` | JSON con iconos PNG 192/512 |

## 5. Seguridad en produccion

- Cambiar la contrasena del usuario admin inmediatamente tras el primer deploy.
- `SECRET_KEY`/`ENCRYPTION_KEY` son autogeneradas por Render; no copiarlas del `.env` de desarrollo.
- Los endpoints `/access/entry`, `/access/exit`, `/facial-recognition/*` exigen token JWT (identidad del token, no del body).
- No exponer `/docs` ni `/redoc` (desactivados con `ENVIRONMENT=production`).
- Revisar los logs de `audit_logs` periodicamente.

## 6. Backups y recuperacion

### Backup automatico (Cron Job en Render)

1. En Render: **New + Cron Job** -> mismo repositorio.
2. Command: `bash scripts/backup-db.sh /var/data/backups`
3. Schedule: `0 3 * * *` (diario 3:00 AM).
4. Copiar `/var/data/backups/*.dump` a storage externo (S3, Google Drive) con la herramienta que prefiera.

### Restauracion

```bash
pg_restore --no-owner --clean --if-exists \
  -d "postgres://user:pass@host:5432/dla_access" \
  dla_backup_20260731_030000.dump
```

## 7. Escalado y monitoreo

- Backend: incrementar `--workers` (2 por defecto) o duplicar el servicio.
- Monitorear: Redis (rate limiter), `user_sessions` (limpiar expiradas), `audit_logs` (crecimiento).
- Limpieza de sesiones expiradas:
  ```sql
  UPDATE user_sessions SET is_active = false
  WHERE is_active = true AND expires_at::timestamp < NOW();
  ```

## 8. Rollback

- Render mantiene los ultimos deploys. En la pestana de cada servicio: **Events** -> **Deploy** previo -> **Rollback**.
- La BD: restaurar el ultimo backup (seccion 6).
