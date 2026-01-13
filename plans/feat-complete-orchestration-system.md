# feat: Complete Orchestration System

> Comprehensive plan to finalize the KR-Wiggum Stateless Engine by building the missing manager entry point, fixing ESLint configuration, and adding E2E integration tests.

## Summary

The KR-Wiggum Stateless Engine is 95% complete. This plan addresses the three remaining gaps:

1. **Missing `manager-entry.ts`** - The orchestrate.sh script references `dist/manager-entry.js` which doesn't exist
2. **ESLint Configuration Issues** - 642 import resolution errors due to misconfigured resolver
3. **No E2E Integration Test** - The full orchestration loop hasn't been tested end-to-end

## Problem Statement

The system cannot run the full Ralph Wiggum Loop because:
- `orchestrate.sh` and `ManagerLifecycle` try to spawn `dist/manager-entry.js` which doesn't exist
- Similarly, `WorkerSpawner` references `dist/worker-entry.js` which doesn't exist
- ESLint fails with 642 errors (mostly false positives from import resolution)
- No test validates the complete orchestration cycle

## Proposed Solution

### Part 1: Build Entry Points

Create `src/manager-entry.ts` and `src/worker-entry.ts` that:
- Read configuration from environment variables
- Bootstrap Manager/Worker sessions using existing services
- Handle exit codes per the defined protocol (0, 1, 10, 20, 99)
- Support graceful shutdown on SIGTERM/SIGINT

### Part 2: Fix ESLint Configuration

Migrate from ESLint 8 `.eslintrc.cjs` to ESLint 9 flat config with:
- `eslint-plugin-import-x` (better TypeScript ESM support)
- Proper `.js` to `.ts` extension resolution
- `node:` protocol recognition for built-in modules

### Part 3: Add E2E Integration Tests

Create comprehensive tests that:
- Test process spawning with real exit codes
- Validate the Manager rotation protocol
- Test Worker task execution loop
- Verify crisis mode activation

---

## Technical Plan

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      orchestrate.sh                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                 Main Orchestration Loop                  │    │
│  │  - Spawns manager-entry.js                              │    │
│  │  - Handles exit codes (0, 10, 20, 99)                   │    │
│  │  - Manages rotation count                               │    │
│  └────────────────────────┬────────────────────────────────┘    │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    manager-entry.ts                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Environment: HANDOFF_FILE, PROJECT_ID, PROJECT_PATH     │    │
│  │                                                          │    │
│  │  Uses:                                                   │    │
│  │  - ContextMonitor (check context fill)                   │    │
│  │  - TaskSelector (pick next task)                         │    │
│  │  - ShiftHandoffWriter (write handoff on rotation)        │    │
│  │  - ADRLogger (log decisions)                             │    │
│  │                                                          │    │
│  │  Spawns: worker-entry.ts for each task                   │    │
│  │                                                          │    │
│  │  Exit Codes:                                             │    │
│  │  - 0: All tasks complete                                 │    │
│  │  - 10: Context full, rotation needed                     │    │
│  │  - 20: Human intervention required                       │    │
│  │  - 99: Crash                                             │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    worker-entry.ts                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Environment: TASK_ID, PRD_PATH, CURRENT_TASK_PATH       │    │
│  │                                                          │    │
│  │  Uses:                                                   │    │
│  │  - FreshContextBoot (load clean state)                   │    │
│  │  - RalphWiggumLoop (edit-build-test cycle)               │    │
│  │  - StatusFragmentWriter (write completion status)        │    │
│  │  - SelfDestruct (cleanup and exit)                       │    │
│  │                                                          │    │
│  │  Exit Codes:                                             │    │
│  │  - 0: Task completed successfully                        │    │
│  │  - 1: Task failed after max retries                      │    │
│  │  - 99: Crash                                             │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Components to Create

| File | Action | Description |
|------|--------|-------------|
| `src/manager-entry.ts` | CREATE | Manager process entry point |
| `src/worker-entry.ts` | CREATE | Worker process entry point |
| `eslint.config.mjs` | CREATE | New ESLint 9 flat config |
| `.eslintrc.cjs` | DELETE | Remove legacy config |
| `tests/integration/orchestration.integration.test.ts` | CREATE | E2E orchestration tests |
| `tests/integration/entry-points.integration.test.ts` | CREATE | Entry point tests |
| `package.json` | MODIFY | Update ESLint dependencies |

