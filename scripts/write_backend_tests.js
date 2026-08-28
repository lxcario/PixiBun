const fs = require('fs');
const path = require('path');
const backendDir = path.resolve('testsprite-backend');
fs.mkdirSync(backendDir, { recursive: true });

const SAMPLE_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAALElEQVRYR+3BAQ0AAADCoPdPbQ8HFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPwYxQAB15VbIQAAAABJRU5ErkJggg==';

const t1 = `import requests

TARGET_URL = globals().get('TARGET_URL', 'https://pixibun.vercel.app').rstrip('/')
AUTH_HEADERS = globals().get('__AUTH_HEADERS__', {})

def test_invalid_http_method():
    r = requests.get(f"{TARGET_URL}/api/ai/vision", headers=AUTH_HEADERS)
    assert r.status_code == 405, f"Expected 405 Method Not Allowed, got {r.status_code}: {r.text}"

test_invalid_http_method()
`;

const t2 = `import requests

TARGET_URL = globals().get('TARGET_URL', 'https://pixibun.vercel.app').rstrip('/')
AUTH_HEADERS = globals().get('__AUTH_HEADERS__', {})

def test_auto_shade_action():
    payload = {
        "action": "auto-shade",
        "canvasWidth": 32,
        "canvasHeight": 32,
        "imageDataUrl": "${SAMPLE_PNG}",
        "paletteColors": ["#1E1730", "#F0BE7C", "#DCABDF"]
    }
    r = requests.post(f"{TARGET_URL}/api/ai/vision", json=payload, headers=AUTH_HEADERS)
    assert r.status_code == 200, f"Expected 200 OK, got {r.status_code}: {r.text}"
    data = r.json()
    assert data.get("success") is True, f"Expected success=True: {data}"
    assert isinstance(data.get("text"), str) and len(data["text"]) > 0, "Expected non-empty text"
    assert "actionData" in data, "Expected actionData in response"
    assert data["actionData"].get("lightAngle") == 45, f"Expected lightAngle 45, got {data['actionData']}"
    assert "suggestions" in data and isinstance(data["suggestions"], list), "Expected suggestions list"

test_auto_shade_action()
`;

const t3 = `import requests

TARGET_URL = globals().get('TARGET_URL', 'https://pixibun.vercel.app').rstrip('/')
AUTH_HEADERS = globals().get('__AUTH_HEADERS__', {})

def test_harmonize_palette_action():
    payload = {
        "action": "harmonize-palette",
        "canvasWidth": 32,
        "canvasHeight": 32,
        "imageDataUrl": "${SAMPLE_PNG}",
        "paletteColors": ["#1E1730", "#3A2E4C", "#F0BE7C"]
    }
    r = requests.post(f"{TARGET_URL}/api/ai/vision", json=payload, headers=AUTH_HEADERS)
    assert r.status_code == 200, f"Expected 200 OK, got {r.status_code}: {r.text}"
    data = r.json()
    assert data.get("success") is True, f"Expected success=True: {data}"
    suggested = data.get("actionData", {}).get("suggestedColors", [])
    assert isinstance(suggested, list) and len(suggested) > 0, f"Expected suggestedColors array: {data}"
    for color in suggested:
        assert color.startswith("#"), f"Expected hex color string, got {color}"

test_harmonize_palette_action()
`;

const t4 = `import requests

TARGET_URL = globals().get('TARGET_URL', 'https://pixibun.vercel.app').rstrip('/')
AUTH_HEADERS = globals().get('__AUTH_HEADERS__', {})

def test_clean_jaggies_action():
    payload = {
        "action": "clean-jaggies",
        "canvasWidth": 32,
        "canvasHeight": 32,
        "imageDataUrl": "${SAMPLE_PNG}",
        "paletteColors": ["#1E1730", "#F0BE7C"]
    }
    r = requests.post(f"{TARGET_URL}/api/ai/vision", json=payload, headers=AUTH_HEADERS)
    assert r.status_code == 200, f"Expected 200 OK, got {r.status_code}: {r.text}"
    data = r.json()
    assert data.get("success") is True, f"Expected success=True: {data}"
    assert isinstance(data.get("text"), str), "Expected text response"

test_clean_jaggies_action()
`;

