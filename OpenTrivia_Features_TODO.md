# Features & TODO Tracker

This backlog is organized by milestones. Each milestone includes epics, tasks, and acceptance criteria.

## Milestones

- **M0 — Repo + foundation**
- **M1 — MVP playable game (local only)**
- **M2 — P2P multiplayer (WebRTC)**
- **M3 — Git pack loading**
- **M4 — Polish + reliability**
- **M5 — Post-MVP extensions**

---

## M0 — Repo + foundation

### Epic: Monorepo skeleton

- [ ] Monorepo setup (Next.js + shared packages)
  - [ ] `apps/web` (orchestrator + host/player clients)
  - [ ] `packages/protocol` (message types, validators)
  - [ ] `packages/pack-schema` (JSON schema, loader)
- [ ] CI pipeline
  - [ ] lint + typecheck + unit tests
- [ ] Basic design system (buttons, cards, typography)

**Acceptance criteria**

- `pnpm install && pnpm test && pnpm build` works on a clean machine.

---

## M1 — MVP playable game (single device simulation)

### Epic: Host flow UI

- [ ] Host home screen: “Host a game”
- [ ] Lobby screen with mock players (for now)
- [ ] Host question screen: prompt + choices + timer controls
- [ ] Reveal screen: correct answer + leaderboard
- [ ] End screen: podium

### Epic: Game engine

- [ ] Deterministic state machine
- [ ] Timer logic (start, pause, lock)
- [ ] Scoring module (base + time bonus toggle)

**Acceptance criteria**

- Host can run through a full 10-question pack locally with simulated players.

---

## M2 — P2P multiplayer (WebRTC)

### Epic: Signaling (Vercel)

- [ ] `POST /api/session/create` returns room code + host token
- [ ] Offer/answer exchange endpoints
- [ ] ICE candidate exchange endpoints
- [ ] TTL + cleanup policy

### Epic: Host networking

- [ ] Create room, generate per-player peer connection
- [ ] Broadcast lobby updates
- [ ] Broadcast question events
- [ ] Receive/validate answers

### Epic: Player networking

- [ ] Join by code/link
- [ ] WebRTC connect and “connected” indicator
- [ ] Submit answers and receive ACK

**Acceptance criteria**

- 1 host + 5 players can complete a full game over typical home Wi-Fi.

---

## M3 — Git pack loading

### Epic: Pack loader

- [ ] Parse Git URL + optional path/version
- [ ] Fetch `pack.json`
- [ ] Fetch questions and required assets
- [ ] Validate against schema
- [ ] Cache by commit hash in IndexedDB

### Epic: Pack browser (minimal)

- [ ] “Paste repo URL” flow
- [ ] Show pack metadata (title, author, question count)
- [ ] Version pinning (branch/tag/commit input)

**Acceptance criteria**

- Host can paste a repo URL and successfully play that pack end-to-end.

---

## M4 — Polish + reliability

### Epic: Reconnect

- [ ] Player reconnect to same nickname/playerId (token-based)
- [ ] Host sends state snapshot after reconnect

### Epic: Abuse controls

- [ ] Host kick player
- [ ] Lock lobby
- [ ] Nickname constraints (length, charset, optional filter)

### Epic: UX improvements

- [ ] QR code join
- [ ] Mobile-first player UI (tap targets, latency-friendly)
- [ ] Accessibility pass (contrast, aria labels)

### Epic: Fallback modes

- [ ] Detect WebRTC failure and show guidance
- [ ] Optional TURN configuration documentation
- [ ] Optional “reachable host” WebSocket mode (if you choose)

**Acceptance criteria**

- A player can refresh mid-game and rejoin within ~10 seconds and continue.

---

## M5 — Post-MVP extensions

- [ ] New question types: multi-select, numeric, short answer (host-graded)
- [ ] Pack editor UI (create/preview/validate)
- [ ] Localization support (per-pack locales)
- [ ] Audio support + preloading controls
- [ ] Lightweight “host node” desktop app (optional) for better stability
- [ ] Community curated directory (PR-driven; still Git-based)

---

## Ongoing engineering tasks

- [ ] Protocol versioning policy (`v1`, `v2`…)
- [ ] Security hardening checklist (CSP, sanitization, rate limits)
- [ ] Load testing harness (simulate N players)
- [ ] Documentation
  - [ ] “Host a game” guide
  - [ ] “Create a pack” guide
  - [ ] “Self-host signaling” guide
