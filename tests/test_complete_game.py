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
        host_page.locator('button:has-text("START GAME")').click()
        host_page.wait_for_timeout(4000)

        # Players see question
        print("\n4. Players answering...")
        p1_text = player1_page.locator("body").inner_text()
        p2_text = player2_page.locator("body").inner_text()

        if "QUESTION" in p1_text:
            # Alice clicks first answer
            player1_page.locator("button").nth(0).click()
            print("   ✓ Alice answered")

            # Submit if button appears
            if player1_page.locator('button:has-text("SUBMIT")').is_visible():
                player1_page.locator('button:has-text("SUBMIT")').click()
                print("   ✓ Alice submitted")

        if "QUESTION" in p2_text:
            # Bob clicks second answer
            player2_page.locator("button").nth(1).click()
            print("   ✓ Bob answered")

            if player2_page.locator('button:has-text("SUBMIT")').is_visible():
                player2_page.locator('button:has-text("SUBMIT")').click()
                print("   ✓ Bob submitted")

        # Wait for reveal
        host_page.wait_for_timeout(5000)

        print("\n5. Checking results...")
        host_text = host_page.locator("body").inner_text()

        print(
            f"   Host shows answers: {'ANSWERED' in host_text or '1/2' in host_text or '2/2' in host_text}"
        )

        # Host reveals answer
        if host_page.locator('button:has-text("LOCK ANSWERS")').is_visible():
            host_page.locator('button:has-text("LOCK ANSWERS")').click()
            print("   ✓ Host locked answers")

        host_page.wait_for_timeout(3000)

        host_text = host_page.locator("body").inner_text()
        print(
            f"   Host shows correct answer: {'CORRECT' in host_text or '#1' in host_text}"
        )

        # Check if leaderboard shows
        if host_page.locator('button:has-text("NEXT QUESTION")').is_visible():
            print("   ✓ Leaderboard displayed")

        # End game (click through questions)
        print("\n6. Finishing game...")
        while host_page.locator('button:has-text("NEXT QUESTION")').is_visible(
            timeout=3000
        ):
            host_page.locator('button:has-text("NEXT QUESTION")').click()
            host_page.wait_for_timeout(4000)

            # Answer questions
            if player1_page.locator("button").count() > 0:
                player1_page.locator("button").first.click()
                if player1_page.locator('button:has-text("SUBMIT")').is_visible(
                    timeout=1000
                ):
                    player1_page.locator('button:has-text("SUBMIT")').click()

            if player2_page.locator("button").count() > 0:
                player2_page.locator("button").first.click()
                if player2_page.locator('button:has-text("SUBMIT")').is_visible(
                    timeout=1000
                ):
                    player2_page.locator('button:has-text("SUBMIT")').click()

            # Lock/next
            if host_page.locator('button:has-text("LOCK ANSWERS")').is_visible(
                timeout=1000
            ):
                host_page.locator('button:has-text("LOCK ANSWERS")').click()

        # Check for game over
        host_page.wait_for_timeout(2000)
        host_text = host_page.locator("body").inner_text()

        print(f"\n=== Results ===")
        print(f"Game Over shown: {'GAME OVER' in host_text}")
        print(f"Leaderboard shown: {'Alice' in host_text or 'Bob' in host_text}")

        # Screenshot
        host_page.screenshot(path="/tmp/game_over.png", full_page=True)

        print("\n=== Test Complete ===")

        browser.close()


if __name__ == "__main__":
    test_full_game()
