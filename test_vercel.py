from playwright.sync_api import sync_playwright

BASE_URL = "https://web-five-sage-83.vercel.app"


def test_game():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()

        print("=== Testing Vercel App ===\n")

        # HOST: Create game
        print("1. Loading host page...")
        host_page = context.new_page()
        host_page.goto(f"{BASE_URL}/host")
        host_page.wait_for_load_state("networkidle")
        print(f"   ✓ Host page loaded: {host_page.title()}")

        # Select pack
        print("\n2. Selecting Science pack...")
        host_page.select_option("#localPack", "science")

        # Click create
        print("\n3. Creating game...")
        host_page.click('button:has-text("CREATE GAME")')

        # Wait for navigation
        print("   Waiting for lobby...")
        try:
            host_page.wait_for_url("**/host/lobby**", timeout=10000)
            print(f"   ✓ Navigated to: {host_page.url}")
        except:
            print(f"   ✗ Current URL: {host_page.url}")
            print(f"   Page content: {host_page.content()[:500]}...")
            return

        room_code = (
            host_page.url.split("room=")[1].split("&")[0]
            if "room=" in host_page.url
            else "unknown"
        )
        print(f"   ✓ Room code: {room_code}")

        # Player joins
        print("\n4. Player joining...")
        player_page = context.new_page()
        player_page.goto(f"{BASE_URL}/join")
        player_page.wait_for_load_state("networkidle")
        player_page.fill("#roomCode", room_code)
        player_page.fill("#nickname", "TestPlayer")
        player_page.click('button:has-text("JOIN GAME")')

        try:
            player_page.wait_for_url(f"**/player/{room_code}**", timeout=10000)
            print(f"   ✓ Player joined: {player_page.url}")
        except:
            print(f"   ✗ Player URL: {player_page.url}")

        # Wait for connection
        player_page.wait_for_timeout(3000)

        # Check player connected
        player_text = player_page.locator("body").inner_text()
        print(
            f"   Player status: {'CONNECTED' if 'CONNECTED' in player_text else 'NOT CONNECTED'}"
        )

        # Host starts game
        print("\n5. Starting game...")
        if host_page.locator('button:has-text("START GAME")').is_visible(timeout=5000):
            host_page.locator('button:has-text("START GAME")').click()
            print("   ✓ Started game")

        host_page.wait_for_timeout(5000)

        # Check if question appears
        host_text = host_page.locator("body").inner_text()
        print(f"\n=== Results ===")
        print(f"Host shows question: {'QUESTION' in host_text}")

        player_text = player_page.locator("body").inner_text()
        print(f"Player sees question: {'QUESTION' in player_text}")

        browser.close()
        print("\n✓ Test complete")


if __name__ == "__main__":
    test_game()
