from playwright.sync_api import sync_playwright

BASE_URL = "https://web-five-sage-83.vercel.app"


def test_two_player_with_debug():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()

        # Capture console messages
        host_console = []
        player1_console = []
        player2_console = []

        def capture_host_console(msg):
            host_console.append(f"[{msg.type}] {msg.text}")

        def capture_p1_console(msg):
            player1_console.append(f"[{msg.type}] {msg.text}")

        def capture_p2_console(msg):
            player2_console.append(f"[{msg.type}] {msg.text}")

        print("=== Testing Two Player Game Flow ===\n")

        # HOST
        host_page = context.new_page()
        host_page.on("console", capture_host_console)

        print("1. Host creating game...")
        host_page.goto(f"{BASE_URL}/host")
        host_page.wait_for_load_state("networkidle")
        host_page.select_option("#localPack", "science")
        host_page.click('button:has-text("CREATE GAME")')
        host_page.wait_for_url("**/host/lobby**", timeout=15000)
        room_code = host_page.url.split("room=")[1].split("&")[0]
        print(f"   ✓ Room: {room_code}")
        host_page.wait_for_timeout(1500)

        # Player 1
        player1_page = context.new_page()
        player1_page.on("console", capture_p1_console)

        print("\n2. Player 1 joining...")
        player1_page.goto(f"{BASE_URL}/join")
        player1_page.wait_for_load_state("networkidle")
        player1_page.fill("#roomCode", room_code)
        player1_page.fill("#nickname", "Alice")
        player1_page.click('button:has-text("JOIN GAME")')
        player1_page.wait_for_url(f"**/player/{room_code}**", timeout=15000)
        player1_page.wait_for_timeout(3000)

        # Player 2
        player2_page = context.new_page()
        player2_page.on("console", capture_p2_console)

        print("3. Player 2 joining...")
        player2_page.goto(f"{BASE_URL}/join")
        player2_page.wait_for_load_state("networkidle")
        player2_page.fill("#roomCode", room_code)
        player2_page.fill("#nickname", "Bob")
        player2_page.click('button:has-text("JOIN GAME")')
        player2_page.wait_for_url(f"**/player/{room_code}**", timeout=15000)
        player2_page.wait_for_timeout(3000)

        # Check player connection status
        p1_content = player1_page.content()
        p2_content = player2_page.content()

        print(
            f"   Player 1 content check: connected={'CONNECTED' in p1_content}, connecting={'CONNECTING' in p1_content}"
        )
        print(
            f"   Player 2 content check: connected={'CONNECTED' in p2_content}, connecting={'CONNECTING' in p2_content}"
        )

        # Host starts game
        print("\n4. Starting game...")
        start_button = host_page.locator('button:has-text("START GAME")')
        start_button.click()

        # Wait for game
        print("   Waiting for question...")
        host_page.wait_for_timeout(5000)

        # Check states
        host_content = host_page.content()
        p1_content = player1_page.content()
        p2_content = player2_page.content()

        print(f"\n=== State Check ===")
        print(f"Host shows question: {'QUESTION' in host_content}")
        print(f"Player 1 shows: {p1_content[:500]}...")
        print(f"Player 2 shows: {p2_content[:500]}...")

        print(f"\n=== Console Logs ===")
        print("Host console (last 5):")
        for msg in host_console[-5:]:
            print(f"  {msg}")

        print("\nPlayer 1 console (last 5):")
        for msg in player1_console[-5:]:
            print(f"  {msg}")

        print("\nPlayer 2 console (last 5):")
        for msg in player2_console[-5:]:
            print(f"  {msg}")

        browser.close()


if __name__ == "__main__":
    test_two_player_with_debug()
