/**
 * Worker process spawning
 * Spawns fresh Claude Code instance per task, kills after completion
 */
import { generateWorkerPrompt } from '../../prompts/index.js';
import { type ProcessSpawnResult } from '../../types/index.js';

import { spawnClaude, type ClaudeSpawnResult } from './claude-spawner.js';

/**
 * Worker spawn configuration
 */
export interface WorkerSpawnConfig {
  basePath: string;
  taskId: string;
  prdPath: string;
  currentTaskPath: string;
  projectId?: string;
  timeout?: number;
  onOutput?: (data: string) => void;
}

/**
 * Worker spawn result with task info
 */
export interface WorkerSpawnResult extends ProcessSpawnResult {
  taskId: string;
  success: boolean;
}

/**
 * Spawn a Worker process using Claude Code CLI
 */
export async function spawnWorker(config: WorkerSpawnConfig): Promise<WorkerSpawnResult> {
  const {
    basePath,
    taskId,
    prdPath,
    currentTaskPath,
    projectId,
    timeout = 300000, // 5 minutes default
    onOutput,
  } = config;

  // Generate the Worker prompt
  const prompt = generateWorkerPrompt({
    taskId,
    prdPath,
    taskPath: currentTaskPath,
    basePath,
    maxRetries: 5,
    projectId,
  });

  // Spawn Claude Code CLI with the prompt
  const result: ClaudeSpawnResult = await spawnClaude({
    prompt,
    cwd: basePath,
    timeout,
    onOutput,
    // Workers get full tool access for editing, building, testing
    allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
  });

  return {
    pid: result.pid,
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
    duration: result.duration,
    taskId,
    success: result.success,
  };
}

/**
 * Worker pool for managing multiple concurrent workers
 * Note: With Claude CLI, workers are spawned as blocking processes
 */
export class WorkerPool {
  private readonly basePath: string;
  private readonly maxConcurrent: number;
  private activeCount: number = 0;
  private completedTasks: WorkerSpawnResult[] = [];

  constructor(basePath: string, maxConcurrent: number = 1) {
    this.basePath = basePath;
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Spawn a worker for a task
   */
  async spawnForTask(config: Omit<WorkerSpawnConfig, 'basePath'>): Promise<WorkerSpawnResult> {
    if (this.activeCount >= this.maxConcurrent) {
      throw new Error(`Max concurrent workers (${this.maxConcurrent}) reached`);
    }

    this.activeCount++;
    try {
      const result = await spawnWorker({
        basePath: this.basePath,
        ...config,
      });

      this.completedTasks.push(result);
      return result;
    } finally {
      this.activeCount--;
    }
  }

  /**
   * Get active worker count
   */
  getActiveCount(): number {
    return this.activeCount;
  }

  /**
   * Get completed tasks
   */
  getCompletedTasks(): WorkerSpawnResult[] {
    return [...this.completedTasks];
  }

  /**
   * Get success rate
   */
  getSuccessRate(): number {
    if (this.completedTasks.length === 0) {
      return 1;
    }
    const successful = this.completedTasks.filter((t) => t.success).length;
    return successful / this.completedTasks.length;
  }
}

/**
 * Create a worker pool
 */
export function createWorkerPool(basePath: string, maxConcurrent: number = 1): WorkerPool {
  return new WorkerPool(basePath, maxConcurrent);
}
