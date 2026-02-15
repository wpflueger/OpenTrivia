from playwright.sync_api import sync_playwright

BASE_URL = "https://web-five-sage-83.vercel.app"


def test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        errors = []
        page.on("console", lambda m: errors.append(f"[{m.type}] {m.text}"))
        page.on("pageerror", lambda e: errors.append(f"[pageerror] {e}"))

        print("1. Loading host page...")
        page.goto(f"{BASE_URL}/host")
        page.wait_for_load_state("networkidle")

        print("2. Checking for errors...")
        for e in errors:
            print(f"   {e}")

        print("\n3. Clicking Create Game...")
        page.click('button:has-text("CREATE GAME")')

        page.wait_for_timeout(3000)

        print(f"\n4. Current URL: {page.url}")

        browser.close()


if __name__ == "__main__":
    test()
