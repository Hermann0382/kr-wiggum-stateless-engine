/**
 * Worker termination protocol
 * Kills process, clears memory, resets telemetry to 0%
 */
import { createTelemetryManager } from '../../state/index.js';
import { EXIT_CODES } from '../../types/index.js';

/**
 * Self-destruct options
 */
export interface SelfDestructOptions {
  basePath: string;
  projectId: string;
  exitCode: number;
  reason: string;
}

/**
 * Self-destruct result (returned before process exits)
 */
export interface SelfDestructResult {
  success: boolean;
  exitCode: number;
  reason: string;
  telemetryReset: boolean;
}

/**
 * Prepare for self-destruct
 * Resets telemetry and prepares for clean exit
 */
export async function prepareForSelfDestruct(
  options: SelfDestructOptions
): Promise<SelfDestructResult> {
  const { basePath, projectId, exitCode, reason } = options;

  let telemetryReset = false;

  try {
    // Reset telemetry for next Worker
    const telemetryManager = createTelemetryManager(basePath);
    await telemetryManager.resetForWorker(projectId);
    telemetryReset = true;
  } catch {
    // Telemetry reset failed, but continue with exit
  }

  return {
    success: true,
    exitCode,
    reason,
    telemetryReset,
  };
}

/**
 * Execute self-destruct (actually exits the process)
 */
export function executeSelfDestruct(exitCode: number): never {
  process.exit(exitCode);
}

/**
 * Self-destruct with success (task completed)
 */
export async function selfDestructSuccess(
  basePath: string,
  projectId: string
): Promise<never> {
  await prepareForSelfDestruct({
    basePath,
    projectId,
    exitCode: EXIT_CODES.SUCCESS,
    reason: 'Task completed successfully',
  });

  executeSelfDestruct(EXIT_CODES.SUCCESS);
}

/**
 * Self-destruct with failure (task failed after max retries)
 */
export async function selfDestructFailure(
  basePath: string,
  projectId: string,
  reason: string
): Promise<never> {
  await prepareForSelfDestruct({
    basePath,
    projectId,
    exitCode: EXIT_CODES.TASK_FAILED,
    reason,
  });

  executeSelfDestruct(EXIT_CODES.TASK_FAILED);
}

/**
 * Self-destruct requesting human intervention
 */
export async function selfDestructCrisis(
  basePath: string,
  projectId: string,
  reason: string
): Promise<never> {
  await prepareForSelfDestruct({
    basePath,
    projectId,
    exitCode: EXIT_CODES.HUMAN_INTERVENTION,
    reason,
  });

  executeSelfDestruct(EXIT_CODES.HUMAN_INTERVENTION);
}

/**
 * Check if Worker should self-destruct due to context fill
 */
export async function shouldSelfDestructContextFull(
  basePath: string,
  threshold: number = 40
): Promise<boolean> {
  try {
    const telemetryManager = createTelemetryManager(basePath);
    return telemetryManager.shouldSelfDestruct(threshold);
  } catch {
    return false;
  }
}

/**
 * Get exit code description
 */
export function getExitCodeDescription(exitCode: number): string {
  switch (exitCode) {
    case EXIT_CODES.SUCCESS:
      return 'Task completed successfully';
    case EXIT_CODES.TASK_FAILED:
      return 'Task failed after max retries';
    case EXIT_CODES.ROTATION_NEEDED:
      return 'Manager rotation needed (context full)';
    case EXIT_CODES.HUMAN_INTERVENTION:
      return 'Human intervention required (crisis mode)';
    case EXIT_CODES.CRASH:
      return 'Unexpected crash';
    default:
      return `Unknown exit code: ${exitCode}`;
  }
}

/**
 * Determine appropriate exit code from Worker result
 */
export function determineExitCode(result: {
  success: boolean;
  testsPassed: boolean;
  compilerPassed: boolean;
  retryCount: number;
  maxRetries: number;
}): number {
  if (result.success && result.testsPassed && result.compilerPassed) {
    return EXIT_CODES.SUCCESS;
  }

  if (result.retryCount >= result.maxRetries) {
    return EXIT_CODES.TASK_FAILED;
  }

  // Still within retry limit, but failed
  return EXIT_CODES.TASK_FAILED;
}
