import requests

TARGET_URL = globals().get('TARGET_URL', 'https://pixibun.vercel.app').rstrip('/')
AUTH_HEADERS = globals().get('__AUTH_HEADERS__', {})

def test_harmonize_palette_action():
    payload = {
        "action": "harmonize-palette",
        "canvasWidth": 32,
        "canvasHeight": 32,
        "imageDataUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAALElEQVRYR+3BAQ0AAADCoPdPbQ8HFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPwYxQAB15VbIQAAAABJRU5ErkJggg==",
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
