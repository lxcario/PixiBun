import json
import os
import requests

# TestSprite sandbox provides TARGET_URL; fallback for local testing
TARGET_URL = os.environ.get("TARGET_URL", "https://pixibun.vercel.app").rstrip("/")

def test_pwa_webmanifest_integrity_and_security():
    """Validates that the PWA Web Manifest complies with W3C PWA standards."""
    url = f"{TARGET_URL}/manifest.webmanifest"
    resp = requests.get(url, timeout=10)
    assert resp.status_code == 200, f"Expected 200 OK from manifest, got {resp.status_code}"
    
    # Verify Content-Type contains manifest or json
    content_type = resp.headers.get("Content-Type", "")
    assert "json" in content_type or "manifest" in content_type, f"Unexpected Content-Type: {content_type}"
    
    data = resp.json()
    assert "PixiBun" in data.get("name", ""), f"Manifest name missing: {data.get('name')}"
    assert data.get("display") == "standalone", f"Display mode must be standalone, got: {data.get('display')}"
    assert data.get("start_url") in ["/studio", "/"], f"start_url must be '/studio' or '/', got: {data.get('start_url')}"
    assert data.get("scope") == "/", f"scope must be '/', got: {data.get('scope')}"
    
    icons = data.get("icons", [])
    assert len(icons) >= 3, f"Expected at least 3 icons, found {len(icons)}"
    has_maskable = any("maskable" in icon.get("purpose", "") for icon in icons)
    assert has_maskable, "PWA manifest must include at least one maskable icon for Android adaptive icon rendering"

def test_service_worker_caching_and_precache_matrix():
    """Validates the Service Worker script, versioned cache bucket, and precache table."""
    url = f"{TARGET_URL}/sw.js"
    resp = requests.get(url, timeout=10)
    assert resp.status_code == 200, f"Expected 200 OK from sw.js, got {resp.status_code}"
    
    body = resp.text
    assert "CACHE_NAME = 'pixibun-" in body, "Service Worker must use versioned cache bucket prefix 'pixibun-'"
    assert "PRECACHE_ASSETS" in body, "Service Worker must define precache asset array"
    assert "'/studio'" in body, "Precache table must include '/studio' route"
    assert "'/manifest.webmanifest'" in body, "Precache table must include '/manifest.webmanifest'"
    assert "'/offline.html'" in body, "Precache table must include '/offline.html' emergency fallback"
    assert "MAX_DYNAMIC_CACHE_ENTRIES" in body, "Dynamic cache must enforce LRU capacity bound"

def test_offline_fallback_document():
    """Validates that the offline fallback document renders valid HTML."""
    url = f"{TARGET_URL}/offline.html"
    resp = requests.get(url, timeout=10)
    assert resp.status_code == 200, f"Expected 200 OK from offline.html, got {resp.status_code}"
    assert "text/html" in resp.headers.get("Content-Type", ""), "offline.html must have text/html MIME type"
    assert "offline" in resp.text.lower(), "offline.html must provide clear offline status message"

# Invoke test functions directly
test_pwa_webmanifest_integrity_and_security()
test_service_worker_caching_and_precache_matrix()
test_offline_fallback_document()
print("All PWA and Service Worker tests passed successfully!")
