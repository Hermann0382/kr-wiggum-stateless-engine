/**
 * /...loop command implementation
 * Starts orchestrate.sh in background, activates Manager
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';

/**
 * Loop command options
 */
export interface LoopOptions {
  basePath?: string;
  background?: boolean;
  maxRotations?: number;
  maxFailures?: number;
}

/**
 * Loop command result
 */
export interface LoopResult {
  success: boolean;
  pid?: number;
  message: string;
}

/**
 * Active loop process
 */
let activeLoopProcess: ChildProcess | null = null;

/**
 * Execute loop command
 * Starts the orchestrator in background
 */
export async function loop(options: LoopOptions = {}): Promise<LoopResult> {
  const {
    basePath = process.cwd(),
    background = true,
    maxRotations = 10,
    maxFailures = 3,
  } = options;

  // Check if already running
  if (activeLoopProcess !== null && !activeLoopProcess.killed) {
    return {
      success: false,
      message: 'Loop already running. Use /...status to check progress or stop first.',
    };
  }

  try {
    const scriptPath = join(basePath, 'scripts', 'orchestrate.sh');

    // Spawn the orchestrator
    const env = {
      ...process.env,
      PROJECT_PATH: basePath,
      MAX_MANAGER_ROTATIONS: String(maxRotations),
      MAX_CONSECUTIVE_FAILURES: String(maxFailures),
    };

    if (background) {
      activeLoopProcess = spawn('bash', [scriptPath], {
        cwd: basePath,
        env,
        detached: true,
        stdio: 'ignore',
      });

      activeLoopProcess.unref();

      return {
        success: true,
        pid: activeLoopProcess.pid,
        message: `Loop started in background (PID: ${activeLoopProcess.pid}).\nUse /...status to monitor progress.`,
      };
    } else {
      // Run in foreground (blocking)
      return new Promise((resolve) => {
        activeLoopProcess = spawn('bash', [scriptPath], {
          cwd: basePath,
          env,
          stdio: 'inherit',
        });

        activeLoopProcess.on('exit', (code) => {
          activeLoopProcess = null;
          resolve({
            success: code === 0,
            message: code === 0
              ? 'Loop completed successfully'
              : `Loop exited with code ${code}`,
          });
        });

        activeLoopProcess.on('error', (error) => {
          activeLoopProcess = null;
          resolve({
            success: false,
            message: `Loop error: ${error.message}`,
          });
        });
      });
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to start loop: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Stop the running loop
 */
export function stopLoop(): LoopResult {
  if (activeLoopProcess === null || activeLoopProcess.killed) {
    return {
      success: false,
      message: 'No loop is currently running',
    };
  }

  try {
    activeLoopProcess.kill('SIGTERM');
    activeLoopProcess = null;

    return {
      success: true,
      message: 'Loop stopped',
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to stop loop: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Check if loop is running
 */
export function isLoopRunning(): boolean {
  return activeLoopProcess !== null && !activeLoopProcess.killed;
}

/**
 * Get loop PID
 */
export function getLoopPid(): number | null {
  if (activeLoopProcess !== null && !activeLoopProcess.killed) {
    return activeLoopProcess.pid ?? null;
  }
  return null;
}

/**
 * Format loop result for display
 */
export function formatLoopResult(result: LoopResult): string {
  if (!result.success) {
    return `Loop: ${result.message}`;
  }

  let output = result.message;

  if (result.pid !== undefined) {
    output += `\n\nProcess ID: ${result.pid}`;
    output += '\n\nCommands:';
    output += '\n  /...status - Check current status';
    output += '\n  /...stop   - Stop the loop (if needed)';
  }

  return output;
}
