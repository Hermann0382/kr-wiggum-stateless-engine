/**
 * Manager process management
 * Launches Manager with HANDOFF_FILE, monitors exit codes
 */
import { generateManagerPrompt } from '../../prompts/index.js';
import { EXIT_CODES, type ProcessSpawnResult } from '../../types/index.js';

import { spawnClaude, type ClaudeSpawnResult } from './claude-spawner.js';

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
 * Spawn a Manager process using Claude Code CLI
 */
export async function spawnManager(config: ManagerSpawnConfig): Promise<ProcessSpawnResult> {
  const {
    basePath,
    handoffFile,
    projectId,
    timeout = 600000, // 10 minutes default
    onOutput,
  } = config;

  // Generate the Manager prompt
  const prompt = generateManagerPrompt({
    basePath,
    handoffPath: handoffFile,
    projectId,
    implementationPlanPath: 'IMPLEMENTATION_PLAN.md',
    maxTasksBeforeRotation: 5,
  });

  // Spawn Claude Code CLI with the prompt
  const result: ClaudeSpawnResult = await spawnClaude({
    prompt,
    cwd: basePath,
    timeout,
    onOutput,
    // Managers get full tool access for reading, editing, and spawning workers
    allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
  });

  return {
    pid: result.pid,
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
    duration: result.duration,
  };
}

/**
 * Manager lifecycle controller
 * Note: With Claude CLI, managers run as blocking processes
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
   * Stop the Manager (marks as not running)
   * Note: Claude CLI processes are blocking, so this just updates state
   */
  stop(): void {
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
