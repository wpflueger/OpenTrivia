# Technical Specifications
## Architecture overview
**Core principle:** Vercel app orchestrates discovery + signaling; **host device runs the game server logic**; players connect to host for real-time gameplay.

### Components
1. **Web Orchestrator (Next.js on Vercel)**
   - Landing, host/player UI routing
   - Pack browsing/loading helpers
   - Signaling endpoints (session negotiation)
   - Optional curated directory (static)
2. **Host Runtime (Browser)**
   - Authoritative game engine (state machine)
   - Loads/validates pack
   - Establishes peer connections
   - Computes score, enforces timers
3. **Player Runtime (Browser/PWA)**
   - Join lobby, submit answers, render states
   - Minimal local state (presentation only)

> This is “host-as-hub” P2P: each player connects to host (star topology). The host remains authoritative.

## Networking model (P2P)
**Preferred transport:** WebRTC DataChannels (reliable + ordered for most messages).
- Host creates an RTCPeerConnection per player.
- Players connect via offer/answer exchange through the signaling service.
- ICE servers:
  - **STUN**: free/public or low-cost provider to help with NAT traversal.
  - **TURN**: optional, disabled by default; can be configured by self-hosters for hard NAT cases.

### Why WebRTC
- Works in browsers, mobile-friendly, supports NAT traversal better than direct WebSockets to a host behind NAT.
- Keeps “compute on host” intact.

## Fallback connectivity modes
Because WebRTC can fail on some networks:
1. **Fallback A: “Host-forwarded WebSocket” (requires host to be reachable)**
   - If host can port-forward or run via a tunnel, players connect via WebSocket to host.
   - Optional; not default.
2. **Fallback B: Optional TURN relay**
   - For “it always works,” document TURN configuration.
   - Keep opt-in to preserve cost.

## Signaling service (on Vercel)
### Requirements
- Do not maintain long-lived connections on Vercel if avoidable.
- Minimal data stored: only session offers/answers/ICE candidates with TTL.

### Implementation options
**Option 1 (Recommended MVP): Serverless + short polling**
- Endpoints:
  - `POST /api/session/create` → returns `roomId`, `hostToken`
  - `POST /api/session/:roomId/offer` (host publishes offer for playerId)
  - `GET /api/session/:roomId/offer?playerId=...`
  - `POST /api/session/:roomId/answer`
  - `GET /api/session/:roomId/answer?playerId=...`
  - `POST /api/session/:roomId/candidate`
  - `GET /api/session/:roomId/candidates?...`
- Storage:
  - Minimal KV with TTL (e.g., Vercel KV / Upstash Redis)
- Cost: tiny (short-lived keys; low bandwidth)

**Option 2: WebSocket signaling**
- More complex and can increase costs. Only if needed.

## Room identity and security
- `roomId`: short human-friendly code (e.g., 6–8 chars base32) + internal UUID
- `hostToken`: long random secret stored only on host device
- `playerToken`: per-player ephemeral token to prevent spoofing
- All signaling writes require appropriate token
- TTL:
  - Rooms expire after inactivity (e.g., 2 hours)
  - Candidate/offer/answer keys expire quickly (e.g., 2–10 minutes)

## Game state authority model
Host owns canonical state:
- Lobby state: players, readiness, bans
- Game progression: current question index, timer start/stop, lock states
- Scoring: compute on host; send leaderboard snapshots

Players are presentation clients:
- Render host broadcasts
- Submit input (answers) that host validates

## Message protocol (DataChannel)
Define a versioned JSON message envelope:

```json
{
  "v": 1,
  "t": "answer.submit",
  "id": "uuid",
  "ts": 1730000000000,
  "payload": {}
}
```

### Core message types
- `room.join` (player → host): nickname, client info
- `room.joined` (host → player): assigned playerId, lobby snapshot
- `lobby.update` (host → all): lobby snapshot
- `game.start` (host → all): settings, question count
- `question.show` (host → all): question payload (no correct answer), startTime, durationMs
- `answer.submit` (player → host): questionId, selectedOptionId(s), submitTs
- `answer.ack` (host → player): accepted/late/invalid
- `question.lock` (host → all): no more answers
- `question.reveal` (host → all): correct answer + per-player correctness + score deltas (optional)
- `leaderboard.update` (host → all): top N, player rank
- `game.end` (host → all): final leaderboard, export info

### Compression
- Start with plain JSON.
- Later: MessagePack if bandwidth becomes an issue.

## Pack format (Git-based)
Use a **declarative schema** (JSON or YAML) to avoid executing code from packs.

### Repository layout
```
/pack.json
/questions/*.json
/assets/*
/locales/en.json
```

### pack.json
- `schemaVersion`
- `title`, `description`, `author`, `license`
- `rounds`: ordered list of question refs + settings
- `assets`: optional manifest (for prefetch/validation)

### Question schema (MVP)
- `id`
- `type`: `mcq` | `boolean`
- `prompt`: plain text (no HTML)
- `choices`: list of `{ id, text }`
- `answer`: `{ choiceId }` (host-only; not shipped to players until reveal)
- `media`: optional `{ image, audio }` paths

### Validation
- Strict JSON schema validation on host before game starts
- Sanitize text (escape HTML), enforce max lengths
- Limit assets size/type:
  - Images: png/jpg/webp, size cap
  - Audio (post-MVP): mp3/ogg, size cap

## Loading from Git
### MVP approach (public repos first)
- Accept a Git URL and derive raw file URLs.
- Resolve branch/tag/commit and fetch `pack.json`
- Fetch question files + assets

### Caching
- Host caches pack data in IndexedDB (version keyed by commit SHA)
- Player devices only receive per-question payload, not full pack

### Orchestrator role
- Helps users paste/select repo URL
- Optionally displays README/metadata
- Does not store pack contents; fetch client-side where possible

## Client implementation details
### Front-end stack
- Next.js App Router
- TypeScript
- State management: Zustand or Redux Toolkit
- UI: Tailwind + optional component library

### Host engine
- Deterministic state machine:
  - `LOBBY → COUNTDOWN → QUESTION → REVEAL → INTERMISSION → … → END`
- Single time source:
  - Use `performance.now()` and host timestamps
  - Broadcast time offsets so players render countdown accurately

### Reconnect strategy
- Player reconnects:
  - Re-establish WebRTC
  - Host sends `state.snapshot` containing phase, question info, time remaining, and score

## Security posture
- Strong CSP: disallow inline scripts; restrict media sources to self + allowlisted raw content hosts
- No HTML in prompts (or sanitize with a proven sanitizer)
- Rate limiting:
  - Signaling endpoints (by IP + roomId)
  - Host message handling per peer
- Privacy:
  - No accounts required
  - No gameplay state stored centrally

## Observability (minimal cost)
- Optional client-side error reporting (self-hostable endpoint)
- Basic logs for signaling endpoints (request count, error rate)

## Deployment & cost optimization on Vercel
- Prefer static rendering for marketing/docs
- Keep signaling endpoints lean; avoid long-lived connections
- Use KV with TTL for offers/answers/candidates
- Keep bandwidth-heavy operations client-side (pack fetching)

## Testing strategy
- Unit tests:
  - Pack validation
  - Scoring rules
  - State machine transitions
- Integration tests:
  - Simulated host + multiple players (headless browsers)
- Security tests:
  - Malformed packs
  - Oversized assets/strings
  - Protocol fuzzing (invalid messages)
