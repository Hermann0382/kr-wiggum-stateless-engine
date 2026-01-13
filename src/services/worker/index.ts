/**
 * Worker orchestrator
 * Orchestrates Worker lifecycle components
 */
import { randomUUID } from 'node:crypto';

import type { WorkerSession } from '../../types/index.js';

import {
  bootFreshContext,
  WORKER_CONSTRAINTS,
  validateWorkerCapacity,
  type WorkerBootConfig,
  type WorkerBootResult,
} from './fresh-context-boot.js';
import {
  runRalphWiggumLoop,
  runSingleIteration,
  type LoopConfig,
  type LoopResult,
} from './ralph-wiggum-loop.js';
import {
  prepareForSelfDestruct,
  selfDestructSuccess,
  selfDestructFailure,
  selfDestructCrisis,
  shouldSelfDestructContextFull,
  determineExitCode,
  getExitCodeDescription,
} from './self-destruct.js';
import {
  writeStatusFragment,
  writeBlockedFragment,
  readStatusFragment,
  type StatusFragmentInput,
  type FileChange,
} from './status-fragment-writer.js';

// Re-export sub-modules
export * from './fresh-context-boot.js';
export * from './ralph-wiggum-loop.js';
export * from './status-fragment-writer.js';
export * from './self-destruct.js';

/**
 * Worker configuration
 */
export interface WorkerConfig {
  basePath: string;
  projectId: string;
  taskId: string;
  prdPath: string;
  currentTaskPath: string;
  maxRetries?: number;
  contextWindowSize?: number;
}

/**
 * Worker result
 */
export interface WorkerResult {
  success: boolean;
  sessionId: string;
  taskId: string;
  loopResult: LoopResult;
  statusFragmentPath: string | null;
  exitCode: number;
  reason: string;
}

/**
 * Worker service
 * Orchestrates the full Worker lifecycle
 */
export class Worker {
  private readonly config: WorkerConfig;
  private session: WorkerSession | null = null;
  private bootResult: WorkerBootResult | null = null;
  private filesChanged: FileChange[] = [];

  constructor(config: WorkerConfig) {
    this.config = config;
  }

  /**
   * Boot the Worker with fresh context
   */
  async boot(): Promise<WorkerBootResult> {
    const bootConfig: WorkerBootConfig = {
      basePath: this.config.basePath,
      projectId: this.config.projectId,
      taskId: this.config.taskId,
      prdPath: this.config.prdPath,
      currentTaskPath: this.config.currentTaskPath,
      contextWindowSize: this.config.contextWindowSize,
    };

    this.bootResult = await bootFreshContext(bootConfig);

    this.session = {
      sessionId: this.bootResult.sessionId,
      projectId: this.config.projectId,
      taskId: this.config.taskId,
      startedAt: new Date(),
      retryCount: 0,
      maxRetries: this.config.maxRetries ?? WORKER_CONSTRAINTS.MAX_RETRIES,
      prdPath: this.config.prdPath,
      currentTaskPath: this.config.currentTaskPath,
    };

    return this.bootResult;
  }

  /**
   * Run the Ralph Wiggum Loop
   */
  async runLoop(): Promise<LoopResult> {
    if (this.session === null) {
      throw new Error('Worker not booted. Call boot() first.');
    }

    const loopConfig: LoopConfig = {
      basePath: this.config.basePath,
      maxIterations: this.session.maxRetries,
    };

    const result = await runRalphWiggumLoop(loopConfig);

    // Update session with retry count
    this.session.retryCount = result.iterations;

    return result;
  }

  /**
   * Record a file change
   */
  recordFileChange(change: FileChange): void {
    this.filesChanged.push(change);
  }

  /**
   * Write status fragment
   */
  async writeStatusFragment(whatFixed: string, patternsUsed: string[] = []): Promise<string> {
    if (this.session === null || this.bootResult === null) {
      throw new Error('Worker not booted. Call boot() first.');
    }

    const input: StatusFragmentInput = {
      projectId: this.config.projectId,
      sessionId: this.bootResult.sessionId,
      taskId: this.config.taskId,
      whatFixed,
      whatChanged: this.filesChanged,
      patternsUsed,
      testsPassed: true, // Will be updated by loop
      compilerPassed: true,
      retryCount: this.session.retryCount,
    };

    const result = await writeStatusFragment(this.config.basePath, input);
    return result.filePath;
  }

  /**
   * Run the full Worker lifecycle
   */
  async run(): Promise<WorkerResult> {
    // Step 1: Boot with fresh context
    await this.boot();

    if (this.bootResult === null || this.session === null) {
      throw new Error('Boot failed');
    }

    // Step 2: Run the Ralph Wiggum Loop
    const loopResult = await this.runLoop();

    // Step 3: Write status fragment
    let statusFragmentPath: string | null = null;
    try {
      const whatFixed = loopResult.success
        ? `Completed task ${this.config.taskId} successfully`
        : `Task ${this.config.taskId} failed: ${loopResult.reason}`;

      // Update status fragment with actual results
      const input: StatusFragmentInput = {
        projectId: this.config.projectId,
        sessionId: this.bootResult.sessionId,
        taskId: this.config.taskId,
        whatFixed,
        whatChanged: this.filesChanged,
        patternsUsed: [],
        testsPassed: loopResult.finalState.testsPass,
        compilerPassed: loopResult.finalState.compilerPass,
        retryCount: loopResult.iterations,
      };

      const fragmentResult = await writeStatusFragment(this.config.basePath, input);
      statusFragmentPath = fragmentResult.filePath;
    } catch {
      // Status fragment write failed, continue
    }

    // Step 4: Determine exit code
    const exitCode = determineExitCode({
      success: loopResult.success,
      testsPassed: loopResult.finalState.testsPass,
      compilerPassed: loopResult.finalState.compilerPass,
      retryCount: loopResult.iterations,
      maxRetries: this.session.maxRetries,
    });

    return {
      success: loopResult.success,
      sessionId: this.bootResult.sessionId,
      taskId: this.config.taskId,
      loopResult,
      statusFragmentPath,
      exitCode,
      reason: loopResult.reason,
    };
  }

  /**
   * Execute self-destruct based on result
   */
  async selfDestruct(result: WorkerResult): Promise<never> {
    if (result.success) {
      await selfDestructSuccess(this.config.basePath, this.config.projectId);
    } else {
      await selfDestructFailure(
        this.config.basePath,
        this.config.projectId,
        result.reason
      );
    }
    // This line is never reached due to process.exit
    throw new Error('Self-destruct failed');
  }

  /**
   * Get current session
   */
  getSession(): WorkerSession | null {
    return this.session;
  }
}

/**
 * Create a Worker instance
 */
export function createWorker(config: WorkerConfig): Worker {
  return new Worker(config);
}

/**
 * Run a Worker for a single task (convenience function)
 */
export async function runWorkerForTask(config: WorkerConfig): Promise<WorkerResult> {
  const worker = createWorker(config);
  return worker.run();
}
