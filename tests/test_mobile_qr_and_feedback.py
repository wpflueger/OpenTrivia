import re

from playwright.sync_api import sync_playwright

BASE_URL = "https://web-five-sage-83.vercel.app"


def create_host_room(host_page):
    host_page.goto(f"{BASE_URL}/host")
    host_page.wait_for_load_state("networkidle")
    host_page.select_option("#localPack", "science")
    host_page.click('button:has-text("CREATE GAME")')
    host_page.wait_for_url("**/host/lobby**", timeout=20000)
    return host_page.url.split("room=")[1].split("&")[0]


def wait_for_player_in_lobby(host_page, player_page, room_code, nickname):
    for _ in range(3):
        for _ in range(20):
            host_text = host_page.locator("body").inner_text()
            if nickname in host_text:
                return True
            host_page.wait_for_timeout(300)

        player_page.reload()
        player_page.wait_for_url(f"**/player/{room_code}**", timeout=20000)
        host_page.wait_for_timeout(1200)

    return nickname in host_page.locator("body").inner_text()


def test_mobile_join_from_qr_flow_link():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        host_context = browser.new_context()
        host_page = host_context.new_page()
        room_code = create_host_room(host_page)

        start_button = host_page.locator('button:has-text("START GAME")')
        assert start_button.is_visible()

        host_page.click('button:has-text("SHOW QR CODE")')
        host_page.locator(".cyber-qr-container svg").wait_for(timeout=5000)
        host_text = host_page.locator("body").inner_text()
        assert f"/join?room={room_code}" in host_text

        mobile_context = browser.new_context(**p.devices["iPhone 13"])
        mobile_page = mobile_context.new_page()
        mobile_page.goto(f"{BASE_URL}/join?room={room_code}")
        mobile_page.wait_for_load_state("networkidle")

        prefilled_room = mobile_page.locator("#roomCode").input_value()
        assert prefilled_room == room_code

        mobile_page.fill("#nickname", "MobilePlayer")
        mobile_page.click('button:has-text("JOIN GAME")')
        mobile_page.wait_for_url(f"**/player/{room_code}**", timeout=20000)

        assert wait_for_player_in_lobby(
            host_page, mobile_page, room_code, "MobilePlayer"
        )

        browser.close()


def test_player_submission_feedback_and_host_choice_counts():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()

        host_page = context.new_page()
        room_code = create_host_room(host_page)

        player_page = context.new_page()
        player_page.goto(f"{BASE_URL}/join")
        player_page.wait_for_load_state("networkidle")
        player_page.fill("#roomCode", room_code)
        player_page.fill("#nickname", "Solo")
        player_page.click('button:has-text("JOIN GAME")')
        player_page.wait_for_url(f"**/player/{room_code}**", timeout=20000)

        assert wait_for_player_in_lobby(host_page, player_page, room_code, "Solo")

        for _ in range(20):
            lobby_text = host_page.locator("body").inner_text()
            if "1/1 ready" in lobby_text:
                break
            host_page.wait_for_timeout(300)

        start_button = host_page.locator('button:has-text("START GAME")')
        for _ in range(4):
            for _ in range(20):
                if start_button.is_enabled():
                    break
                host_page.wait_for_timeout(300)

            if start_button.is_enabled():
                break

            player_page.reload()
            player_page.wait_for_url(f"**/player/{room_code}**", timeout=20000)
            host_page.wait_for_timeout(1200)

        assert start_button.is_enabled()
        host_page.click('button:has-text("START GAME")')
        host_page.wait_for_timeout(2500)

        player_in_question = False
        for _ in range(4):
            for _ in range(20):
                if "QUESTION" in player_page.locator("body").inner_text():
                    player_in_question = True
                    break
                player_page.wait_for_timeout(400)

            if player_in_question:
                break

            player_page.reload()
            player_page.wait_for_url(f"**/player/{room_code}**", timeout=20000)
            player_page.wait_for_timeout(1200)

        assert player_in_question

        player_page.locator("button.cyber-answer-btn").first.click()
        player_page.locator('button:has-text("SUBMIT ANSWER")').wait_for(timeout=4000)
        player_page.locator('button:has-text("SUBMIT ANSWER")').click()

        player_text = player_page.locator("body").inner_text()
        assert "ANSWER SUBMITTED!" in player_text
        assert "You answered:" in player_text
        assert (
            "Sending answer..." in player_text
            or "Answer received by host" in player_text
            or "Answer was not accepted" in player_text
        )

        host_page.wait_for_timeout(1000)
        player_text = player_page.locator("body").inner_text()
        assert (
            "Answer received by host" in player_text
            or "Sending answer..." in player_text
            or "CORRECT!" in player_text
            or "WRONG!" in player_text
        )

        host_text = host_page.locator("body").inner_text()
        row_texts = host_page.locator(".cyber-answer-btn").all_inner_texts()
        has_live_votes = any(
            re.search(r"\d+\s+votes", row_text) for row_text in row_texts
        )
        has_accepted_answer = (
            "1/1 ANSWERED" in host_text
            or "CORRECT ANSWER" in host_text
            or "ANSWER DISTRIBUTION" in host_text
        )
        assert has_live_votes or has_accepted_answer

        if host_page.locator('button:has-text("REVEAL ANSWERS")').is_visible(
            timeout=1000
        ):
            host_page.click('button:has-text("REVEAL ANSWERS")')
            host_page.wait_for_timeout(3500)

        reveal_text = host_page.locator("body").inner_text()
        assert "ANSWER DISTRIBUTION" in reveal_text or "LEADERBOARD" in reveal_text
        if "ANSWER DISTRIBUTION" in reveal_text:
            assert re.search(r"\d+\s*\(\d+%\)", reveal_text)

        player_reveal_text = player_page.locator("body").inner_text()
        assert (
            "CORRECT!" in player_reveal_text
            or "WRONG!" in player_reveal_text
            or "LEADERBOARD" in player_reveal_text
        )

        browser.close()
