from playwright.sync_api import sync_playwright

BASE_URL = "https://web-five-sage-83.vercel.app"


def test_full_game():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()

        print("=== Testing Full Game Flow ===\n")

        # HOST
        host_page = context.new_page()

        print("1. Host creating game...")
        host_page.goto(f"{BASE_URL}/host")
        host_page.wait_for_load_state("networkidle")
        host_page.select_option("#localPack", "science")
        host_page.click('button:has-text("CREATE GAME")')
        host_page.wait_for_url("**/host/lobby**", timeout=15000)
        room_code = host_page.url.split("room=")[1].split("&")[0]
        print(f"   ✓ Room: {room_code}")

        # Wait for lobby
        host_page.wait_for_timeout(2000)

        # Player 1 joins
        print("\n2. Player 1 joining...")
        player1_page = context.new_page()
        player1_page.goto(f"{BASE_URL}/join")
        player1_page.wait_for_load_state("networkidle")
        player1_page.fill("#roomCode", room_code)
        player1_page.fill("#nickname", "Alice")
        player1_page.click('button:has-text("JOIN GAME")')
        player1_page.wait_for_url(f"**/player/{room_code}**", timeout=15000)

        # Wait longer for connection
        print("   Waiting for WebRTC connection...")
        player1_page.wait_for_timeout(5000)

        # Check if connected
        p1_content = player1_page.content()
        p1_connected = "CONNECTED" in p1_content
        p1_connecting = "CONNECTING" in p1_content
        print(f"   Player 1: connected={p1_connected}, connecting={p1_connecting}")

        # Host should see player 1
        host_page.wait_for_timeout(1000)
        host_content = host_page.content()
        has_alice = "Alice" in host_content
        print(f"   Host sees Alice: {has_alice}")

        # Player 2 joins
        print("\n3. Player 2 joining...")
        player2_page = context.new_page()
        player2_page.goto(f"{BASE_URL}/join")
        player2_page.wait_for_load_state("networkidle")
        player2_page.fill("#roomCode", room_code)
        player2_page.fill("#nickname", "Bob")
        player2_page.click('button:has-text("JOIN GAME")')
        player2_page.wait_for_url(f"**/player/{room_code}**", timeout=15000)

        print("   Waiting for WebRTC connection...")
        player2_page.wait_for_timeout(5000)

        p2_content = player2_page.content()
        p2_connected = "CONNECTED" in p2_content
        p2_connecting = "CONNECTING" in p2_content
        print(f"   Player 2: connected={p2_connected}, connecting={p2_connecting}")

        # Host should see both
        host_page.wait_for_timeout(1000)
        host_content = host_page.content()
        has_alice = "Alice" in host_content
        has_bob = "Bob" in host_content
        print(f"   Host sees both: Alice={has_alice}, Bob={has_bob}")

        # Host starts game
        print("\n4. Starting game...")
        start_button = host_page.locator('button:has-text("START GAME")')
        if start_button.is_visible(timeout=5000):
            start_button.click()
            print("   ✓ Started game")

        # Wait for question
        print("   Waiting for question...")
        host_page.wait_for_timeout(5000)

        # Check states
        host_content = host_page.content()
        p1_content = player1_page.content()
        p2_content = player2_page.content()

        print(f"\n=== After 5 seconds ===")
        print(f"Host shows question: {'QUESTION' in host_content}")
        print(f"Player 1 connected: {'CONNECTED' in p1_content}")
        print(f"Player 2 connected: {'CONNECTED' in p2_content}")

        # Wait more and check again
        print("\n   Waiting more...")
        host_page.wait_for_timeout(5000)

        host_content = host_page.content()
        p1_content = player1_page.content()
        p2_content = player2_page.content()

        print(f"\n=== After 10 seconds total ===")
        print(f"Host shows question: {'QUESTION' in host_content}")
        print(f"Player 1 shows: {p1_content[100:300]}...")
        print(f"Player 2 shows: {p2_content[100:300]}...")

        # Take screenshots
        host_page.screenshot(path="/tmp/host_final.png", full_page=True)

        print("\n=== Test Complete ===")

        browser.close()


if __name__ == "__main__":
    test_full_game()
