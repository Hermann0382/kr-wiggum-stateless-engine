/**
 * Worker Prompt Generator
 * Generates prompts for Worker agents executing tasks via Ralph Wiggum Loop
 */

/**
 * Worker prompt configuration
 */
export interface WorkerPromptConfig {
  /** Task ID (e.g., "TASK-001") */
  taskId: string;
  /** Path to PRD file */
  prdPath: string;
  /** Path to current task JSON file */
  taskPath: string;
  /** Base project path */
  basePath: string;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Project ID for context */
  projectId?: string;
}

/**
 * Generate the Worker agent prompt
 *
 * This prompt instructs Claude to:
 * 1. Read the PRD and task specification
 * 2. Implement the task following the Ralph Wiggum Loop
 * 3. Run build and tests, fix errors up to maxRetries
 * 4. Exit with appropriate code
 */
export function generateWorkerPrompt(config: WorkerPromptConfig): string {
  const {
    taskId,
    prdPath,
    taskPath,
    basePath,
    maxRetries = 5,
    projectId,
  } = config;

  return `# Worker Agent - Task Execution

You are a **Worker agent** in the Ralph Wiggum Loop pattern. Your job is to execute ONE atomic task, then exit.

## Your Assignment
- **Task ID:** ${taskId}
- **Project:** ${projectId ?? 'Unknown'}
- **Working Directory:** ${basePath}

## Step 1: Understand the Context

First, read these files to understand what you need to do:

1. **PRD (Product Requirements):** ${prdPath}
2. **Task Specification:** ${taskPath}

Read both files now before proceeding.

## Step 2: Execute the Ralph Wiggum Loop

Follow this loop until the task succeeds or you hit ${maxRetries} failures:

\`\`\`
┌─────────────────────────────────────────┐
│              EDIT                        │
│  Make code changes to implement task    │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│              BUILD                       │
│  Run: npm run build                     │
│  Fix any TypeScript errors              │
└─────────────────┬───────────────────────┘
                  │
             Pass │ Fail → Fix and retry
                  │
                  ▼
┌─────────────────────────────────────────┐
│              TEST                        │
│  Run: npm test                          │
│  Fix any failing tests                  │
└─────────────────┬───────────────────────┘
                  │
             Pass │ Fail → Fix and retry (max ${maxRetries})
                  │
                  ▼
┌─────────────────────────────────────────┐
│           SUCCESS                        │
│  Task complete - exit with code 0       │
└─────────────────────────────────────────┘
\`\`\`

## Step 3: Implementation Guidelines

1. **Focus ONLY on this task** - Do not modify unrelated code
2. **Follow existing patterns** - Match the code style already in the project
3. **Write tests if required** - The task spec will indicate if tests are needed
4. **Keep changes minimal** - Smallest change that satisfies the task
5. **No over-engineering** - Don't add features not in the task spec

## Step 4: Build & Test Commands

\`\`\`bash
# TypeScript compilation
npm run build

# Linting
npm run lint

# Run tests
npm test
\`\`\`

## Step 5: Exit Codes

When you're done, you MUST exit with the appropriate code:

| Code | When to Use |
|------|-------------|
| 0    | Task completed successfully (build passes, tests pass) |
| 1    | Task failed after ${maxRetries} retry attempts |

**IMPORTANT:** Use the Bash tool to run \`exit 0\` or \`exit 1\` as your final action.

## Constraints

- You have a maximum of ${maxRetries} attempts to fix build/test failures
- If you cannot complete the task after ${maxRetries} attempts, exit with code 1
- Do NOT ask for human help - either succeed or fail
- Do NOT modify files outside the scope of this task
- Do NOT commit changes - the orchestrator handles that

## Begin

1. Read the PRD file at: ${prdPath}
2. Read the task file at: ${taskPath}
3. Implement the task
4. Run build and tests
5. Exit with code 0 (success) or 1 (failure)

Start now.`;
}

/**
 * Generate a minimal Worker prompt for simple tasks
 */
export function generateMinimalWorkerPrompt(config: WorkerPromptConfig): string {
  const { taskId, prdPath, taskPath, basePath } = config;

  return `You are a Worker agent. Execute task ${taskId}.

Read:
- PRD: ${prdPath}
- Task: ${taskPath}

Working directory: ${basePath}

Loop: EDIT → BUILD (npm run build) → TEST (npm test) → repeat if fail (max 5x)

Exit 0 on success, exit 1 on failure.

Begin.`;
}
