/**
 * Worker task assignment
 * Selects next unchecked task, prepares minimal context injection
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Task } from '../../schemas/index.js';
import {
  createImplementationPlanManager,
  type ParsedTask,
  ensureDirectory,
} from '../../state/index.js';

/**
 * Task selection result
 */
export interface TaskSelectionResult {
  task: ParsedTask;
  contextFiles: string[];
  prdPath: string;
  currentTaskPath: string;
}

/**
 * Task selection options
 */
export interface TaskSelectionOptions {
  basePath: string;
  specsPath?: string;
  preferLayer?: number;
}

/**
 * Task selector for Worker assignment
 */
export class TaskSelector {
  private readonly basePath: string;
  private readonly specsPath: string;

  constructor(options: TaskSelectionOptions) {
    this.basePath = options.basePath;
    this.specsPath = options.specsPath ?? join(options.basePath, 'specs');
  }

  /**
   * Select the next task for a Worker
   */
  async selectNextTask(): Promise<TaskSelectionResult | null> {
    const planManager = createImplementationPlanManager(this.basePath);
    const nextTask = await planManager.getNextTask();

    if (nextTask === null) {
      return null;
    }

    // Prepare context files - minimal set for Worker
    const contextFiles = await this.prepareContextFiles(nextTask);

    // Write current task file
    const currentTaskPath = await this.writeCurrentTaskFile(nextTask);

    return {
      task: nextTask,
      contextFiles,
      prdPath: join(this.specsPath, 'PRD.md'),
      currentTaskPath,
    };
  }

  /**
   * Prepare minimal context files for Worker
   */
  private async prepareContextFiles(task: ParsedTask): Promise<string[]> {
    const contextFiles: string[] = [];

    // Always include PRD
    const prdPath = join(this.specsPath, 'PRD.md');
    contextFiles.push(prdPath);

    // Include specification index
    const pinPath = join(this.specsPath, 'index.md');
    contextFiles.push(pinPath);

    // Include relevant ADR entries (search by task keywords)
    // For now, just include the ADR file if it exists
    const adrPath = join(this.basePath, '.agent', 'ADR.md');
    contextFiles.push(adrPath);

    return contextFiles;
  }

  /**
   * Write current task file for Worker
   */
  private async writeCurrentTaskFile(task: ParsedTask): Promise<string> {
    const ralphDir = join(this.basePath, '.ralph');
    await ensureDirectory(ralphDir);

    const content = `# Current Task

## ${task.id}: ${task.title}

**Dependency Layer**: ${task.dependencyLayer}
**Line in Plan**: ${task.lineNumber}

---

## Instructions

1. Read the PRD.md to understand the full context
2. Implement the task described above
3. Follow the Ralph Wiggum Loop:
   - Edit code
   - Build (tsc)
   - Test (vitest)
   - Fix any errors
   - Repeat until tests pass
4. Write a status fragment when complete
5. Self-destruct (exit 0)

---

## Constraints

- Maximum 5 files modified
- Maximum 150 lines of code
- Must pass TypeScript compilation
- Must pass all tests
- Must follow KreativReason standards

---

## On Completion

When the task is complete:
1. Ensure all tests pass
2. Write status fragment to .ralph/status-fragment.json
3. Exit with code 0

If blocked:
1. Write blocker description to status fragment
2. Exit with code 1
`;

    const filePath = join(ralphDir, 'current-task.md');
    await writeFile(filePath, content, 'utf-8');

    return filePath;
  }

  /**
   * Get task by ID
   */
  async getTaskById(taskId: string): Promise<ParsedTask | null> {
    const planManager = createImplementationPlanManager(this.basePath);
    const content = await planManager.read();
    const tasks = planManager.parseTasks(content);

    return tasks.find((t) => t.id === taskId) ?? null;
  }

  /**
   * Get all pending tasks
   */
  async getPendingTasks(): Promise<ParsedTask[]> {
    const planManager = createImplementationPlanManager(this.basePath);
    const content = await planManager.read();
    const tasks = planManager.parseTasks(content);

    return tasks.filter((t) => !t.checked);
  }

  /**
   * Get tasks by layer
   */
  async getTasksByLayer(layer: number): Promise<ParsedTask[]> {
    const planManager = createImplementationPlanManager(this.basePath);
    const content = await planManager.read();
    const tasks = planManager.parseTasks(content);

    return tasks.filter((t) => t.dependencyLayer === layer);
  }

  /**
   * Check if all tasks in a layer are complete
   */
  async isLayerComplete(layer: number): Promise<boolean> {
    const layerTasks = await this.getTasksByLayer(layer);
    return layerTasks.every((t) => t.checked);
  }

  /**
   * Get next available layer
   */
  async getNextAvailableLayer(): Promise<number | null> {
    const planManager = createImplementationPlanManager(this.basePath);
    const content = await planManager.read();
    const tasks = planManager.parseTasks(content);

    // Group by layer
    const layers = new Map<number, ParsedTask[]>();
    for (const task of tasks) {
      const layerTasks = layers.get(task.dependencyLayer) ?? [];
      layerTasks.push(task);
      layers.set(task.dependencyLayer, layerTasks);
    }

    // Find first layer with incomplete tasks
    const sortedLayers = Array.from(layers.keys()).sort((a, b) => a - b);
    for (const layer of sortedLayers) {
      const layerTasks = layers.get(layer) ?? [];
      if (layerTasks.some((t) => !t.checked)) {
        return layer;
      }
    }

    return null;
  }
}

/**
 * Create a task selector instance
 */
export function createTaskSelector(options: TaskSelectionOptions): TaskSelector {
  return new TaskSelector(options);
}
