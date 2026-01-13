# KR-Wiggum Stateless Engine

> AI Memory Externalized to Files with the Ralph Wiggum Loop Pattern

A stateless AI orchestration engine that transforms unstructured brainstorms into production-ready software through hierarchical Manager-Worker agents with file-based state management.

## Key Concepts

### The Problem: Context Rot

Large Language Models degrade in performance as their context window fills up. After ~60% capacity, they start "forgetting" earlier instructions and making mistakes. Traditional approaches try to work around this with summarization or RAG, but quality still degrades.

### The Solution: Stateless Agents with External Memory

KR-Wiggum externalizes all state to files, treating the AI's context window as ephemeral compute rather than persistent memory:

- **Manager agents** rotate out at 60% context fill, writing handoff documents for the next Manager
- **Worker agents** spawn fresh for each task with zero prior context, die immediately after completion
- **All state lives in files** - the AI reads what it needs, writes what it learned, then exits

This pattern, called the "Ralph Wiggum Loop," ensures every agent operates in their "smart zone" with a clean context.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     orchestrate.sh                           │
│  Manages Manager/Worker lifecycles via exit codes            │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          │                               │
          ▼                               ▼
┌─────────────────────┐         ┌─────────────────────┐
│   Manager Agent     │         │   Worker Agent      │
│   (Persistent)      │         │   (Ephemeral)       │
├─────────────────────┤         ├─────────────────────┤
│ • Context Monitor   │ spawns  │ • Fresh Boot        │
│ • Task Selector     │────────▶│ • Ralph Wiggum Loop │
│ • ADR Logger        │         │ • Status Fragment   │
│ • Handoff Writer    │         │ • Self-Destruct     │
└─────────────────────┘         └─────────────────────┘
          │                               │
          │         Exit Codes            │
          │  0  = Success                 │
          │  1  = Task Failed             │
          │  10 = Rotation Needed         │
          │  20 = Human Intervention      │
          │  99 = Crash                   │
          └───────────────────────────────┘
```

## Features

- **Distiller** - Parse brainstorms, generate PRDs, break down into atomic tasks
- **Shift Manager** - Strategic oversight with context monitoring and rotation
- **Worker** - Atomic task execution with Edit-Build-Test loop
- **Guardrails** - TypeScript compilation, test gates, KR standards checking
- **Dashboard** - Real-time WebSocket telemetry with neon-liquid UI
- **Reports** - Shift reports, forensic analysis, client documentation

## Installation

```bash
# Clone the repository
git clone https://github.com/kreativreason/kr-wiggum-stateless-engine.git
cd kr-wiggum-stateless-engine

# Install dependencies
npm install

# Build
npm run build
```

**Requirements:**
- Node.js >= 20.0.0
- npm >= 9.0.0

## Usage

### Start the Dashboard

```bash
npm start
# or
npm run dev  # with hot reload
```

Open http://localhost:3000 to view the Mission Control dashboard.

### Run the Orchestrator

```bash
npm run orchestrate
# or
./scripts/orchestrate.sh
```

This starts the main orchestration loop that:
1. Spawns a Manager agent
2. Manager selects tasks and spawns Workers
3. Workers execute tasks using the Ralph Wiggum Loop
4. Manager rotates when context reaches 60%
5. New Manager picks up from handoff document
6. Repeats until all tasks complete

### CLI Commands

```bash
# Manager entry point (used by orchestrate.sh)
node dist/manager-entry.js

# Worker entry point (used by Manager)
node dist/worker-entry.js

# Dashboard server
node dist/server.js
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PROJECT_PATH` | Base path for project files | `cwd()` |
| `PROJECT_ID` | Unique project identifier | auto-generated |
| `HANDOFF_FILE` | Path to handoff from previous Manager | none |
| `TASK_ID` | Task ID for Worker | required |
| `PRD_PATH` | Path to PRD file | required |
| `CURRENT_TASK_PATH` | Path to current task file | required |

## Project Structure

```
kr-wiggum-stateless-engine/
├── src/
│   ├── schemas/          # Zod validation schemas (11 entities)
│   ├── types/            # TypeScript type definitions
│   ├── state/            # File-based state managers
│   ├── services/
│   │   ├── distiller/    # Brainstorm → PRD → Tasks
│   │   ├── shift-manager/# Manager lifecycle
│   │   ├── worker/       # Worker execution
│   │   ├── guardrail/    # Quality gates
│   │   ├── orchestrator/ # Process management
│   │   └── reports/      # Report generation
│   ├── watcher/          # File watchers + WebSocket
│   ├── commands/         # Slash command handlers
│   ├── manager-entry.ts  # Manager process entry point
│   ├── worker-entry.ts   # Worker process entry point
│   ├── app.ts            # Express application
│   └── server.ts         # HTTP server
├── public/               # Dashboard UI
├── scripts/              # Shell scripts
├── tests/                # Vitest test suites
├── .agent/               # Agent state files
├── .ralph/               # Runtime telemetry
└── docs/                 # Documentation
```

## File-Based State

All state is externalized to files:

| File | Purpose |
|------|---------|
| `.agent/project.json` | Project metadata |
| `.agent/PRD.md` | Product requirements |
| `.agent/ADR.md` | Architecture decisions |
| `.agent/SHIFT_HANDOFF.md` | Manager rotation handoff |
| `.ralph/telemetry.json` | Context monitoring |
| `IMPLEMENTATION_PLAN.md` | Task checklist |
| `LAST_COMPILER_ERROR.log` | Build error tracking |

## Development

```bash
# Run in development mode
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format

# Run tests
npm test
npm run test:watch
npm run test:coverage
```

## Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/integration/entry-points.integration.test.ts

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

**Test Suites:**
- `tests/schemas/` - Zod schema validation
- `tests/services/` - State manager unit tests
- `tests/integration/` - Full integration tests

## The Ralph Wiggum Loop

The Worker's core execution pattern:

```
┌─────────────────────────────────────────┐
│            Worker Spawns                 │
│         (Fresh Context Boot)             │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│              Read PRD                    │
│           Read Current Task              │
└─────────────────┬───────────────────────┘
                  │
                  ▼
         ┌───────────────┐
         │     EDIT      │◄────────────┐
         │  (Make Changes)             │
         └───────┬───────┘             │
                 │                     │
                 ▼                     │
         ┌───────────────┐             │
         │     BUILD     │             │
         │ (TypeScript)  │             │
         └───────┬───────┘             │
                 │                     │
            Pass │ Fail                │
                 │   └─────────────────┤
                 ▼                     │
         ┌───────────────┐             │
         │     TEST      │             │
         │   (Vitest)    │             │
         └───────┬───────┘             │
                 │                     │
            Pass │ Fail                │
                 │   └─────────────────┘
                 ▼              (max 5 retries)
┌─────────────────────────────────────────┐
│          Write Status Fragment           │
│            Self-Destruct                 │
│           (Exit Code 0)                  │
└─────────────────────────────────────────┘
```

## Exit Codes

| Code | Constant | Meaning |
|------|----------|---------|
| 0 | `SUCCESS` | Task/shift completed successfully |
| 1 | `TASK_FAILED` | Task failed after max retries |
| 10 | `ROTATION_NEEDED` | Manager context full, needs rotation |
| 20 | `HUMAN_INTERVENTION` | Crisis mode - requires human |
| 99 | `CRASH` | Unexpected error |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Dashboard UI |
| `/api/health` | GET | Health check |
| `/api/status` | GET | Project status + telemetry |
| `/api/crisis` | POST | Trigger crisis mode |

WebSocket events are emitted for real-time dashboard updates.

## License

MIT

## Author

KreativReason
