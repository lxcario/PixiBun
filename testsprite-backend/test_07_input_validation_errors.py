import requests

TARGET_URL = globals().get('TARGET_URL', 'https://pixibun.vercel.app').rstrip('/')
AUTH_HEADERS = globals().get('__AUTH_HEADERS__', {})

def test_validation_invalid_action():
    payload = {
        "action": "non-existent-action",
        "canvasWidth": 32,
        "canvasHeight": 32,
        "imageDataUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAALElEQVRYR+3BAQ0AAADCoPdPbQ8HFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPwYxQAB15VbIQAAAABJRU5ErkJggg=="
    }
    r = requests.post(f"{TARGET_URL}/api/ai/vision", json=payload, headers=AUTH_HEADERS)
    assert r.status_code == 400, f"Expected 400 Bad Request for invalid action, got {r.status_code}"
    assert r.json().get("error") == "Invalid action"

def test_validation_invalid_dimensions():
    payload = {
        "action": "auto-shade",
        "canvasWidth": -10,
        "canvasHeight": 32,
        "imageDataUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAALElEQVRYR+3BAQ0AAADCoPdPbQ8HFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPwYxQAB15VbIQAAAABJRU5ErkJggg=="
    }
    r = requests.post(f"{TARGET_URL}/api/ai/vision", json=payload, headers=AUTH_HEADERS)
    assert r.status_code == 400, f"Expected 400 Bad Request for negative width, got {r.status_code}"
    assert r.json().get("error") == "Invalid canvas dimensions"

def test_validation_invalid_image_data_url():
    payload = {
        "action": "auto-shade",
        "canvasWidth": 32,
        "canvasHeight": 32,
        "imageDataUrl": 99999
    }
    r = requests.post(f"{TARGET_URL}/api/ai/vision", json=payload, headers=AUTH_HEADERS)
    assert r.status_code == 400, f"Expected 400 Bad Request for non-string imageDataUrl, got {r.status_code}"
    assert r.json().get("error") == "Invalid imageDataUrl"

def test_validation_malformed_custom_api_key():
    payload = {
        "action": "auto-shade",
        "canvasWidth": 32,
        "canvasHeight": 32,
        "imageDataUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAALElEQVRYR+3BAQ0AAADCoPdPbQ8HFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPwYxQAB15VbIQAAAABJRU5ErkJggg==",
        "customApiKey": "short-invalid-key"
    }
    r = requests.post(f"{TARGET_URL}/api/ai/vision", json=payload, headers=AUTH_HEADERS)
    assert r.status_code == 400, f"Expected 400 Bad Request for short API key, got {r.status_code}"
    assert r.json().get("error") == "Invalid custom API key"

test_validation_invalid_action()
test_validation_invalid_dimensions()
test_validation_invalid_image_data_url()
test_validation_malformed_custom_api_key()
