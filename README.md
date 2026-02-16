# OpenTrivia

OpenTrivia is an open-source, host-led trivia game platform (open alternative to Kahoot).

## What it does

- Host creates a room and controls game flow.
- Players join by room code or QR/join link on mobile or desktop.
- Real-time gameplay runs over WebRTC data channels with host-authoritative scoring.
- Packs can be loaded from local curated packs or Git-based pack sources.

## Current gameplay highlights

- Countdown -> question -> reveal -> leaderboard -> final podium flow.
- Time-decay scoring (faster correct answers earn more points).
- Answer acknowledgement to players (`sending`, `accepted`, `rejected`).
- Host-side live answer counts and reveal distribution.
- Multi-player reliability and reconnect-oriented behavior tested with Playwright.

## Tech stack

- Runtime: Bun
- Framework: Next.js (App Router)
- Language: TypeScript
- UI: React + Tailwind CSS
- State: Zustand
- Testing: Vitest + Playwright (Python pytest wrappers)

## Repository layout

```text
apps/web/              Next.js app (host/player UIs + API routes)
packages/protocol/     Message types and validators
packages/pack-schema/  Pack schema, loading, validation
tests/                 End-to-end Playwright scenario tests
AGENTS.md              Agent development guidance
```

## Local development

```bash
bun install
bun run dev
```

App runs at `http://localhost:3000`.

## Validation commands

```bash
bun run typecheck
bun test
bun run build
```

For web-only checks used frequently in this repo:

```bash
npm --prefix apps/web run typecheck
npm --prefix apps/web run test -- --run src/stores/gameStore.test.ts src/test/game-flow.test.ts
python3 -m pytest tests/test_vercel.py tests/test_complete_game.py -q
```

## Security notes

- Signaling endpoints use host/player tokens and per-route rate limiting.
- Redis-backed signaling storage is production-first; local dev can use in-memory sessions.
- Keep sensitive values (`REDIS_URL`, secrets) server-side only.

## License

MIT
