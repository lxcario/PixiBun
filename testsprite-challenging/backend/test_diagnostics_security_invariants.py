import json
import os
import requests

TARGET_URL = os.environ.get("TARGET_URL", "https://pixibun.vercel.app").rstrip("/")

def test_diagnostics_method_not_allowed():
    """Asserts that GET, PUT, and DELETE methods are rejected with 405 Method Not Allowed."""
    url = f"{TARGET_URL}/api/diagnostics/relay"
    for method in ["GET", "PUT", "DELETE"]:
        resp = requests.request(method, url, timeout=10)
        assert resp.status_code == 405, f"Expected 405 Method Not Allowed for {method}, got {resp.status_code}"

def test_diagnostics_post_contracts():
    """Validates POST requests on the diagnostics relay endpoint."""
    url = f"{TARGET_URL}/api/diagnostics/relay"
    headers = {"Content-Type": "application/json"}
    
    # In production without upstream configured, POST returns 503 with privacy notice
    payload = {
        "app": "pixibun",
        "version": "1.13.1",
        "events": [{"type": "perf", "metric": "LCP", "value": 120}],
    }
    resp = requests.post(url, json=payload, headers=headers, timeout=10)
    assert resp.status_code in [200, 503], f"Expected 200 or 503, got {resp.status_code}: {resp.text}"
    if resp.status_code == 503:
        body = resp.json()
        assert "not configured" in body.get("error", "").lower(), f"Unexpected 503 error message: {body}"

    # Verify prototype pollution payloads don't trigger unhandled 500 crashes
    proto_payload = {
        "__proto__": {"isAdmin": True},
        "constructor": {"prototype": {"polluted": True}},
        "app": "pixibun",
        "version": "1.13.1",
        "events": [],
    }
    resp_proto = requests.post(url, json=proto_payload, headers=headers, timeout=10)
    assert resp_proto.status_code in [200, 400, 503], f"Prototype payload caused unhandled status: {resp_proto.status_code}"

test_diagnostics_method_not_allowed()
test_diagnostics_post_contracts()
print("All Diagnostics API security and invariant tests passed successfully!")
