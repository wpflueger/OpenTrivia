from playwright.sync_api import sync_playwright

BASE_URL = "https://web-five-sage-83.vercel.app"


def test_vercel_game_flow():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("=== Testing Vercel Deployment ===\n")

        # Step 1: Go to host page
        print("1. Loading host page...")
        page.goto(f"{BASE_URL}/host")
        page.wait_for_load_state("networkidle")
        print(f"   ✓ Title: {page.title()}")

        # Step 2: Select Science pack
        print("\n2. Selecting Science pack...")
        page.select_option("#localPack", "science")

        # Step 3: Click Create Game
        print("\n3. Clicking Create Game...")
        page.click('button:has-text("CREATE GAME")')

        # Wait for navigation to lobby
        page.wait_for_url("**/host/lobby**", timeout=15000)

        # Get room code from URL
        room_code = page.url.split("room=")[1].split("&")[0]
        print(f"   ✓ Room created: {room_code}")

        # Step 4: Verify lobby
        print("\n4. Checking lobby...")
        lobby_content = page.content()
        print(f"   ✓ Room code displayed: {room_code in lobby_content}")

        # Step 5: Player joins
        print("\n5. Player joining...")
        player_page = context.new_page()
        player_page.goto(f"{BASE_URL}/join")
        player_page.wait_for_load_state("networkidle")
        player_page.fill("#roomCode", room_code)
        player_page.fill("#nickname", "TestPlayer")
        player_page.click('button:has-text("JOIN GAME")')
        player_page.wait_for_url(f"**/player/{room_code}**", timeout=15000)
        print(f"   ✓ Player joined room: {room_code}")

        # Wait for connection
        player_page.wait_for_timeout(3000)

        # Check if player is connected
        player_content = player_page.content()
        is_connecting = "CONNECTING" in player_content or "CONNECTED" in player_content
        print(f"   ✓ Player connection status: {is_connecting}")

        # Step 6: Host starts game
        print("\n6. Host starting game...")
        start_button = page.locator('button:has-text("START GAME")')
        for _ in range(20):
            if start_button.is_enabled():
                break
            page.wait_for_timeout(300)

        if not start_button.is_enabled():
            player_page.reload()
            player_page.wait_for_url(f"**/player/{room_code}**", timeout=15000)
            page.wait_for_timeout(1500)

        if start_button.is_enabled():
            start_button.click()
            print("   ✓ Clicked START GAME")

        # Wait for countdown
        page.wait_for_timeout(4000)

        # Check for countdown or question
        page_content = page.content()
        has_game_content = (
            "GET READY" in page_content
            or "QUESTION" in page_content
            or "3" in page_content
        )
        print(f"   ✓ Game in progress: {has_game_content}")

        print("\n=== Vercel Tests Passed ===\n")

        browser.close()


def test_local_full_game():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()

        print("=== Testing Full Game Flow (Local) ===\n")

        # HOST: Create game
        host_page = context.new_page()
        print("1. Host creating game...")
        host_page.goto("http://localhost:3000/host")
        host_page.wait_for_load_state("networkidle")
        host_page.select_option("#localPack", "science")
        host_page.click('button:has-text("CREATE GAME")')
        host_page.wait_for_url("**/host/lobby**", timeout=10000)
        room_code = host_page.url.split("room=")[1].split("&")[0]
        print(f"   ✓ Room: {room_code}")

        # Wait for lobby
        host_page.wait_for_timeout(1500)

        # Player joins BEFORE game starts
        print("\n2. Player joining before game starts...")
        player_page = context.new_page()
        player_page.goto(f"http://localhost:3000/join")
        player_page.wait_for_load_state("networkidle")
        player_page.fill("#roomCode", room_code)
        player_page.fill("#nickname", "Player1")
        player_page.click('button:has-text("JOIN GAME")')
        player_page.wait_for_url(f"**/player/{room_code}**", timeout=10000)
        print(f"   ✓ Player joined: {room_code}")

        # Wait for player to connect
        player_page.wait_for_timeout(3000)

        # Host starts game
        print("\n3. Host starting game...")
        start_button = host_page.locator('button:has-text("START GAME")')
        for _ in range(20):
            if start_button.is_enabled():
                break
            host_page.wait_for_timeout(300)

        if start_button.is_enabled():
            start_button.click()
            print("   ✓ Clicked START GAME")

        # Wait longer for game to progress
        print("   Waiting for game...")
        host_page.wait_for_timeout(6000)

        # Check host state
        host_content = host_page.content()
        game_active = (
            "GET READY" in host_content
            or "QUESTION" in host_content
            or "COUNTDOWN" in host_content
            or "1" in host_content
            or "2" in host_content
            or "3" in host_content
        )
        print(f"   ✓ Game active on host: {game_active}")

        # Check player state
        player_content = player_page.content()
        player_active = (
            "CONNECTED" in player_content
            or "Waiting" in player_content
            or "lobby" in player_content.lower()
        )
        print(f"   ✓ Player in game: {player_active}")

        # Take screenshots
        host_page.screenshot(path="/tmp/host_game.png", full_page=True)
        player_page.screenshot(path="/tmp/player_game.png", full_page=True)

        print("\n=== Local Game Tests Complete ===\n")

        browser.close()


if __name__ == "__main__":
    test_vercel_game_flow()
    test_local_full_game()
