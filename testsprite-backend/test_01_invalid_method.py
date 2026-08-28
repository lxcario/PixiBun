import requests

TARGET_URL = globals().get('TARGET_URL', 'https://pixibun.vercel.app').rstrip('/')
AUTH_HEADERS = globals().get('__AUTH_HEADERS__', {})

def test_invalid_http_method():
    r = requests.get(f"{TARGET_URL}/api/ai/vision", headers=AUTH_HEADERS)
    assert r.status_code == 405, f"Expected 405 Method Not Allowed, got {r.status_code}: {r.text}"

test_invalid_http_method()
