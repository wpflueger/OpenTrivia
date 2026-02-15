import re

from playwright.sync_api import sync_playwright

BASE_URL = "https://web-five-sage-83.vercel.app"


def extract_scores(rows):
    scores = []
    for row in rows:
        match = re.search(r"(\d+)\s*$", row)
        if match:
            scores.append(int(match.group(1)))
    return scores


def test_ten_player_full_game_flow():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()

        print("=== Testing 10-Player Full Game Flow ===\n")

        host_page = context.new_page()
        host_page.goto(f"{BASE_URL}/host")
        host_page.wait_for_load_state("networkidle")
        host_page.select_option("#localPack", "science")
        host_page.click('button:has-text("CREATE GAME")')
        host_page.wait_for_url("**/host/lobby**", timeout=20000)

        room_code = host_page.url.split("room=")[1].split("&")[0]
        print(f"Host room: {room_code}")

        players = {}
        nicknames = [f"Player{i:02d}" for i in range(1, 11)]

        print("Joining 10 players...")
        for nickname in nicknames:
            player_page = context.new_page()
            player_page.goto(f"{BASE_URL}/join")
            player_page.wait_for_load_state("networkidle")
            player_page.fill("#roomCode", room_code)
            player_page.fill("#nickname", nickname)
            player_page.click('button:has-text("JOIN GAME")')
            player_page.wait_for_url(f"**/player/{room_code}**", timeout=20000)
            players[nickname] = player_page

        host_lobby_text = ""
        for _ in range(3):
            for _ in range(20):
                host_lobby_text = host_page.locator("body").inner_text()
                if all(nickname in host_lobby_text for nickname in nicknames):
                    break
                host_page.wait_for_timeout(600)

            missing = [
                nickname for nickname in nicknames if nickname not in host_lobby_text
            ]
            if not missing:
                break

            for nickname in missing:
                retry_page = players[nickname]
                retry_page.reload()
                retry_page.wait_for_url(f"**/player/{room_code}**", timeout=20000)

            host_page.wait_for_timeout(1500)

        for nickname in nicknames:
            assert nickname in host_lobby_text
        print("All 10 players joined and visible in lobby")

        ready_text = host_lobby_text
        for _ in range(40):
            ready_text = host_page.locator("body").inner_text()
            ready_match = re.search(r"(\d+)/(\d+) ready", ready_text)
            if ready_match and int(ready_match.group(1)) >= 5:
                break
            host_page.wait_for_timeout(500)

        ready_match = re.search(r"(\d+)/(\d+) ready", ready_text)
        assert ready_match is not None
        ready_count = int(ready_match.group(1))
        assert ready_count >= 5
        print(f"Players ready before start: {ready_count}")

        host_page.click('button:has-text("START GAME")')
        host_page.wait_for_timeout(5000)

        question_round = 0
        leaderboard_verified = False

        for _ in range(120):
            host_text = host_page.locator("body").inner_text()

            if "GAME OVER" in host_text:
                break

            if host_page.locator('button:has-text("NEXT QUESTION")').is_visible(
                timeout=500
            ):
                leaderboard_text = host_page.locator("body").inner_text()
                for nickname in nicknames:
                    assert nickname in leaderboard_text

                leaderboard_rows = host_page.locator(
                    ".cyber-leaderboard-row"
                ).all_inner_texts()
                scores = extract_scores(leaderboard_rows)
                if len(scores) >= 2:
                    assert scores == sorted(scores, reverse=True)
                leaderboard_verified = True

                host_page.click('button:has-text("NEXT QUESTION")')
                host_page.wait_for_timeout(4500)
                question_round += 1
                continue

            if host_page.locator('button:has-text("SEE RESULTS")').is_visible(
                timeout=500
            ):
                host_page.click('button:has-text("SEE RESULTS")')
                host_page.wait_for_timeout(3500)
                continue

            is_question = "QUESTION" in host_text and (
                "REVEAL ANSWERS" in host_text or "LOCK ANSWERS" in host_text
            )

            if is_question:
                for idx, nickname in enumerate(nicknames):
                    player_page = players[nickname]
                    player_text = player_page.locator("body").inner_text()
                    if "QUESTION" not in player_text:
                        continue

                    answer_buttons = player_page.locator("button").all()
                    if len(answer_buttons) == 0:
                        continue

                    answer_index = (idx + question_round) % len(answer_buttons)
                    answer_buttons[answer_index].click()

                    submit_button = player_page.locator(
                        'button:has-text("SUBMIT ANSWER")'
                    )
                    if submit_button.is_visible(timeout=1000):
                        submit_button.click()

                observed_answered = 0
                for _ in range(10):
                    sync_text = host_page.locator("body").inner_text()
                    answered_match = re.search(r"(\d+)/10\s+ANSWERED", sync_text)
                    if answered_match:
                        observed_answered = int(answered_match.group(1))
                    if observed_answered >= 3:
                        break
                    host_page.wait_for_timeout(300)

                if observed_answered == 0:
                    host_page.wait_for_timeout(800)
                    continue

                if host_page.locator('button:has-text("REVEAL ANSWERS")').is_visible(
                    timeout=1000
                ):
                    host_page.click('button:has-text("REVEAL ANSWERS")')
                else:
                    host_page.click('button:has-text("LOCK ANSWERS")')

                host_page.wait_for_timeout(3500)

                reveal_text = host_page.locator("body").inner_text()
                if "CORRECT ANSWER" in reveal_text:
                    if host_page.locator('button:has-text("NEXT QUESTION")').is_visible(
                        timeout=2000
                    ):
                        continue

                    if host_page.locator('button:has-text("SEE RESULTS")').is_visible(
                        timeout=2000
                    ):
                        continue

            host_page.wait_for_timeout(1000)

        final_host_text = host_page.locator("body").inner_text()
        assert "GAME OVER" in final_host_text
        assert "🥇" in final_host_text or "#1" in final_host_text
        assert leaderboard_verified

        for nickname in nicknames:
            assert nickname in final_host_text

        final_rows = host_page.locator(".cyber-leaderboard-row").all_inner_texts()
        final_scores = extract_scores(final_rows)
        assert len(final_scores) >= 2
        assert final_scores == sorted(final_scores, reverse=True)

        print("Game finished with winner shown and sorted leaderboard")

        browser.close()
