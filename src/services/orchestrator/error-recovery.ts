/**
 * Crash recovery logic
 * Detects non-standard exit codes, max 3 consecutive retries
 */
import { EXIT_CODES, type ExitCode } from '../../types/index.js';

/**
 * Error recovery configuration
 */
export interface ErrorRecoveryConfig {
  maxConsecutiveFailures: number;
  retrySleepMs: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ErrorRecoveryConfig = {
  maxConsecutiveFailures: 3,
  retrySleepMs: 5000,
};

/**
 * Recovery state
 */
export interface RecoveryState {
  consecutiveFailures: number;
  lastExitCode: ExitCode | null;
  lastError: string | null;
  recoveryAttempts: number;
  shouldContinue: boolean;
  needsHumanIntervention: boolean;
}

/**
 * Recovery action
 */
export type RecoveryAction =
  | { type: 'retry'; sleepMs: number }
  | { type: 'rotate_manager' }
  | { type: 'crisis_mode'; reason: string }
  | { type: 'continue' }
  | { type: 'abort'; reason: string };

/**
 * Error recovery controller
 */
export class ErrorRecovery {
  private readonly config: ErrorRecoveryConfig;
  private state: RecoveryState;

  constructor(config: Partial<ErrorRecoveryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      consecutiveFailures: 0,
      lastExitCode: null,
      lastError: null,
      recoveryAttempts: 0,
      shouldContinue: true,
      needsHumanIntervention: false,
    };
  }

  /**
   * Process an exit code and determine recovery action
   */
  processExitCode(exitCode: number, error?: string): RecoveryAction {
    this.state.lastExitCode = exitCode as ExitCode;
    this.state.lastError = error ?? null;

    switch (exitCode) {
      case EXIT_CODES.SUCCESS:
        // Success - reset failures and continue
        this.state.consecutiveFailures = 0;
        return { type: 'continue' };

      case EXIT_CODES.ROTATION_NEEDED:
        // Manager needs rotation - this is expected
        this.state.consecutiveFailures = 0;
        return { type: 'rotate_manager' };

      case EXIT_CODES.TASK_FAILED:
        // Task failed - count as failure
        this.state.consecutiveFailures++;
        this.state.recoveryAttempts++;

        if (this.state.consecutiveFailures >= this.config.maxConsecutiveFailures) {
          this.state.needsHumanIntervention = true;
          return {
            type: 'crisis_mode',
            reason: `${this.config.maxConsecutiveFailures} consecutive task failures`,
          };
        }

        return {
          type: 'retry',
          sleepMs: this.config.retrySleepMs,
        };

      case EXIT_CODES.HUMAN_INTERVENTION:
        // Explicit crisis mode request
        this.state.needsHumanIntervention = true;
        return {
          type: 'crisis_mode',
          reason: error ?? 'Human intervention requested',
        };

      case EXIT_CODES.CRASH:
      default:
        // Unexpected crash
        this.state.consecutiveFailures++;
        this.state.recoveryAttempts++;

        if (this.state.consecutiveFailures >= this.config.maxConsecutiveFailures) {
          this.state.shouldContinue = false;
          return {
            type: 'abort',
            reason: `${this.config.maxConsecutiveFailures} consecutive crashes`,
          };
        }

        return {
          type: 'retry',
          sleepMs: this.config.retrySleepMs * 2, // Longer sleep after crash
        };
    }
  }

  /**
   * Get current state
   */
  getState(): RecoveryState {
    return { ...this.state };
  }

  /**
   * Reset state (after successful recovery)
   */
  reset(): void {
    this.state.consecutiveFailures = 0;
    this.state.lastExitCode = null;
    this.state.lastError = null;
    this.state.shouldContinue = true;
    this.state.needsHumanIntervention = false;
    // Keep recoveryAttempts for stats
  }

  /**
   * Check if should continue
   */
  shouldContinue(): boolean {
    return this.state.shouldContinue;
  }

  /**
   * Check if human intervention is needed
   */
  needsHumanIntervention(): boolean {
    return this.state.needsHumanIntervention;
  }

  /**
   * Get recovery stats
   */
  getStats(): {
    totalRecoveryAttempts: number;
    consecutiveFailures: number;
    lastExitCode: ExitCode | null;
  } {
    return {
      totalRecoveryAttempts: this.state.recoveryAttempts,
      consecutiveFailures: this.state.consecutiveFailures,
      lastExitCode: this.state.lastExitCode,
    };
  }
}

/**
 * Create an error recovery controller
 */
export function createErrorRecovery(
  config: Partial<ErrorRecoveryConfig> = {}
): ErrorRecovery {
  return new ErrorRecovery(config);
}

/**
 * Sleep helper for retry delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute with retry
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  config: {
    maxRetries?: number;
    retrySleepMs?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const { maxRetries = 3, retrySleepMs = 5000, onRetry } = config;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      onRetry?.(attempt, lastError);

      if (attempt < maxRetries) {
        await sleep(retrySleepMs);
      }
    }
  }

  throw lastError ?? new Error('Max retries exceeded');
}
