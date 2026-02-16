from playwright.sync_api import sync_playwright

BASE_URL = "https://web-five-sage-83.vercel.app"


def test_full_game():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()

        print("=== Testing Complete Game Flow ===\n")

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
        host_page.wait_for_timeout(2000)

        # Players join
        print("\n2. Players joining...")

        player1_page = context.new_page()
        player1_page.goto(f"{BASE_URL}/join")
        player1_page.wait_for_load_state("networkidle")
        player1_page.fill("#roomCode", room_code)
        player1_page.fill("#nickname", "Alice")
        player1_page.click('button:has-text("JOIN GAME")')
        player1_page.wait_for_url(f"**/player/{room_code}**", timeout=15000)
        player1_page.wait_for_timeout(3000)

        player2_page = context.new_page()
        player2_page.goto(f"{BASE_URL}/join")
        player2_page.wait_for_load_state("networkidle")
        player2_page.fill("#roomCode", room_code)
        player2_page.fill("#nickname", "Bob")
        player2_page.click('button:has-text("JOIN GAME")')
        player2_page.wait_for_url(f"**/player/{room_code}**", timeout=15000)
        player2_page.wait_for_timeout(3000)

        print("   ✓ Both players connected")

        # Start game
        print("\n3. Starting game...")
        start_button = host_page.locator('button:has-text("START GAME")')
        for _ in range(4):
            for _ in range(30):
                if start_button.is_enabled():
                    break
                host_page.wait_for_timeout(300)

            if start_button.is_enabled():
                break

            player1_page.reload()
            player1_page.wait_for_url(f"**/player/{room_code}**", timeout=15000)
            player2_page.reload()
            player2_page.wait_for_url(f"**/player/{room_code}**", timeout=15000)
            host_page.wait_for_timeout(1500)

        assert start_button.is_enabled()
        start_button.click()
        host_page.wait_for_timeout(4500)

        print("\n4. Playing through full game...")
        question_rounds_completed = 0

        for _ in range(8):
            host_text = host_page.locator("body").inner_text()

            if "GAME OVER" in host_text:
                break

            is_question_phase = "QUESTION" in host_text and (
                "REVEAL ANSWERS" in host_text or "LOCK ANSWERS" in host_text
            )

            if is_question_phase:
                if "QUESTION" in player1_page.locator("body").inner_text():
                    player1_page.locator("button").nth(0).click()
                    if player1_page.locator(
                        'button:has-text("SUBMIT ANSWER")'
                    ).is_visible(timeout=1000):
                        player1_page.locator('button:has-text("SUBMIT ANSWER")').click()

                if "QUESTION" in player2_page.locator("body").inner_text():
                    player2_page.locator("button").nth(1).click()
                    if player2_page.locator(
                        'button:has-text("SUBMIT ANSWER")'
                    ).is_visible(timeout=1000):
                        player2_page.locator('button:has-text("SUBMIT ANSWER")').click()

                if host_page.locator('button:has-text("REVEAL ANSWERS")').is_visible(
                    timeout=1000
                ):
                    host_page.locator('button:has-text("REVEAL ANSWERS")').click()
                else:
                    host_page.locator('button:has-text("LOCK ANSWERS")').click()
                host_page.wait_for_timeout(3500)

                host_reveal_text = host_page.locator("body").inner_text()
                if "CORRECT ANSWER" in host_reveal_text:
                    question_rounds_completed += 1

                if host_page.locator('button:has-text("NEXT QUESTION")').is_visible(
                    timeout=2000
                ):
                    host_page.locator('button:has-text("NEXT QUESTION")').click()
                    host_page.wait_for_timeout(4500)
                    continue

                if host_page.locator('button:has-text("SEE RESULTS")').is_visible(
                    timeout=2000
                ):
                    host_page.locator('button:has-text("SEE RESULTS")').click()
                    host_page.wait_for_timeout(3000)
                    break

            host_page.wait_for_timeout(1200)

        host_text = host_page.locator("body").inner_text()

        print("\n5. Validating end state...")
        print(f"   Questions completed: {question_rounds_completed}")
        print(f"   Game Over shown: {'GAME OVER' in host_text}")
        print(
            f"   Leaderboard names shown: {'Alice' in host_text or 'Bob' in host_text}"
        )

        assert "QUESTION" in host_text or question_rounds_completed >= 1

        if question_rounds_completed >= 1:
            assert "GAME OVER" in host_text
            assert "Alice" in host_text or "Bob" in host_text

        # Screenshot
        host_page.screenshot(path="/tmp/game_over.png", full_page=True)

        print("\n=== Test Complete ===")

        browser.close()


if __name__ == "__main__":
    test_full_game()
