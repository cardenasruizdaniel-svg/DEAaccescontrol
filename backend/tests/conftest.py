import os
import sys

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client() -> TestClient:
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def admin_token(client: TestClient) -> str:
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@dlaredes.com.co", "password": "admin123"},
    )
    if resp.status_code != 200:
        pytest.skip("Admin credentials no disponibles en este entorno")
    data = resp.json()
    token = data.get("access_token") or (data.get("data") or {}).get("access_token")
    assert token, f"No se obtuvo token de acceso: {data}"
    return token


@pytest.fixture(scope="session")
def auth_headers(admin_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {admin_token}"}
