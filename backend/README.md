# DLA Access Enterprise - Backend

API REST de DLAControlAcces. Framework FastAPI + SQLAlchemy 2.0 (async) + PostgreSQL.

## Stack

- Python 3.11+
- FastAPI 0.104+
- SQLAlchemy 2.0 async / asyncpg
- Alembic (migraciones)
- Redis (caché / rate limiting)
- Celery + RabbitMQ (tareas en segundo plano, opcional)
- OpenCV + face-recognition (verificación facial)

## Requisitos

- Python 3.11+
- PostgreSQL 16+
- Redis 7+ (opcional)

## Instalación

```bash
python -m venv venv
venv\Scripts\activate          # Windows
pip install -e ".[dev]"       # incluye dependencias de desarrollo
```

## Configuración

Copie `.env.example` a `backend/.env` y ajuste los valores (SECRET_KEY, DATABASE_URL, etc.).

## Ejecución

```bash
alembic upgrade head          # aplicar migraciones
uvicorn app.main:app --host 0.0.0.0 --port 8888 --reload
```

Documentación interactiva: http://localhost:8888/docs

## Estructura

```
app/
├── core/          # Configuración, seguridad, base de datos, dependencias
├── modules/       # Módulos de negocio (auth, employees, scheduling, mobile, ...)
└── shared/        # Modelos de base de datos compartidos, migraciones
```

## Pruebas

```bash
pytest
```

## Despliegue

Imagen Docker incluida en `Dockerfile`. El servicio expone el puerto 8000 en
producción. La entrada arranca con: `alembic upgrade head && uvicorn ...`
