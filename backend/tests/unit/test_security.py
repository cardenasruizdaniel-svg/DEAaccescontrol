from fastapi.testclient import TestClient


def test_access_entry_requires_auth(client: TestClient) -> None:
    resp = client.post(
        "/api/v1/access/entry",
        json={"employee_id": "x", "latitude": 0.0, "longitude": 0.0},
    )
    assert resp.status_code == 401


def test_access_exit_requires_auth(client: TestClient) -> None:
    resp = client.post(
        "/api/v1/access/exit",
        json={"employee_id": "x", "latitude": 0.0, "longitude": 0.0},
    )
    assert resp.status_code == 401


def test_facial_verify_requires_auth(client: TestClient) -> None:
    resp = client.post("/api/v1/facial-recognition/verify", json={"photo_base64": "YQ=="})
    assert resp.status_code == 401


def test_facial_liveness_requires_auth(client: TestClient) -> None:
    resp = client.post("/api/v1/facial-recognition/liveness", json={"photo_base64": "YQ=="})
    assert resp.status_code == 401


def test_facial_verify_rejects_employee_id_in_body(client: TestClient) -> None:
    # El endpoint ya no acepta employee_id en el body (identidad viene del token)
    resp = client.post("/api/v1/facial-recognition/verify", json={"employee_id": "x", "photo_base64": "YQ=="})
    assert resp.status_code == 401


def test_access_entry_uses_authenticated_identity(client: TestClient, auth_headers: dict[str, str]) -> None:
    # Con token válido el employee_id del body se ignora y se usa el del token
    resp = client.post(
        "/api/v1/access/entry",
        json={"employee_id": "id-inexistente", "latitude": 0.0, "longitude": 0.0},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body.get("employee_id") != "id-inexistente"
