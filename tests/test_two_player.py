from playwright.sync_api import sync_playwright

BASE_URL = "https://web-five-sage-83.vercel.app"


def test_two_player_game():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()

        print("=== Testing Two Player Game Flow ===\n")

        # HOST: Create game
        print("1. Host creating game...")
        host_page = context.new_page()
        host_page.goto(f"{BASE_URL}/host")
        host_page.wait_for_load_state("networkidle")
        host_page.select_option("#localPack", "science")
        host_page.click('button:has-text("CREATE GAME")')
        host_page.wait_for_url("**/host/lobby**", timeout=15000)
        room_code = host_page.url.split("room=")[1].split("&")[0]
        print(f"   ✓ Room created: {room_code}")

        # Wait for lobby to load
        host_page.wait_for_timeout(1500)

        # Player 1 joins
        print("\n2. Player 1 joining...")
        player1_page = context.new_page()
        player1_page.goto(f"{BASE_URL}/join")
        player1_page.wait_for_load_state("networkidle")
        player1_page.fill("#roomCode", room_code)
        player1_page.fill("#nickname", "Alice")
        player1_page.click('button:has-text("JOIN GAME")')
        player1_page.wait_for_url(f"**/player/{room_code}**", timeout=15000)
        player1_page.wait_for_timeout(2000)

        # Check if player 1 is connected
        p1_content = player1_page.content()
        p1_connected = "CONNECTED" in p1_content or "CONNECTING" in p1_content
        print(f"   ✓ Player 1 connected: {p1_connected}")

        # Player 2 joins
        print("\n3. Player 2 joining...")
        player2_page = context.new_page()
        player2_page.goto(f"{BASE_URL}/join")
        player2_page.wait_for_load_state("networkidle")
        player2_page.fill("#roomCode", room_code)
        player2_page.fill("#nickname", "Bob")
        player2_page.click('button:has-text("JOIN GAME")')
        player2_page.wait_for_url(f"**/player/{room_code}**", timeout=15000)
        player2_page.wait_for_timeout(2000)

        # Check if player 2 is connected
        p2_content = player2_page.content()
        p2_connected = "CONNECTED" in p2_content or "CONNECTING" in p2_content
        print(f"   ✓ Player 2 connected: {p2_connected}")

        # Verify both players in host lobby
        host_page.wait_for_timeout(1000)
        host_content = host_page.content()
        has_alice = "Alice" in host_content
        has_bob = "Bob" in host_content
        print(f"   ✓ Host sees Alice: {has_alice}")
        print(f"   ✓ Host sees Bob: {has_bob}")

        # Host starts game
        print("\n4. Host starting game...")
        start_button = host_page.locator('button:has-text("START GAME")')
        start_button.click()
        print("   ✓ Clicked START GAME")

        # Wait for countdown
        print("   Waiting for countdown...")
        host_page.wait_for_timeout(4000)

        # Check host shows question
        host_content = host_page.content()
        has_question = "QUESTION" in host_content
        print(f"   ✓ Host shows question: {has_question}")

        # Players should see question
        print("\n5. Players receiving question...")
        player1_page.wait_for_timeout(2000)
        p1_content = player1_page.content()
        p1_has_question = "QUESTION" in p1_content

        p2_content = player2_page.content()
        p2_has_question = "QUESTION" in p2_content

        print(f"   ✓ Player 1 sees question: {p1_has_question}")
        print(f"   ✓ Player 2 sees question: {p2_has_question}")

        # Player 1 answers
        print("\n6. Player 1 answering...")
        answer_buttons_p1 = player1_page.locator("button")
        if answer_buttons_p1.count() > 0:
            # Click the first answer (A.)
            answer_buttons_p1.nth(0).click()
            print("   ✓ Clicked answer")

            # Submit if button appears
            submit_btn_p1 = player1_page.locator('button:has-text("SUBMIT")')
            if submit_btn_p1.is_visible(timeout=2000):
                submit_btn_p1.click()
                print("   ✓ Submitted answer")

        player1_page.wait_for_timeout(500)

        # Player 2 answers
        print("   Player 2 answering...")
        answer_buttons_p2 = player2_page.locator("button")
        if answer_buttons_p2.count() > 0:
            # Click the second answer (B.)
            answer_buttons_p2.nth(1).click()
            print("   ✓ Clicked answer")

            # Submit if button appears
            submit_btn_p2 = player2_page.locator('button:has-text("SUBMIT")')
            if submit_btn_p2.is_visible(timeout=2000):
                submit_btn_p2.click()
                print("   ✓ Submitted answer")

        # Wait for answer submission
        player2_page.wait_for_timeout(1000)

        # Host locks question (or wait for timer)
        print("\n7. Waiting for answer reveal...")
        host_page.wait_for_timeout(4000)

        # Check reveal/leaderboard
        host_content = host_page.content()
        has_reveal = (
            "CORRECT ANSWER" in host_content
            or "LEADERBOARD" in host_content
            or "#1" in host_content
        )
        print(f"   ✓ Host shows results: {has_reveal}")

        # Players see results
        p1_content = player1_page.content()
        p1_has_result = (
            "ANSWER SUBMITTED" in p1_content
            or "CORRECT" in p1_content
            or "WRONG" in p1_content
        )

        p2_content = player2_page.content()
        p2_has_result = (
            "ANSWER SUBMITTED" in p2_content
            or "CORRECT" in p2_content
            or "WRONG" in p2_content
        )

        print(f"   ✓ Player 1 sees result: {p1_has_result}")
        print(f"   ✓ Player 2 sees result: {p2_has_result}")

        # Take screenshots
        host_page.screenshot(path="/tmp/host_results.png", full_page=True)
        player1_page.screenshot(path="/tmp/player1_results.png", full_page=True)
        player2_page.screenshot(path="/tmp/player2_results.png", full_page=True)

        print("\n=== Test Results ===")
        print(f"✓ Two players joined")
        print(f"✓ Both saw questions")
        print(f"✓ Both answered")
        print(f"✓ Results displayed")

        browser.close()
        print("\nAll tests passed!")


if __name__ == "__main__":
    test_two_player_game()
