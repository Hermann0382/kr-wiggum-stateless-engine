/**
 * Manager for IMPLEMENTATION_PLAN.md
 * Checkbox parsing, progress calculation, next unchecked task retrieval
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Task, TaskStatus } from '../schemas/index.js';

import { calculateHash, ensureDirectory } from './file-state-manager.js';

const IMPLEMENTATION_PLAN_FILE = 'IMPLEMENTATION_PLAN.md';

/**
 * Parsed task from markdown checkbox
 */
export interface ParsedTask {
  id: string;
  title: string;
  checked: boolean;
  dependencyLayer: number;
  lineNumber: number;
}

/**
 * Progress summary
 */
export interface ProgressSummary {
  total: number;
  completed: number;
  remaining: number;
  percentComplete: number;
}

/**
 * Implementation plan manager for IMPLEMENTATION_PLAN.md
 */
export class ImplementationPlanManager {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  private getFilePath(): string {
    return join(this.basePath, IMPLEMENTATION_PLAN_FILE);
  }

  /**
   * Read and parse the implementation plan
   */
  async read(): Promise<string> {
    try {
      return await readFile(this.getFilePath(), 'utf-8');
    } catch {
      return '';
    }
  }

  /**
   * Write the implementation plan
   */
  async write(content: string): Promise<void> {
    await ensureDirectory(this.basePath);
    await writeFile(this.getFilePath(), content, 'utf-8');
  }

  /**
   * Parse tasks from markdown content
   */
  parseTasks(content: string): ParsedTask[] {
    const tasks: ParsedTask[] = [];
    const lines = content.split('\n');
    let currentLayer = 0;

    // Regex to match checkbox tasks: - [ ] ST-001: Title or - [x] ST-001: Title
    const taskRegex = /^(\s*)- \[([ x])\] (ST-\d{3}):\s*(.+)$/;

    lines.forEach((line, index) => {
      // Detect dependency layer from headers
      const headerMatch = line.match(/^(#{1,6})\s+Layer\s+(\d+)/i);
      if (headerMatch !== null) {
        currentLayer = parseInt(headerMatch[2] ?? '0', 10);
        return;
      }

      const match = line.match(taskRegex);
      if (match !== null) {
        tasks.push({
          id: match[3] ?? '',
          title: match[4] ?? '',
          checked: match[2] === 'x',
          dependencyLayer: currentLayer,
          lineNumber: index + 1,
        });
      }
    });

    return tasks;
  }

  /**
   * Get progress summary
   */
  async getProgress(): Promise<ProgressSummary> {
    const content = await this.read();
    const tasks = this.parseTasks(content);
    const completed = tasks.filter((t) => t.checked).length;

    return {
      total: tasks.length,
      completed,
      remaining: tasks.length - completed,
      percentComplete: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0,
    };
  }

  /**
   * Get next unchecked task
   */
  async getNextTask(): Promise<ParsedTask | null> {
    const content = await this.read();
    const tasks = this.parseTasks(content);

    // Sort by dependency layer, then by ID
    const unchecked = tasks
      .filter((t) => !t.checked)
      .sort((a, b) => {
        if (a.dependencyLayer !== b.dependencyLayer) {
          return a.dependencyLayer - b.dependencyLayer;
        }
        return a.id.localeCompare(b.id);
      });

    return unchecked[0] ?? null;
  }

  /**
   * Mark a task as complete (check the checkbox)
   */
  async markTaskComplete(taskId: string): Promise<boolean> {
    const content = await this.read();
    const lines = content.split('\n');
    let found = false;

    const updatedLines = lines.map((line) => {
      const match = line.match(/^(\s*)- \[ \] (ST-\d{3}):/);
      if (match !== null && match[2] === taskId) {
        found = true;
        return line.replace('- [ ]', '- [x]');
      }
      return line;
    });

    if (found) {
      await this.write(updatedLines.join('\n'));
    }

    return found;
  }

  /**
   * Unmark a task (uncheck the checkbox)
   */
  async unmarkTask(taskId: string): Promise<boolean> {
    const content = await this.read();
    const lines = content.split('\n');
    let found = false;

    const updatedLines = lines.map((line) => {
      const match = line.match(/^(\s*)- \[x\] (ST-\d{3}):/);
      if (match !== null && match[2] === taskId) {
        found = true;
        return line.replace('- [x]', '- [ ]');
      }
      return line;
    });

    if (found) {
      await this.write(updatedLines.join('\n'));
    }

    return found;
  }

  /**
   * Get content hash for change detection
   */
  async getHash(): Promise<string> {
    const content = await this.read();
    return calculateHash(content);
  }

  /**
   * Check if file exists
   */
  async exists(): Promise<boolean> {
    try {
      await readFile(this.getFilePath());
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create an implementation plan manager instance
 */
export function createImplementationPlanManager(basePath: string): ImplementationPlanManager {
  return new ImplementationPlanManager(basePath);
}
