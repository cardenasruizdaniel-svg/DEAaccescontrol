from fastapi.testclient import TestClient


def test_admin_reset_list_requires_superuser(client: TestClient) -> None:
    resp = client.get("/api/v1/iam/admin/reset-tables-list")
    assert resp.status_code == 401


def test_admin_reset_list(client: TestClient, auth_headers: dict[str, str]) -> None:
    resp = client.get("/api/v1/iam/admin/reset-tables-list", headers=auth_headers)
    if resp.status_code == 403:
        # Usuario sin privilegios de superusuario en este entorno
        return
    assert resp.status_code == 200
    body = resp.json()
    assert "tables" in body
    assert isinstance(body["tables"], list)
    assert "system_tables" in body


def test_admin_reset_rejects_unknown_tables(client: TestClient, auth_headers: dict[str, str]) -> None:
    resp = client.post(
        "/api/v1/iam/admin/reset-tables",
        json={"tables": ["users", "employees", "tabla_inexistente"]},
        headers=auth_headers,
    )
    if resp.status_code == 403:
        return
    assert resp.status_code == 400


def test_mobile_me_endpoints(client: TestClient, auth_headers: dict[str, str]) -> None:
    for url in [
        "/api/v1/mobile/me/employee",
        "/api/v1/mobile/me/dashboard",
        "/api/v1/mobile/me/shifts",
        "/api/v1/mobile/me/payroll-summary",
        "/api/v1/mobile/me/active-session",
    ]:
        resp = client.get(url, headers=auth_headers)
        assert resp.status_code == 200, f"{url} devolvió {resp.status_code}: {resp.text[:200]}"


def test_admin_endpoint_rejects_non_superuser(client: TestClient) -> None:
    # Sin token -> 401; con token normal no probado (depende del entorno)
    resp = client.post("/api/v1/iam/admin/reset-tables", json={"tables": []})
    assert resp.status_code == 401
