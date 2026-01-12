/**
 * Shift handoff document generation
 * Writes SHIFT_HANDOFF.md with Accomplishments, Delta, Blockers, last 5 ADRs
 */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

import type { ShiftHandoff } from '../../schemas/index.js';
import {
  createADRManager,
  createImplementationPlanManager,
  ensureDirectory,
} from '../../state/index.js';

/**
 * Shift handoff input
 */
export interface ShiftHandoffInput {
  projectId: string;
  sessionId: string;
  accomplishments: string[];
  architectureDelta: string;
  blockers?: Array<{
    taskId: string;
    description: string;
    suggestedResolution?: string;
  }>;
  contextFillAtHandoff: number;
}

/**
 * Shift handoff result
 */
export interface ShiftHandoffResult {
  filePath: string;
  handoff: ShiftHandoff;
}

/**
 * Shift handoff writer
 */
export class ShiftHandoffWriter {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  /**
   * Write a shift handoff document
   */
  async write(input: ShiftHandoffInput): Promise<ShiftHandoffResult> {
    // Get last 5 ADRs
    const adrManager = createADRManager(this.basePath);
    const lastADRs = await adrManager.getLastADRIds(5);

    // Get next priority tasks
    const planManager = createImplementationPlanManager(this.basePath);
    const nextTask = await planManager.getNextTask();
    const pendingTasks = nextTask !== null ? [nextTask.id] : [];

    // Get more pending tasks
    const content = await planManager.read();
    const allTasks = planManager.parseTasks(content);
    const morePending = allTasks
      .filter((t) => !t.checked)
      .slice(0, 10)
      .map((t) => t.id);

    const now = new Date().toISOString();

    const handoff: ShiftHandoff = {
      id: randomUUID(),
      project_id: input.projectId,
      from_session_id: input.sessionId,
      accomplishments: input.accomplishments,
      architecture_delta: input.architectureDelta,
      blockers: (input.blockers ?? []).map(b => ({
        task_id: b.taskId,
        description: b.description,
        suggested_resolution: b.suggestedResolution,
      })),
      last_5_adrs: lastADRs,
      next_priority_tasks: [...new Set([...pendingTasks, ...morePending])].slice(0, 10),
      context_fill_at_handoff: input.contextFillAtHandoff,
      created_at: now,
    };

    // Write markdown file
    const markdownContent = this.generateMarkdown(handoff);
    const agentDir = join(this.basePath, '.agent');
    await ensureDirectory(agentDir);

    const filePath = join(agentDir, 'SHIFT_HANDOFF.md');
    await writeFile(filePath, markdownContent, 'utf-8');

    // Also write JSON for programmatic access
    const jsonPath = join(agentDir, 'shift-handoff.json');
    await writeFile(jsonPath, JSON.stringify(handoff, null, 2), 'utf-8');

    return { filePath, handoff };
  }

  /**
   * Generate markdown content for handoff
   */
  private generateMarkdown(handoff: ShiftHandoff): string {
    const date = new Date(handoff.created_at).toLocaleString();

    let content = `# Shift Handoff

**Generated**: ${date}
**Session**: ${handoff.from_session_id.slice(0, 8)}...
**Context Fill**: ${handoff.context_fill_at_handoff}%

---

## Accomplishments

${handoff.accomplishments.map((a) => `- ${a}`).join('\n')}

---

## Architecture Delta

${handoff.architecture_delta}

---

## Blockers

`;

    if (handoff.blockers.length === 0) {
      content += '*No blockers identified.*\n';
    } else {
      for (const blocker of handoff.blockers) {
        content += `### ${blocker.task_id}

${blocker.description}

`;
        if (blocker.suggested_resolution !== undefined) {
          content += `**Suggested Resolution**: ${blocker.suggested_resolution}\n\n`;
        }
      }
    }

    content += `---

## Recent ADRs

${handoff.last_5_adrs.length > 0 ? handoff.last_5_adrs.map((id) => `- ${id}`).join('\n') : '*No recent ADRs.*'}

---

## Next Priority Tasks

${handoff.next_priority_tasks.map((id) => `- [ ] ${id}`).join('\n')}

---

## Instructions for Next Manager

1. Read this handoff document completely
2. Review the accomplishments and blockers
3. Check the recent ADRs for context
4. Start with the first priority task
5. Continue the Ralph Wiggum Loop pattern
6. Write your own handoff when context fills to 60%

---

*This handoff was generated automatically by the KR-Wiggum Stateless Engine.*
`;

    return content;
  }

  /**
   * Read existing handoff file
   */
  async read(): Promise<ShiftHandoff | null> {
    try {
      const { readFile } = await import('node:fs/promises');
      const jsonPath = join(this.basePath, '.agent', 'shift-handoff.json');
      const content = await readFile(jsonPath, 'utf-8');
      return JSON.parse(content) as ShiftHandoff;
    } catch {
      return null;
    }
  }

  /**
   * Mark handoff as picked up
   */
  async markPickedUp(toSessionId: string): Promise<void> {
    const handoff = await this.read();
    if (handoff === null) {
      return;
    }

    handoff.to_session_id = toSessionId;
    handoff.picked_up_at = new Date().toISOString();

    const jsonPath = join(this.basePath, '.agent', 'shift-handoff.json');
    await writeFile(jsonPath, JSON.stringify(handoff, null, 2), 'utf-8');
  }
}

/**
 * Create a shift handoff writer instance
 */
export function createShiftHandoffWriter(basePath: string): ShiftHandoffWriter {
  return new ShiftHandoffWriter(basePath);
}