### Dependencies to Update

**Remove:**
- `@typescript-eslint/eslint-plugin` (replaced by typescript-eslint)
- `@typescript-eslint/parser` (replaced by typescript-eslint)
- `eslint-plugin-import` (replaced by eslint-plugin-import-x)

**Add:**
- `eslint@^9` (upgrade from 8.x)
- `typescript-eslint` (unified package)
- `eslint-plugin-import-x` (modern import plugin)
- `globals` (for Node.js globals)

---

## Tasks

### TASK-053: Create manager-entry.ts

**Type:** backend
**Priority:** critical
**Story Points:** 5

**Description:**
Create the Manager process entry point that orchestrate.sh spawns.

**Acceptance Criteria:**
- [ ] Reads HANDOFF_FILE, PROJECT_ID, PROJECT_PATH from environment
- [ ] Initializes ManagerSession using existing types
- [ ] Uses ContextMonitor to track context fill percentage
- [ ] Uses TaskSelector to pick next task
- [ ] Spawns worker-entry.ts for each task
- [ ] Writes shift handoff when context reaches 60%
- [ ] Exits with code 0 when all tasks complete
- [ ] Exits with code 10 when rotation needed
- [ ] Exits with code 20 for crisis mode
- [ ] Handles SIGTERM/SIGINT gracefully

**Context Plan:**
```yaml
beginning_context:
  - src/types/agent.types.ts (EXIT_CODES, ManagerSession)
  - src/services/shift-manager/index.ts (all exports)
  - src/services/orchestrator/worker-spawner.ts (spawnWorker)
  - scripts/orchestrate.sh (how it's called)
end_state_files:
  - src/manager-entry.ts
read_only_files:
  - src/state/telemetry-manager.ts
  - src/state/implementation-plan-manager.ts
```

**Testing Strategy:**
```yaml
strategy_type: integration
test_files:
  - tests/integration/entry-points.integration.test.ts
success_criteria:
  - Process starts and reads environment
  - Exits with correct codes based on state
test_command: npm test -- tests/integration/entry-points
```

---

### TASK-054: Create worker-entry.ts

**Type:** backend
**Priority:** critical
**Story Points:** 3

**Description:**
Create the Worker process entry point that manager-entry.ts spawns.

**Acceptance Criteria:**
- [ ] Reads TASK_ID, PRD_PATH, CURRENT_TASK_PATH from environment
- [ ] Initializes WorkerSession using existing types
- [ ] Uses FreshContextBoot to load clean state
- [ ] Runs RalphWiggumLoop for task execution
- [ ] Writes StatusFragment on completion
- [ ] Calls SelfDestruct for cleanup
- [ ] Exits with code 0 on success
- [ ] Exits with code 1 on task failure
- [ ] Exits with code 99 on crash

**Context Plan:**
```yaml
beginning_context:
  - src/types/agent.types.ts (EXIT_CODES, WorkerSession)
  - src/services/worker/index.ts (all exports)
  - src/services/orchestrator/worker-spawner.ts (how it's called)
end_state_files:
  - src/worker-entry.ts
read_only_files:
  - src/state/compiler-error-manager.ts
```

**Testing Strategy:**
```yaml
strategy_type: integration
test_files:
  - tests/integration/entry-points.integration.test.ts
success_criteria:
  - Process starts and reads environment
  - Runs Ralph Wiggum Loop
  - Exits with correct codes
test_command: npm test -- tests/integration/entry-points
```

---

### TASK-055: Migrate to ESLint 9 Flat Config

**Type:** devops
**Priority:** high
**Story Points:** 3

**Description:**
Replace legacy `.eslintrc.cjs` with ESLint 9 flat config using `eslint-plugin-import-x` for proper TypeScript ESM resolution.

**Acceptance Criteria:**
- [ ] Remove legacy ESLint 8 dependencies
- [ ] Install ESLint 9 and typescript-eslint
- [ ] Install eslint-plugin-import-x
- [ ] Create eslint.config.mjs with proper resolver
- [ ] Delete .eslintrc.cjs
- [ ] All 642 import resolution errors resolved
- [ ] `npm run lint` passes (or only real errors remain)

**Context Plan:**
```yaml
beginning_context:
  - .eslintrc.cjs (current config)
  - tsconfig.json (TypeScript config)
  - package.json (current deps)
end_state_files:
  - eslint.config.mjs
  - package.json
files_to_delete:
  - .eslintrc.cjs
```

