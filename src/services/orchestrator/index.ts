/**
 * Orchestrator main service
 * Coordinates Manager and Worker lifecycle management
 */
import { EXIT_CODES } from '../../types/index.js';
import {
  createManagerLifecycle,
  type ManagerLifecycle,
  type ManagerSpawnConfig,
} from './manager-lifecycle.js';
import {
  createWorkerPool,
  type WorkerPool,
  type WorkerSpawnConfig,
  type WorkerSpawnResult,
} from './worker-spawner.js';
import {
  createErrorRecovery,
  type ErrorRecovery,
  type RecoveryAction,
  sleep,
} from './error-recovery.js';

// Re-export sub-modules
export * from './manager-lifecycle.js';
export * from './worker-spawner.js';
export * from './error-recovery.js';

/**
 * Orchestrator configuration
 */
export interface OrchestratorConfig {
  basePath: string;
  maxManagerRotations?: number;
  maxConsecutiveFailures?: number;
  retrySleepMs?: number;
  onManagerStart?: () => void;
  onManagerComplete?: (exitCode: number) => void;
  onWorkerStart?: (taskId: string) => void;
  onWorkerComplete?: (result: WorkerSpawnResult) => void;
  onCrisisMode?: (reason: string) => void;
}

/**
 * Orchestrator state
 */
export interface OrchestratorState {
  isRunning: boolean;
  managerRotations: number;
  tasksCompleted: number;
  tasksFailed: number;
  inCrisisMode: boolean;
  crisisReason: string | null;
}

/**
 * Orchestrator result
 */
export interface OrchestratorResult {
  success: boolean;
  state: OrchestratorState;
  reason: string;
}

/**
 * Orchestrator service
 * Main entry point for the Manager/Worker lifecycle
 */
export class Orchestrator {
  private readonly config: OrchestratorConfig;
  private readonly managerLifecycle: ManagerLifecycle;
  private readonly workerPool: WorkerPool;
  private readonly errorRecovery: ErrorRecovery;
  private state: OrchestratorState;

  constructor(config: OrchestratorConfig) {
    this.config = config;
    this.managerLifecycle = createManagerLifecycle(config.basePath);
    this.workerPool = createWorkerPool(config.basePath, 1);
    this.errorRecovery = createErrorRecovery({
      maxConsecutiveFailures: config.maxConsecutiveFailures ?? 3,
      retrySleepMs: config.retrySleepMs ?? 5000,
    });
    this.state = {
      isRunning: false,
      managerRotations: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      inCrisisMode: false,
      crisisReason: null,
    };
  }

  /**
   * Run the orchestration loop
   */
  async run(): Promise<OrchestratorResult> {
    this.state.isRunning = true;
    const maxRotations = this.config.maxManagerRotations ?? 10;

    try {
      while (
        this.state.isRunning &&
        this.state.managerRotations < maxRotations &&
        !this.state.inCrisisMode
      ) {
        // Start Manager
        this.config.onManagerStart?.();

        const managerResult = await this.managerLifecycle.start({
          handoffFile: this.state.managerRotations > 0
            ? '.agent/SHIFT_HANDOFF.md'
            : undefined,
        });

        this.config.onManagerComplete?.(managerResult.exitCode ?? EXIT_CODES.CRASH);

        // Process exit code
        const recovery = this.errorRecovery.processExitCode(
          managerResult.exitCode ?? EXIT_CODES.CRASH,
          managerResult.stderr
        );

        // Handle recovery action
        const shouldContinue = await this.handleRecoveryAction(recovery);

        if (!shouldContinue) {
          break;
        }

        // Check for rotation
        if (this.managerLifecycle.needsRotation()) {
          this.state.managerRotations++;
          this.managerLifecycle.reset();
        }

        // Check for completion
        if (this.managerLifecycle.isComplete()) {
          this.state.isRunning = false;
          return {
            success: true,
            state: this.getState(),
            reason: 'All tasks completed successfully',
          };
        }
      }

      // Determine final result
      if (this.state.inCrisisMode) {
        return {
          success: false,
          state: this.getState(),
          reason: `Crisis mode: ${this.state.crisisReason}`,
        };
      }

      if (this.state.managerRotations >= maxRotations) {
        return {
          success: false,
          state: this.getState(),
          reason: `Max Manager rotations (${maxRotations}) reached`,
        };
      }

      return {
        success: true,
        state: this.getState(),
        reason: 'Orchestration completed',
      };
    } catch (error) {
      return {
        success: false,
        state: this.getState(),
        reason: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      this.state.isRunning = false;
    }
  }

  /**
   * Handle a recovery action
   */
  private async handleRecoveryAction(action: RecoveryAction): Promise<boolean> {
    switch (action.type) {
      case 'continue':
        return true;

      case 'rotate_manager':
        this.state.managerRotations++;
        return true;

      case 'retry':
        await sleep(action.sleepMs);
        return true;

      case 'crisis_mode':
        this.state.inCrisisMode = true;
        this.state.crisisReason = action.reason;
        this.config.onCrisisMode?.(action.reason);
        return false;

      case 'abort':
        return false;

      default:
        return false;
    }
  }

  /**
   * Spawn a Worker for a task
   */
  async spawnWorker(config: Omit<WorkerSpawnConfig, 'basePath'>): Promise<WorkerSpawnResult> {
    this.config.onWorkerStart?.(config.taskId);

    const result = await this.workerPool.spawnForTask(config);

    if (result.success) {
      this.state.tasksCompleted++;
    } else {
      this.state.tasksFailed++;
    }

    this.config.onWorkerComplete?.(result);

    return result;
  }

  /**
   * Stop the orchestrator
   */
  stop(): void {
    this.state.isRunning = false;
    this.managerLifecycle.stop();
    this.workerPool.killAll();
  }

  /**
   * Trigger crisis mode manually
   */
  triggerCrisisMode(reason: string): void {
    this.state.inCrisisMode = true;
    this.state.crisisReason = reason;
    this.config.onCrisisMode?.(reason);
    this.stop();
  }

  /**
   * Get current state
   */
  getState(): OrchestratorState {
    return { ...this.state };
  }

  /**
   * Get statistics
   */
  getStats(): {
    managerRotations: number;
    tasksCompleted: number;
    tasksFailed: number;
    workerSuccessRate: number;
    recoveryAttempts: number;
  } {
    const recoveryStats = this.errorRecovery.getStats();
    return {
      managerRotations: this.state.managerRotations,
      tasksCompleted: this.state.tasksCompleted,
      tasksFailed: this.state.tasksFailed,
      workerSuccessRate: this.workerPool.getSuccessRate(),
      recoveryAttempts: recoveryStats.totalRecoveryAttempts,
    };
  }
}

/**
 * Create an Orchestrator instance
 */
export function createOrchestrator(config: OrchestratorConfig): Orchestrator {
  return new Orchestrator(config);
}
