/**
 * Manager process management
 * Launches Manager with HANDOFF_FILE, monitors exit codes
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';

import { EXIT_CODES, type ProcessSpawnResult, type ExitCode } from '../../types/index.js';

/**
 * Manager spawn configuration
 */
export interface ManagerSpawnConfig {
  basePath: string;
  handoffFile?: string;
  projectId?: string;
  timeout?: number;
  onOutput?: (data: string) => void;
}

/**
 * Manager lifecycle state
 */
export interface ManagerLifecycleState {
  pid: number | null;
  startedAt: Date | null;
  exitCode: number | null;
  isRunning: boolean;
  rotationCount: number;
}

/**
 * Spawn a Manager process
 */
export async function spawnManager(config: ManagerSpawnConfig): Promise<ProcessSpawnResult> {
  const {
    basePath,
    handoffFile,
    projectId,
    timeout = 600000, // 10 minutes default
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
      MANAGER_MODE: 'true',
    };

    if (handoffFile !== undefined) {
      env['HANDOFF_FILE'] = handoffFile;
    }
    if (projectId !== undefined) {
      env['PROJECT_ID'] = projectId;
    }

    // Spawn the Manager process
    // In production, this would spawn Claude Code with manager prompt
    // For now, we simulate with a Node.js script
    const child = spawn('node', ['--experimental-specifier-resolution=node', 'dist/manager-entry.js'], {
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
        stderr: stderr + '\nProcess timed out',
        duration: Date.now() - start,
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
      });
    });
  });
}

/**
 * Manager lifecycle controller
 */
export class ManagerLifecycle {
  private readonly basePath: string;
  private state: ManagerLifecycleState = {
    pid: null,
    startedAt: null,
    exitCode: null,
    isRunning: false,
    rotationCount: 0,
  };
  private currentProcess: ChildProcess | null = null;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  /**
   * Start the Manager
   */
  async start(config: Omit<ManagerSpawnConfig, 'basePath'>): Promise<ProcessSpawnResult> {
    if (this.state.isRunning) {
      throw new Error('Manager already running');
    }

    this.state.isRunning = true;
    this.state.startedAt = new Date();

    const result = await spawnManager({
      basePath: this.basePath,
      ...config,
    });

    this.state.pid = result.pid;
    this.state.exitCode = result.exitCode;
    this.state.isRunning = false;

    // Check if rotation was requested
    if (result.exitCode === EXIT_CODES.ROTATION_NEEDED) {
      this.state.rotationCount++;
    }

    return result;
  }

  /**
   * Stop the Manager
   */
  stop(): void {
    if (this.currentProcess !== null) {
      this.currentProcess.kill('SIGTERM');
      this.currentProcess = null;
    }
    this.state.isRunning = false;
  }

  /**
   * Get current state
   */
  getState(): ManagerLifecycleState {
    return { ...this.state };
  }

  /**
   * Check if rotation is needed
   */
  needsRotation(): boolean {
    return this.state.exitCode === EXIT_CODES.ROTATION_NEEDED;
  }

  /**
   * Check if Manager completed successfully
   */
  isComplete(): boolean {
    return this.state.exitCode === EXIT_CODES.SUCCESS;
  }

  /**
   * Check if crisis mode is needed
   */
  needsCrisisMode(): boolean {
    return this.state.exitCode === EXIT_CODES.HUMAN_INTERVENTION;
  }

  /**
   * Reset for next rotation
   */
  reset(): void {
    this.state.pid = null;
    this.state.startedAt = null;
    this.state.exitCode = null;
  }
}

/**
 * Create a Manager lifecycle controller
 */
export function createManagerLifecycle(basePath: string): ManagerLifecycle {
  return new ManagerLifecycle(basePath);
}