**Testing Strategy:**
```yaml
strategy_type: smoke
test_files: []
success_criteria:
  - npm run lint exits with code 0 (or only real errors)
  - No import/no-unresolved false positives
test_command: npm run lint
```

---

### TASK-056: Add E2E Orchestration Integration Tests

**Type:** test
**Priority:** high
**Story Points:** 5

**Description:**
Create comprehensive integration tests for the orchestration system.

**Acceptance Criteria:**
- [ ] Test manager-entry.ts spawning and exit codes
- [ ] Test worker-entry.ts task execution
- [ ] Test Manager rotation protocol (exit 10 -> new manager)
- [ ] Test crisis mode activation (exit 20)
- [ ] Test error recovery with retries
- [ ] Test graceful shutdown handling
- [ ] All tests pass with real process spawning

**Context Plan:**
```yaml
beginning_context:
  - tests/integration/distiller.integration.test.ts (test patterns)
  - tests/integration/guardrails.integration.test.ts (test patterns)
  - src/manager-entry.ts
  - src/worker-entry.ts
end_state_files:
  - tests/integration/orchestration.integration.test.ts
  - tests/integration/entry-points.integration.test.ts
```

**Testing Strategy:**
```yaml
strategy_type: integration
test_files:
  - tests/integration/orchestration.integration.test.ts
  - tests/integration/entry-points.integration.test.ts
success_criteria:
  - All new tests pass
  - Coverage for exit code scenarios
test_command: npm test -- tests/integration/orchestration tests/integration/entry-points
```

---

### TASK-057: Update package.json bin and scripts

**Type:** devops
**Priority:** medium
**Story Points:** 1

**Description:**
Register entry points in package.json for CLI usage.

**Acceptance Criteria:**
- [ ] Add bin entries for manager and worker
- [ ] Verify `npm run build` compiles entry points
- [ ] Entry points executable via npx

**Changes:**
```json
{
  "bin": {
    "kr-manager": "./dist/manager-entry.js",
    "kr-worker": "./dist/worker-entry.js"
  }
}
```

---

### TASK-058: Final Validation and Documentation

**Type:** docs
**Priority:** medium
**Story Points:** 2

**Description:**
Run full validation suite and update documentation.

**Acceptance Criteria:**
- [ ] `npm run build` passes
- [ ] `npm test` passes (all 82+ tests)
- [ ] `npm run lint` passes
- [ ] orchestrate.sh runs without "file not found" error
- [ ] Update CHANGELOG.md with new features
- [ ] Update README if needed

---

## Task Dependencies

```
TASK-053 (manager-entry.ts)
    │
    ├──► TASK-054 (worker-entry.ts) [can be parallel]
    │
    └──► TASK-056 (E2E tests) [depends on 053, 054]

TASK-055 (ESLint migration) [independent]

TASK-057 (package.json bin) [depends on 053, 054]

TASK-058 (validation) [depends on all above]
```

## Execution Order

1. **TASK-053** + **TASK-054** (parallel) - Build entry points
2. **TASK-055** (parallel with above) - Fix ESLint
3. **TASK-056** - Add E2E tests (after entry points exist)
4. **TASK-057** - Update package.json
5. **TASK-058** - Final validation

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Entry points may need real Claude Code integration | High | Design as pluggable - use mock/stub for testing, real CLI for production |
| ESLint 9 migration may break CI | Medium | Test locally first, update CI config if needed |
| E2E tests may be slow/flaky | Medium | Use short timeouts, mock external calls |

---

## Success Metrics

- [ ] `npm run build` compiles all files including entry points
- [ ] `npm test` passes with 90+ tests
- [ ] `npm run lint` exits with code 0
- [ ] `./scripts/orchestrate.sh` starts without errors
- [ ] Full Ralph Wiggum Loop can execute (in mock mode)

---

## Estimated Effort

| Task | Story Points |
|------|--------------|
| TASK-053 | 5 |
| TASK-054 | 3 |
| TASK-055 | 3 |
| TASK-056 | 5 |
| TASK-057 | 1 |
| TASK-058 | 2 |
| **Total** | **19 story points** |

---

## Plan Reference

- **Created:** 2026-01-12
- **Author:** KreativReason E2E CLI
- **Status:** Ready for implementation