const t5 = `import requests

TARGET_URL = globals().get('TARGET_URL', 'https://pixibun.vercel.app').rstrip('/')
AUTH_HEADERS = globals().get('__AUTH_HEADERS__', {})

def test_inbetween_frame_action():
    payload = {
        "action": "inbetween-frame",
        "canvasWidth": 32,
        "canvasHeight": 32,
        "imageDataUrl": "${SAMPLE_PNG}",
        "paletteColors": ["#1E1730", "#F0BE7C"]
    }
    r = requests.post(f"{TARGET_URL}/api/ai/vision", json=payload, headers=AUTH_HEADERS)
    assert r.status_code == 200, f"Expected 200 OK, got {r.status_code}: {r.text}"
    data = r.json()
    assert data.get("success") is True, f"Expected success=True: {data}"
    assert "offset" in data.get("actionData", {}), f"Expected offset in actionData: {data}"

test_inbetween_frame_action()
`;

const t6 = `import requests

TARGET_URL = globals().get('TARGET_URL', 'https://pixibun.vercel.app').rstrip('/')
AUTH_HEADERS = globals().get('__AUTH_HEADERS__', {})

def test_critique_and_chat_action():
    payload = {
        "action": "critique",
        "prompt": "How are the proportions and shadow placement on this little creature sprite?",
        "canvasWidth": 32,
        "canvasHeight": 32,
        "imageDataUrl": "${SAMPLE_PNG}",
        "paletteColors": ["#1E1730", "#F0BE7C", "#DCABDF"]
    }
    r = requests.post(f"{TARGET_URL}/api/ai/vision", json=payload, headers=AUTH_HEADERS)
    assert r.status_code == 200, f"Expected 200 OK, got {r.status_code}: {r.text}"
    data = r.json()
    assert data.get("success") is True, f"Expected success=True: {data}"
    assert isinstance(data.get("text"), str) and len(data["text"]) > 0, "Expected thoughtful critique text"
    assert isinstance(data.get("suggestions"), list) and len(data["suggestions"]) > 0, "Expected suggestions"

test_critique_and_chat_action()
`;

const t7 = `import requests

TARGET_URL = globals().get('TARGET_URL', 'https://pixibun.vercel.app').rstrip('/')
AUTH_HEADERS = globals().get('__AUTH_HEADERS__', {})

def test_validation_invalid_action():
    payload = {
        "action": "non-existent-action",
        "canvasWidth": 32,
        "canvasHeight": 32,
        "imageDataUrl": "${SAMPLE_PNG}"
    }
    r = requests.post(f"{TARGET_URL}/api/ai/vision", json=payload, headers=AUTH_HEADERS)
    assert r.status_code == 400, f"Expected 400 Bad Request for invalid action, got {r.status_code}"
    assert r.json().get("error") == "Invalid action"

def test_validation_invalid_dimensions():
    payload = {
        "action": "auto-shade",
        "canvasWidth": -10,
        "canvasHeight": 32,
        "imageDataUrl": "${SAMPLE_PNG}"
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
        "imageDataUrl": "${SAMPLE_PNG}",
        "customApiKey": "short-invalid-key"
    }
    r = requests.post(f"{TARGET_URL}/api/ai/vision", json=payload, headers=AUTH_HEADERS)
    assert r.status_code == 400, f"Expected 400 Bad Request for short API key, got {r.status_code}"
    assert r.json().get("error") == "Invalid custom API key"

test_validation_invalid_action()
test_validation_invalid_dimensions()
test_validation_invalid_image_data_url()
test_validation_malformed_custom_api_key()
`;

fs.writeFileSync(path.join(backendDir, 'test_01_invalid_method.py'), t1);
fs.writeFileSync(path.join(backendDir, 'test_02_auto_shade.py'), t2);
fs.writeFileSync(path.join(backendDir, 'test_03_harmonize_palette.py'), t3);
fs.writeFileSync(path.join(backendDir, 'test_04_clean_jaggies.py'), t4);
fs.writeFileSync(path.join(backendDir, 'test_05_inbetween_frame.py'), t5);
fs.writeFileSync(path.join(backendDir, 'test_06_critique_and_chat.py'), t6);
fs.writeFileSync(path.join(backendDir, 'test_07_input_validation_errors.py'), t7);

console.log('Successfully written all 7 backend Python test files.');
