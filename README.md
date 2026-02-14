# OpenTrivia

Open source P2P trivia game platform - an open alternative to Kahoot.

## Features

- **Host-as-hub model** - Host device runs game server logic; players connect via WebRTC
- **No accounts required** - Just share a room code to play
- **Custom question packs** - Load trivia packs from any GitHub repository
- **P2P powered** - Direct peer-to-peer connections for fast, reliable gameplay

## Tech Stack

- **Runtime**: Bun
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **UI**: React + Tailwind CSS
- **State**: Zustand
- **Testing**: Vitest

## Getting Started

### Prerequisites

- Bun runtime installed (`curl -fsSL https://bun.sh/install | bash`)

### Installation

```bash
bun install
```

### Development

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Build

```bash
bun run build
```

### Testing

```bash
bun test              # Run all tests
bun test --watch      # Run tests in watch mode
bun test --grep "pattern"  # Run tests matching pattern
```

### Type Checking

```bash
bun run typecheck
```

## Project Structure

```
├── apps/
│   └── web/              # Next.js orchestrator + host/player clients
├── packages/
│   ├── protocol/         # Message types, validators
│   └── pack-schema/      # JSON schema, loader
├── docs/                 # Documentation
└── AGENTS.md             # Developer guide
```

## Documentation

- [Technical Spec](./OpenTrivia_Technical_Spec.md)
- [Features TODO](./OpenTrivia_Features_TODO.md)
- [Product Requirements](./OpenTrivia_PRD.md)
- [Developer Guide](./AGENTS.md)

## License

MIT
