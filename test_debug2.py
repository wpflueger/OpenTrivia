from playwright.sync_api import sync_playwright

BASE_URL = "https://web-five-sage-83.vercel.app"


def test_full_game():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()

        # Track messages
        host_messages = []
        p1_messages = []
        p2_messages = []

        def host_console(msg):
            host_messages.append(f"[{msg.type}] {msg.text}")

        def p1_console(msg):
            p1_messages.append(f"[{msg.type}] {msg.text}")

        def p2_console(msg):
            p2_messages.append(f"[{msg.type}] {msg.text}")

        print("=== Testing Full Game ===\n")

        # HOST
        host_page = context.new_page()
        host_page.on("console", host_console)

        print("1. Host creating game...")
        host_page.goto(f"{BASE_URL}/host")
        host_page.wait_for_load_state("networkidle")
        host_page.select_option("#localPack", "science")
        host_page.click('button:has-text("CREATE GAME")')
        host_page.wait_for_url("**/host/lobby**", timeout=15000)
        room_code = host_page.url.split("room=")[1].split("&")[0]
        print(f"   ✓ Room: {room_code}")
        host_page.wait_for_timeout(2000)

        # Players join
        print("\n2. Players joining...")

        player1_page = context.new_page()
        player1_page.on("console", p1_console)
        player1_page.goto(f"{BASE_URL}/join")
        player1_page.wait_for_load_state("networkidle")
        player1_page.fill("#roomCode", room_code)
        player1_page.fill("#nickname", "Alice")
        player1_page.click('button:has-text("JOIN GAME")')
        player1_page.wait_for_url(f"**/player/{room_code}**", timeout=15000)
        player1_page.wait_for_timeout(5000)

        player2_page = context.new_page()
        player2_page.on("console", p2_console)
        player2_page.goto(f"{BASE_URL}/join")
        player2_page.wait_for_load_state("networkidle")
        player2_page.fill("#roomCode", room_code)
        player2_page.fill("#nickname", "Bob")
        player2_page.click('button:has-text("JOIN GAME")')
        player2_page.wait_for_url(f"**/player/{room_code}**", timeout=15000)
        player2_page.wait_for_timeout(5000)

        # Check player states using text content (rendered)
        print("\n3. Checking player connection states...")

        # Wait for rendered content
        player1_page.wait_for_timeout(1000)
        p1_text = player1_page.locator("body").inner_text()
        p2_text = player2_page.locator("body").inner_text()

        print(f"   Player 1 text: {p1_text[:200]}...")
        print(f"   Player 2 text: {p2_text[:200]}...")

        # Host starts game
        print("\n4. Starting game...")
        host_page.locator('button:has-text("START GAME")').click()

        # Wait for question
        host_page.wait_for_timeout(5000)

        # Check states after question
        host_text = host_page.locator("body").inner_text()
        p1_text = player1_page.locator("body").inner_text()
        p2_text = player2_page.locator("body").inner_text()

        print(f"\n=== After question ===")
        print(f"Host shows: {host_text[:200]}...")
        print(f"Player 1 shows: {p1_text[:200]}...")
        print(f"Player 2 shows: {p2_text[:200]}...")

        # Console logs
        print(f"\n=== Host console (last 3) ===")
        for m in host_messages[-3:]:
            print(f"  {m}")

        print(f"\n=== P1 console (last 3) ===")
        for m in p1_messages[-3:]:
            print(f"  {m}")

        print(f"\n=== P2 console (last 3) ===")
        for m in p2_messages[-3:]:
            print(f"  {m}")

        browser.close()


if __name__ == "__main__":
    test_full_game()
