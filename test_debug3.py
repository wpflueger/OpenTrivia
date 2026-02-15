from playwright.sync_api import sync_playwright

BASE_URL = "https://web-five-sage-83.vercel.app"


def test_api():
    print("=== Testing API endpoints ===\n")

    # Test session create
    print("1. Testing session create...")
    import requests

    resp = requests.post(f"{BASE_URL}/api/session/create")
    print(f"   Status: {resp.status_code}")
    data = resp.json()
    print(f"   Response: {data}")
    room_id = data.get("roomId")

    # Test pack load
    print("\n2. Testing pack load...")
    resp = requests.get(f"{BASE_URL}/api/packs/local/science")
    print(f"   Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        print(f"   Questions: {len(data.get('questions', []))}")
    else:
        print(f"   Error: {resp.text[:200]}")

    print("\n=== API tests complete ===")


def test_browser():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()

        print("\n=== Testing Browser Flow ===\n")

        page = context.new_page()
        page.on("console", lambda m: print(f"   [console] {m.type}: {m.text[:100]}"))
        page.on("pageerror", lambda m: print(f"   [error] {m}"))

        print("1. Loading host page...")
        page.goto(f"{BASE_URL}/host")
        page.wait_for_load_state("domcontentloaded")
        print(f"   DOM loaded: {page.url}")

        page.wait_for_timeout(2000)

        # Check if select exists
        print("\n2. Checking form elements...")
        pack_select = page.locator("#localPack")
        if pack_select.count() > 0:
            print("   ✓ #localPack found")
        else:
            print("   ✗ #localPack not found")
            print(f"   Page HTML: {page.content()[:1000]}")

        browser.close()


if __name__ == "__main__":
    test_api()
    test_browser()
