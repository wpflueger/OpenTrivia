# Product Requirements Document (PRD)
## Product name
**OpenTrivia Live (working title)** — an open-source, peer-to-peer live trivia game platform (a FOSS alternative to Kahoot).

## Problem statement
Many live trivia platforms lock meaningful features and popular content behind paywalls. Creators and communities want:
- Full control of content packs
- No per-seat pricing
- A host-run experience where compute/state/storage live on the host device
- Easy distribution/versioning via Git repositories (public by default)
- Seamless play on mobile and desktop without app installs

## Vision
A “host-anywhere” trivia platform where the host’s device is the authoritative game server, players join instantly, and question packs are pulled directly from Git repositories. The web orchestrator is low-cost, minimal, and avoids storing game state.

## Goals
1. **Zero paywalls** for core play and creation.
2. **Peer-to-peer sessions**: game state and compute live on the host.
3. **Pack distribution via Git**: a URL is enough to load a game.
4. **Cross-platform**: desktop + mobile web, optional PWA.
5. **Cost-minimal orchestrator**: Vercel app only does signaling/browsing, not gameplay.

## Non-goals (initially)
- Centralized matchmaking with persistent accounts as a hard requirement
- Hosting large media libraries centrally
- Anti-cheat that requires server authority outside the host
- Massive scale (e.g., thousands of players per session) on MVP

## Target users & personas
- **Casual host**: teacher, streamer, friend group organizer; wants a quick session setup.
- **Content creator**: makes trivia packs; wants Git-based versioning and sharing.
- **Player**: joins from phone; wants fast join and clear UX.
- **Community maintainer**: curates lists of packs; wants transparent moderation and provenance.

## Key use cases
1. **Host a game** from a Git repo pack; share a join code/QR.
2. **Players join** from mobile browser; enter nickname; play through rounds.
3. **Creator publishes** pack updates via Git; hosts can pin versions/tags.
4. **Offline/low-connectivity** (stretch): host preloads pack; players connect locally.

## Success metrics (MVP)
- **Time-to-first-question**: < 60 seconds from “Create room” to Q1 shown (median).
- **Join success rate**: > 95% of players who open join link connect successfully.
- **Host CPU/memory**: smooth play on typical laptop; no noticeable lag with 20 players.
- **Orchestrator cost**: near-zero at low/moderate usage (Vercel free/low tier), no per-session state storage.

## Core user journeys

### Host journey
1. Open site → “Host a game”
2. Choose pack:
   - Paste Git repo URL (or pick from curated list)
   - Select version (branch/tag/commit)
3. Room created:
   - Join code + QR
   - “Lobby” shows joined players
4. Start game:
   - Host sees question + controls (start timer, skip, lock answers)
   - Host can show leaderboard between questions
5. End game:
   - Final podium
   - Optional export results locally (JSON/CSV)

### Player journey
1. Open join link (or enter code)
2. Enter nickname + optional avatar color
3. Wait in lobby
4. Answer each question within time limit
5. See correctness + score/leaderboard

## Functional requirements

### Gameplay
- Lobby: join/leave, display player list, host controls (kick, lock lobby)
- Question types (MVP):
  - Multiple choice (single answer)
  - True/False (treated as 2-choice)
- Timers: host-controlled countdown, answer lock on expiry
- Scoring:
  - Base points for correct
  - Optional time bonus (faster = more)
- Leaderboard:
  - After each question + final podium
- Rounds:
  - Pack can define sections/rounds and per-round settings
- Host moderation:
  - Kick player, lock nickname changes

### Content packs from Git
- Load pack from Git URL and path
- Pin version by tag/branch/commit
- Validate pack schema and assets
- Support embedded media references (images/audio) loaded from repo raw URLs

### P2P session
- Host is authority:
  - Owns canonical game state
  - Computes scores
  - Broadcasts state to players
- Players submit answers to host
- Reconnect behavior:
  - If connection drops, player can rejoin and recover state if possible

## Non-functional requirements
- **Security**: untrusted pack content must not execute arbitrary code
- **Privacy**: orchestrator stores no gameplay state and no personal data by default
- **Performance**: stable with 20 players on typical home internet (MVP target)
- **Accessibility**: WCAG-minded contrast, keyboard navigation on host, large tap targets on mobile
- **Reliability**: graceful degradation if P2P fails (see Tech Spec)

## Constraints & assumptions
- Host bandwidth and device performance limits scale; MVP targets small-to-medium rooms.
- NAT traversal is non-trivial; must work “best effort” without a costly relay by default.
- The orchestrator should be stateless or near-stateless for cost.

## Risks & mitigations
- **NAT traversal failures** → Provide fallback modes (see Tech Spec).
- **Pack security** (malicious content) → Strict schema validation; sanitize text/HTML; restrict asset types; CSP.
- **Cheating** (players coordinating) → Limit answer change, optional randomized answer order, host-controlled pacing.
- **Abuse in nicknames** → Basic profanity filter (optional), host kick/ban for session.

## MVP scope (ship this first)
- Web host + web player clients
- WebRTC-based P2P connections with Vercel signaling
- Git-based pack loading (public GitHub repos first)
- MCQ + True/False, timer, scoring, leaderboard
- Minimal curated pack directory (optional, static list in repo)

## Post-MVP (roadmap)
- More question types (multi-select, numeric, short answer, matching)
- “Local network mode” for classrooms/events
- Optional lightweight local “host node” (desktop app) for better stability
- Pack editor UI + validation tools
- Moderation/community pack indexing (still decentralized)
