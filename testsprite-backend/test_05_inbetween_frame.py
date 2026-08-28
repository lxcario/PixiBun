import requests

TARGET_URL = globals().get('TARGET_URL', 'https://pixibun.vercel.app').rstrip('/')
AUTH_HEADERS = globals().get('__AUTH_HEADERS__', {})

def test_inbetween_frame_action():
    payload = {
        "action": "inbetween-frame",
        "canvasWidth": 32,
        "canvasHeight": 32,
        "imageDataUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAALElEQVRYR+3BAQ0AAADCoPdPbQ8HFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPwYxQAB15VbIQAAAABJRU5ErkJggg==",
        "paletteColors": ["#1E1730", "#F0BE7C"]
    }
    r = requests.post(f"{TARGET_URL}/api/ai/vision", json=payload, headers=AUTH_HEADERS)
    assert r.status_code == 200, f"Expected 200 OK, got {r.status_code}: {r.text}"
    data = r.json()
    assert data.get("success") is True, f"Expected success=True: {data}"
    assert "offset" in data.get("actionData", {}), f"Expected offset in actionData: {data}"

test_inbetween_frame_action()
