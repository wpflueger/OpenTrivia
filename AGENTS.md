# AGENTS.md - OpenTrivia Development Guide

This file provides guidelines for agentic coding agents working on OpenTrivia.

## Project Overview

OpenTrivia is a P2P trivia game platform (open alternative to Kahoot) with:

- **Host-as-hub model**: Host device runs game server logic; players connect via WebRTC
- **Web Orchestrator**: Next.js on Vercel for landing, routing, signaling
- **Git-based packs**: Declarative JSON/YAML question packs loaded from Git repos

## Tech Stack

- **Runtime**: Bun
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **UI**: React + Tailwind CSS
- **State**: Zustand
- **Testing**: Vitest

## Repository Structure

```
apps/web/              # Next.js orchestrator + host/player clients
packages/
  protocol/            # Message types, validators
  pack-schema/         # JSON schema, loader
```

## Build / Lint / Test Commands

```bash
# Install dependencies
bun install

# Build all packages (monorepo)
bun run build

# Run type checking
bun run typecheck

# Lint all files
bun run lint

# Format code
bun run format

# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run a single test file (recommended - run from package dir)
cd packages/protocol && bun test src/validators.test.ts
cd packages/pack-schema && bun test src/validator.test.ts

# Or run all tests in a specific package
bun test --filter=protocol
bun test --filter=pack-schema
```

## Code Style Guidelines

### Imports

- Use path aliases defined in `tsconfig.json` (e.g., `@opentriiva/protocol`)
- Due to `verbatimModuleSyntax`, use `.js` extension for relative imports: `import { X } from './foo.js'`
- Avoid relative imports beyond 2 levels (`../../`)
- Order: external → alias → relative
- Prefer explicit named exports

### Formatting

- Prettier is configured - run `bun run format` before committing
- 2-space indentation
- Single quotes for strings (except where template literals needed)
- Trailing commas for arrays and objects

### TypeScript

- `strict: true` is enabled in tsconfig
- Explicit return types for exported functions
- Avoid `any` - use `unknown` + type narrowing
- Use `interface` for object shapes, `type` for unions/intersections
- Prefer `type` over `enum` for constants

### Naming Conventions

| Type                 | Convention      | Example                        |
| -------------------- | --------------- | ------------------------------ |
| Variables, functions | camelCase       | `getQuestion`, `playerId`      |
| Components, types    | PascalCase      | `GameLobby`, `QuestionProps`   |
| Constants            | SCREAMING_SNAKE | `MAX_PLAYERS`, `DEFAULT_TIMER` |
| Files (components)   | PascalCase      | `QuestionCard.tsx`             |
| Files (utilities)    | kebab-case      | `date-utils.ts`                |

### React Patterns

- Server Components by default; use `'use client'` only when needed
- Wrap `useSearchParams` in `<Suspense>` boundary
- Colocate components with their tests and styles
- Use functional components with hooks
- Extract custom hooks for reusable stateful logic
- Prop drilling > context for 1-2 level depth; use Zustand for global state

### Error Handling

- Create custom error classes for domain errors (`GameError`, `PackValidationError`, `PackLoadError`)
- Use try-catch with specific error types
- Never expose internal errors to users - wrap with user-friendly messages
- Log errors with appropriate context for debugging

## Message Protocol

All WebRTC messages follow this envelope:

```typescript
interface Message {
  v: number; // protocol version
  t: string; // message type
  id: string; // message UUID
  ts: number; // timestamp
  payload: unknown;
}
```

Core message types: `room.join`, `room.joined`, `lobby.update`, `game.start`, `question.show`, `answer.submit`, `answer.ack`, `question.lock`, `question.reveal`, `leaderboard.update`, `game.end`

## Pack Schema

Question packs use declarative JSON with:

```typescript
interface PackManifest {
  schemaVersion: string;
  title: string;
  description: string;
  author: string;
  license: string;
  rounds: Round[];
}

interface Question {
  id: string;
  type: "mcq" | "boolean";
  prompt: string;
  choices: Choice[];
  answer: Answer;
}
```

## Security

- Sanitize all user input (especially pack content)
- No `eval()` or dynamic code execution
- Validate all WebRTC messages before processing

## Testing

- Unit tests for: pack validation, scoring rules, state machine transitions, message validators
- Test file naming: `*.test.ts` or `*.spec.ts` alongside source files
- Run tests before committing: `bun test`

## Acceptance Criteria

Before considering a feature complete:

- [ ] `bun install && bun test && bun run build` passes
- [ ] `bun run typecheck` passes with no errors
- [ ] Relevant unit tests added for new logic
- [ ] No hardcoded secrets or credentials
