#!/usr/bin/env node
/**
 * Manager Entry Point
 * Entry point for orchestrate.sh to spawn Manager processes
 *
 * Environment Variables:
 *   - PROJECT_PATH: Base path for project (default: cwd)
 *   - PROJECT_ID: Project identifier (optional)
 *   - HANDOFF_FILE: Path to handoff file from previous manager (optional)
 *
 * Exit Codes:
 *   - 0: All tasks completed successfully
 *   - 1: Task failed after retries
 *   - 10: Rotation needed (context full)
 *   - 20: Human intervention required (crisis mode)
 *   - 99: Unexpected crash
 */
import process from 'node:process';

import { spawnWorker } from './services/orchestrator/worker-spawner.js';
import {
  createShiftManager,
  type ShiftManagerResult,
  type TaskSelectionResult,
} from './services/shift-manager/index.js';
import { EXIT_CODES } from './types/index.js';

/**
 * Manager configuration from environment
 */
interface ManagerEnvConfig {
  projectPath: string;
  projectId: string | undefined;
  handoffFile: string | undefined;
}

/**
 * Load configuration from environment variables
 */
function loadConfigFromEnv(): ManagerEnvConfig {
  const projectPath = process.env['PROJECT_PATH'] ?? process.cwd();
  const projectId = process.env['PROJECT_ID'];
  const handoffFile = process.env['HANDOFF_FILE'];

  return {
    projectPath,
    projectId,
    handoffFile,
  };
}

/**
 * Handle task execution by spawning a Worker
 */
async function handleTaskExecution(
  projectPath: string,
  projectId: string | undefined,
  task: TaskSelectionResult
): Promise<boolean> {
  console.error(`[MANAGER] Spawning Worker for task: ${task.task.id}`);

  const result = await spawnWorker({
    basePath: projectPath,
    taskId: task.task.id,
    prdPath: task.prdPath,
    currentTaskPath: task.currentTaskPath,
    projectId,
    onOutput: (data) => {
      // Forward Worker output to stderr
      process.stderr.write(`[WORKER] ${data}`);
    },
  });

  if (result.success) {
    console.error(`[MANAGER] Task ${task.task.id} completed successfully`);
    return true;
  } else {
    console.error(`[MANAGER] Task ${task.task.id} failed with exit code ${result.exitCode}`);
    console.error(`[MANAGER] Reason: ${result.stderr.slice(-500)}`);
    return false;
  }
}

/**
 * Run the Manager process
 */
async function runManager(): Promise<ShiftManagerResult> {
  const config = loadConfigFromEnv();

  console.error('='.repeat(50));
  console.error('[MANAGER] Starting Manager process');
  console.error(`[MANAGER] Project path: ${config.projectPath}`);
  console.error(`[MANAGER] Project ID: ${config.projectId ?? 'auto-generated'}`);
  console.error(`[MANAGER] Handoff file: ${config.handoffFile ?? 'none'}`);
  console.error('='.repeat(50));

  const manager = createShiftManager({
    basePath: config.projectPath,
    projectId: config.projectId,
    rotationThreshold: 60,
  });

  // Run the Manager loop
  const result = await manager.run(
    // Task execution callback
    async (task: TaskSelectionResult): Promise<boolean> => {
      return handleTaskExecution(config.projectPath, config.projectId, task);
    },
    // Progress callback
    (state) => {
      console.error(
        `[MANAGER] Progress: ${state.tasksCompleted}/${state.tasksAssigned} tasks, ` +
          `context: ${state.contextStatus.fillPercent.toFixed(1)}% (${state.contextStatus.zone})`
      );
    }
  );

  return result;
}

/**
 * Graceful shutdown handler
 */
function setupShutdownHandlers(): void {
  const shutdown = (signal: string): void => {
    console.error(`[MANAGER] Received ${signal}, initiating graceful shutdown...`);
    // Allow current task to complete, then exit
    setTimeout(() => {
      console.error('[MANAGER] Shutdown timeout reached, forcing exit');
      process.exit(EXIT_CODES.CRASH);
    }, 10000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  setupShutdownHandlers();

  try {
    const result = await runManager();

    console.error('='.repeat(50));
    console.error(`[MANAGER] Session complete`);
    console.error(`[MANAGER] Exit code: ${result.exitCode}`);
    console.error(`[MANAGER] Reason: ${result.reason}`);
    console.error(`[MANAGER] Tasks completed: ${result.session.tasksCompleted.length}`);
    if (result.handoffPath !== null) {
      console.error(`[MANAGER] Handoff written to: ${result.handoffPath}`);
    }
    console.error('='.repeat(50));

    process.exit(result.exitCode);
  } catch (error) {
    console.error('[MANAGER] Fatal error:', error);
    process.exit(EXIT_CODES.CRASH);
  }
}

// Run if this is the main module
main().catch((error) => {
  console.error('[MANAGER] Unhandled error:', error);
  process.exit(EXIT_CODES.CRASH);
});
