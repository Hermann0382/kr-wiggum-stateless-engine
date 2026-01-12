/**
 * Worker process spawning
 * Spawns fresh Claude Code instance per task, kills after completion
 */
import { spawn, type ChildProcess } from 'node:child_process';

import { EXIT_CODES, type ProcessSpawnResult, type ExitCode } from '../../types/index.js';

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
 * Spawn a Worker process
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

  return new Promise((resolve) => {
    const start = Date.now();
    let stdout = '';
    let stderr = '';

    // Build environment
    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      NODE_ENV: 'production',
      WORKER_MODE: 'true',
      TASK_ID: taskId,
      PRD_PATH: prdPath,
      CURRENT_TASK_PATH: currentTaskPath,
    };

    if (projectId !== undefined) {
      env['PROJECT_ID'] = projectId;
    }

    // Spawn the Worker process
    // In production, this would spawn Claude Code with worker prompt
    // For now, we simulate with a Node.js script
    const child = spawn('node', ['--experimental-specifier-resolution=node', 'dist/worker-entry.js'], {
      cwd: basePath,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Set timeout
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      resolve({
        pid: child.pid ?? 0,
        exitCode: EXIT_CODES.CRASH,
        stdout,
        stderr: stderr + '\nWorker timed out',
        duration: Date.now() - start,
        taskId,
        success: false,
      });
    }, timeout);

    // Capture output
    child.stdout?.on('data', (data: Buffer) => {
      const str = data.toString();
      stdout += str;
      onOutput?.(str);
    });

    child.stderr?.on('data', (data: Buffer) => {
      const str = data.toString();
      stderr += str;
      onOutput?.(str);
    });

    // Handle exit
    child.on('exit', (code) => {
      clearTimeout(timer);
      resolve({
        pid: child.pid ?? 0,
        exitCode: (code ?? EXIT_CODES.CRASH) as ExitCode,
        stdout,
        stderr,
        duration: Date.now() - start,
        taskId,
        success: code === EXIT_CODES.SUCCESS,
      });
    });

    // Handle errors
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({
        pid: child.pid ?? 0,
        exitCode: EXIT_CODES.CRASH,
        stdout,
        stderr: stderr + '\n' + error.message,
        duration: Date.now() - start,
        taskId,
        success: false,
      });
    });
  });
}

/**
 * Worker pool for managing multiple concurrent workers
 */
export class WorkerPool {
  private readonly basePath: string;
  private readonly maxConcurrent: number;
  private activeWorkers: Map<string, ChildProcess> = new Map();
  private completedTasks: WorkerSpawnResult[] = [];

  constructor(basePath: string, maxConcurrent: number = 1) {
    this.basePath = basePath;
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Spawn a worker for a task
   */
  async spawnForTask(config: Omit<WorkerSpawnConfig, 'basePath'>): Promise<WorkerSpawnResult> {
    if (this.activeWorkers.size >= this.maxConcurrent) {
      throw new Error(`Max concurrent workers (${this.maxConcurrent}) reached`);
    }

    const result = await spawnWorker({
      basePath: this.basePath,
      ...config,
    });

    this.completedTasks.push(result);
    return result;
  }

  /**
   * Get active worker count
   */
  getActiveCount(): number {
    return this.activeWorkers.size;
  }

  /**
   * Get completed tasks
   */
  getCompletedTasks(): WorkerSpawnResult[] {
    return [...this.completedTasks];
  }

  /**
   * Kill all active workers
   */
  killAll(): void {
    for (const [taskId, process] of this.activeWorkers) {
      process.kill('SIGTERM');
    }
    this.activeWorkers.clear();
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
