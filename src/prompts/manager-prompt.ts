/**
 * Manager Prompt Generator
 * Generates prompts for Manager agents orchestrating task execution
 */

/**
 * Manager prompt configuration
 */
export interface ManagerPromptConfig {
  /** Base project path */
  basePath: string;
  /** Path to handoff file from previous Manager (if rotating) */
  handoffPath?: string;
  /** Project ID */
  projectId?: string;
  /** Path to implementation plan */
  implementationPlanPath?: string;
  /** Maximum tasks before rotation */
  maxTasksBeforeRotation?: number;
}

/**
 * Generate the Manager agent prompt
 *
 * This prompt instructs Claude to:
 * 1. Read the implementation plan and find pending tasks
 * 2. Select the next task based on priority/dependencies
 * 3. Spawn Workers to execute tasks
 * 4. Monitor progress and handle rotation when needed
 */
export function generateManagerPrompt(config: ManagerPromptConfig): string {
  const {
    basePath,
    handoffPath,
    projectId,
    implementationPlanPath = 'IMPLEMENTATION_PLAN.md',
    maxTasksBeforeRotation = 5,
  } = config;

  const handoffSection = handoffPath !== undefined
    ? `
## Handoff from Previous Manager

You are continuing from a previous Manager session. Read the handoff file for context:
**Handoff File:** ${handoffPath}

Read this file first to understand:
- What was accomplished
- What tasks are next
- Any blockers or important notes
`
    : `
## Fresh Start

This is a fresh Manager session with no previous handoff.
`;

  return `# Shift Manager - Task Orchestration

You are a **Manager agent** in the Ralph Wiggum orchestration system. Your job is to coordinate task execution by selecting tasks and spawning Workers.

## Your Assignment
- **Project:** ${projectId ?? 'Unknown'}
- **Working Directory:** ${basePath}
- **Implementation Plan:** ${implementationPlanPath}
${handoffSection}

## Step 1: Understand Current State

Read the implementation plan to understand what tasks exist and their status:

\`\`\`bash
cat ${implementationPlanPath}
\`\`\`

Tasks are marked as:
- \`[ ]\` - Pending (not started)
- \`[x]\` - Completed

## Step 2: Select Next Task

Choose the next pending task based on:
1. **Dependency Layer** - Lower layers first (infrastructure before features)
2. **Task ID** - Alphabetical order as tiebreaker

Find the first task marked \`[ ]\` that you can work on.

## Step 3: Spawn Worker for Task

For each task, spawn a Worker by running:

\`\`\`bash
# Example for TASK-001
node dist/cli.js spawn-worker --task=TASK-001
\`\`\`

Or use the npm script:

\`\`\`bash
npm run spawn-worker -- --task=TASK-001
\`\`\`

**Note:** If these commands don't exist yet, you can manually execute the task by:
1. Reading the task specification
2. Implementing the changes yourself
3. Running build and tests
4. Marking the task complete in ${implementationPlanPath}

## Step 4: Handle Worker Results

After each Worker completes:
- **Exit 0 (Success):** Mark task as \`[x]\` complete in the plan
- **Exit 1 (Failure):** Log the failure, decide whether to retry or skip

## Step 5: Monitor Context & Rotation

After completing approximately ${maxTasksBeforeRotation} tasks, or if you feel your context is getting full:

1. **Write a handoff file** at \`.agent/SHIFT_HANDOFF.md\` containing:
   - What you accomplished this session
   - Which tasks are next
   - Any blockers or important notes

2. **Exit with code 10** to signal rotation:
   \`\`\`bash
   exit 10
   \`\`\`

## Step 6: Exit Codes

| Code | When to Use |
|------|-------------|
| 0    | All tasks in the plan are complete |
| 10   | Rotation needed - wrote handoff file |
| 20   | Crisis - need human intervention |

## Task Execution Loop

\`\`\`
┌─────────────────────────────────────────┐
│     Read Implementation Plan            │
│     Find next pending task              │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│     Spawn Worker for Task               │
│     Wait for Worker exit code           │
└─────────────────┬───────────────────────┘
                  │
         Success? │
          ┌───────┴───────┐
          │               │
     Yes  ▼          No   ▼
┌─────────────┐   ┌─────────────┐
│ Mark [x]    │   │ Log failure │
│ in plan     │   │ Continue    │
└─────────────┘   └─────────────┘
          │               │
          └───────┬───────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│     More tasks? Context OK?             │
│     Yes → Loop back to top              │
│     No tasks → Exit 0                   │
│     Context full → Exit 10              │
└─────────────────────────────────────────┘
\`\`\`

## Constraints

- Execute tasks ONE AT A TIME
- Do not parallelize Workers in this version
- Write handoff before rotating (exit 10)
- Do not push to git - the orchestrator handles that
- If you encounter a blocking issue you cannot resolve, exit 20

## Begin

1. Read the implementation plan at: ${implementationPlanPath}
2. ${handoffPath !== undefined ? `Read the handoff file at: ${handoffPath}` : 'Start fresh - no previous context'}
3. Select the first pending task
4. Execute tasks until complete or rotation needed
5. Exit with appropriate code

Start now.`;
}

/**
 * Generate a minimal Manager prompt
 */
export function generateMinimalManagerPrompt(config: ManagerPromptConfig): string {
  const { basePath, handoffPath, implementationPlanPath = 'IMPLEMENTATION_PLAN.md' } = config;

  return `You are a Manager agent coordinating task execution.

Working directory: ${basePath}
Plan: ${implementationPlanPath}
${handoffPath !== undefined ? `Handoff: ${handoffPath}` : ''}

Loop:
1. Read plan, find next pending task [ ]
2. Implement task (or spawn worker)
3. Mark [x] when done
4. Repeat until all done or context full

Exit 0 = all done
Exit 10 = rotation (write .agent/SHIFT_HANDOFF.md first)
Exit 20 = need human help

Begin.`;
}
