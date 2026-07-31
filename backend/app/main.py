from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator
import asyncio
import logging
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.exceptions import DLAException

# Import all models to configure SQLAlchemy mappers in correct order
import app.shared.database  # noqa: F401

from app.modules.auth.presentation.routes import router as auth_router
from app.modules.employees.presentation.routes import router as employees_router
from app.modules.contracts.presentation.routes import router as contracts_router
from app.modules.payroll.presentation.routes import router as payroll_router
from app.modules.clients.presentation.routes import router as clients_router
from app.modules.scheduling.presentation.routes import router as scheduling_router
from app.modules.geolocation.presentation.routes import router as geolocation_router
from app.modules.access_control.presentation.routes import router as access_control_router
from app.modules.dashboard.presentation.routes import router as dashboard_router
from app.modules.reports.presentation.routes import router as reports_router
from app.modules.ai_assistant.presentation.routes import router as ai_router
from app.modules.mobile.presentation.routes import router as mobile_router
from app.modules.iam.presentation.routes import router as iam_router
from app.modules.iam.presentation.admin import router as admin_router
from app.modules.notifications.presentation.routes import router as notifications_router
from app.modules.facial_recognition.presentation.routes import router as facial_router

logger = logging.getLogger(__name__)


# ── Rate Limiter ────────────────────────────────────────────────────────────
class RateLimiter:
    """Redis-backed fixed-window rate limiter with in-memory fallback.

    Usa Redis cuando REDIS_URL está disponible (compartido entre workers).
    Si Redis no responde, degrada a un contador en memoria (mejor que nada).
    """

    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._mem: dict[str, list[float]] = {}
        self._redis_enabled = bool(settings.REDIS_URL)

    def _memory_is_rate_limited(self, key: str) -> bool:
        now = time.time()
        cutoff = now - self.window_seconds
        bucket = [t for t in self._mem.get(key, []) if t > cutoff]
        if len(bucket) >= self.max_requests:
            self._mem[key] = bucket
            return True
        bucket.append(now)
        self._mem[key] = bucket
        return False

    async def is_rate_limited(self, key: str) -> bool:
        if not self._redis_enabled:
            return self._memory_is_rate_limited(key)
        try:
            import redis.asyncio as aioredis

            r = aioredis.from_url(settings.REDIS_URL, socket_connect_timeout=0.5)
            now = int(time.time())
            window = now - self.window_seconds
            await r.zremrangebyscore(key, 0, window)
            count = await r.zcard(key)
            if count >= self.max_requests:
                await r.close()
                return True
            member = f"{now}-{await r.incr(key + ':seq')}"
            await r.zadd(key, {member: now})
            await r.expire(key, self.window_seconds)
            await r.close()
            return False
        except Exception:
            self._redis_enabled = False
            logger.warning("Redis no disponible para rate limiting; usando memoria local")
            return self._memory_is_rate_limited(key)


login_limiter = RateLimiter(max_requests=10, window_seconds=60)


async def auto_close_background_task():
    while True:
        try:
            from app.core.database import async_session_factory
            async with async_session_factory() as db:
                from app.modules.mobile.presentation.routes import auto_close_shifts
                closed = await auto_close_shifts(db)
                if closed > 0:
                    logger.info(f"Auto-closed {closed} expired shifts")
        except Exception as e:
            logger.error(f"Auto-close error: {e}")
        await asyncio.sleep(300)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    task = asyncio.create_task(auto_close_background_task())
    yield
    task.cancel()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=f"{settings.APP_DESCRIPTION} - {settings.APP_AUTHOR}",
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
    openapi_url="/openapi.json" if settings.ENVIRONMENT != "production" else None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Security Headers Middleware ──────────────────────────────────────────────
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if settings.ENVIRONMENT == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
    return response


@app.exception_handler(DLAException)
async def dla_exception_handler(request: Request, exc: DLAException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "error": True},
    )


@app.get("/", tags=["Health"])
async def root() -> dict:
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "author": settings.APP_AUTHOR,
        "status": "running",
        "environment": settings.ENVIRONMENT,
    }


@app.get("/health", tags=["Health"])
async def health_check() -> dict:
    return {"status": "healthy", "version": settings.APP_VERSION}


app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(employees_router, prefix=settings.API_V1_PREFIX)
app.include_router(contracts_router, prefix=settings.API_V1_PREFIX)
app.include_router(payroll_router, prefix=settings.API_V1_PREFIX)
app.include_router(clients_router, prefix=settings.API_V1_PREFIX)
app.include_router(scheduling_router, prefix=settings.API_V1_PREFIX)
app.include_router(geolocation_router, prefix=settings.API_V1_PREFIX)
app.include_router(access_control_router, prefix=settings.API_V1_PREFIX)
app.include_router(dashboard_router, prefix=settings.API_V1_PREFIX)
app.include_router(reports_router, prefix=settings.API_V1_PREFIX)
app.include_router(ai_router, prefix=settings.API_V1_PREFIX)
app.include_router(mobile_router, prefix=settings.API_V1_PREFIX)
app.include_router(iam_router, prefix=settings.API_V1_PREFIX)
app.include_router(admin_router, prefix=settings.API_V1_PREFIX)
app.include_router(notifications_router, prefix=settings.API_V1_PREFIX)
app.include_router(facial_router, prefix=settings.API_V1_PREFIX)
