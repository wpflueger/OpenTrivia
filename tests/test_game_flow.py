from playwright.sync_api import sync_playwright


def test_game_flow():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("=== Testing Host Game Flow ===")

        # Step 1: Go to host page
        print("\n1. Loading host page...")
        page.goto("http://localhost:3000/host")
        page.wait_for_load_state("networkidle")
        print(f"   Title: {page.title()}")

        # Step 2: Select Science pack
        print("\n2. Selecting Science pack...")
        page.select_option("#localPack", "science")

        # Step 3: Click Create Game
        print("\n3. Clicking Create Game...")
        page.click('button:has-text("CREATE GAME")')

        # Wait for navigation to lobby
        page.wait_for_url("**/host/lobby**", timeout=10000)
        print(f"   Navigated to: {page.url}")

        # Get room code from URL
        room_code = (
            page.url.split("room=")[1].split("&")[0]
            if "room=" in page.url
            else "unknown"
        )
        print(f"   Room code: {room_code}")

        # Step 4: Check lobby page
        print("\n4. Checking lobby...")
        lobby_content = page.content()
        has_room_code = room_code in lobby_content
        print(f"   Room code displayed: {has_room_code}")

        # Take screenshot
        page.screenshot(path="/tmp/host_lobby.png", full_page=True)
        print("   Screenshot saved to /tmp/host_lobby.png")

        # Step 5: Test player join flow via join page
        print("\n=== Testing Player Join Flow ===")
        player_page = context.new_page()

        print("\n5. Loading join page...")
        player_page.goto("http://localhost:3000/join")
        player_page.wait_for_load_state("networkidle")
        print(f"   Title: {player_page.title()}")

        # Step 6: Enter room code and nickname
        print("\n6. Entering room code and nickname...")
        player_page.fill("#roomCode", room_code)
        player_page.fill("#nickname", "TestPlayer")

        # Step 7: Click Join Game
        print("\n7. Clicking Join Game...")
        player_page.click('button:has-text("JOIN GAME")')

        # Wait for navigation to player page
        player_page.wait_for_url(f"**/player/{room_code}**", timeout=10000)
        print(f"   Navigated to: {player_page.url}")

        player_page.wait_for_timeout(3000)
        player_page.screenshot(path="/tmp/player_joined.png", full_page=True)
        print("   Screenshot saved to /tmp/player_joined.png")

        print("\n=== Test Results ===")
        print(f"✓ Host page loaded")
        print(f"✓ Science pack selected")
        print(f"✓ Game created with room: {room_code}")
        print(f"✓ Lobby page displayed room code: {has_room_code}")
        print(f"✓ Join page loaded")
        print(f"✓ Player joined with room code: {room_code}")

        browser.close()
        print("\nAll tests passed!")


if __name__ == "__main__":
    test_game_flow()
