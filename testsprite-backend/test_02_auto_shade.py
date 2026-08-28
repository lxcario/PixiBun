import requests

TARGET_URL = globals().get('TARGET_URL', 'https://pixibun.vercel.app').rstrip('/')
AUTH_HEADERS = globals().get('__AUTH_HEADERS__', {})

def test_auto_shade_action():
    payload = {
        "action": "auto-shade",
        "canvasWidth": 32,
        "canvasHeight": 32,
        "imageDataUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAALElEQVRYR+3BAQ0AAADCoPdPbQ8HFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPwYxQAB15VbIQAAAABJRU5ErkJggg==",
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
