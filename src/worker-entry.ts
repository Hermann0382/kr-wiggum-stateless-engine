#!/usr/bin/env node
/**
 * Worker Entry Point
 * Entry point for manager-entry.ts to spawn Worker processes
 *
 * Environment Variables:
 *   - PROJECT_PATH: Base path for project (default: cwd)
 *   - PROJECT_ID: Project identifier (required)
 *   - TASK_ID: Task to execute (required)
 *   - PRD_PATH: Path to PRD file (required)
 *   - CURRENT_TASK_PATH: Path to current task file (required)
 *
 * Exit Codes:
 *   - 0: Task completed successfully
 *   - 1: Task failed after retries
 *   - 99: Unexpected crash
 */
import process from 'node:process';

import {
  createWorker,
  type WorkerResult,
} from './services/worker/index.js';
import { EXIT_CODES } from './types/index.js';

/**
 * Worker configuration from environment
 */
interface WorkerEnvConfig {
  projectPath: string;
  projectId: string;
  taskId: string;
  prdPath: string;
  currentTaskPath: string;
}

/**
 * Validate and load configuration from environment variables
 */
function loadConfigFromEnv(): WorkerEnvConfig {
  const projectPath = process.env['PROJECT_PATH'] ?? process.cwd();
  const projectId = process.env['PROJECT_ID'];
  const taskId = process.env['TASK_ID'];
  const prdPath = process.env['PRD_PATH'];
  const currentTaskPath = process.env['CURRENT_TASK_PATH'];

  // Validate required environment variables
  const missing: string[] = [];
  if (projectId === undefined || projectId === '') {
    missing.push('PROJECT_ID');
  }
  if (taskId === undefined || taskId === '') {
    missing.push('TASK_ID');
  }
  if (prdPath === undefined || prdPath === '') {
    missing.push('PRD_PATH');
  }
  if (currentTaskPath === undefined || currentTaskPath === '') {
    missing.push('CURRENT_TASK_PATH');
  }

  if (missing.length > 0) {
    console.error(`[WORKER] Missing required environment variables: ${missing.join(', ')}`);
    process.exit(EXIT_CODES.CRASH);
  }

  return {
    projectPath,
    projectId: projectId!,
    taskId: taskId!,
    prdPath: prdPath!,
    currentTaskPath: currentTaskPath!,
  };
}

/**
 * Run the Worker process
 */
async function runWorker(): Promise<WorkerResult> {
  const config = loadConfigFromEnv();

  console.error('='.repeat(50));
  console.error('[WORKER] Starting Worker process');
  console.error(`[WORKER] Project path: ${config.projectPath}`);
  console.error(`[WORKER] Project ID: ${config.projectId}`);
  console.error(`[WORKER] Task ID: ${config.taskId}`);
  console.error(`[WORKER] PRD path: ${config.prdPath}`);
  console.error(`[WORKER] Task path: ${config.currentTaskPath}`);
  console.error('='.repeat(50));

  const worker = createWorker({
    basePath: config.projectPath,
    projectId: config.projectId,
    taskId: config.taskId,
    prdPath: config.prdPath,
    currentTaskPath: config.currentTaskPath,
    maxRetries: 5,
  });

  // Run the Worker lifecycle
  const result = await worker.run();

  return result;
}

/**
 * Graceful shutdown handler
 */
function setupShutdownHandlers(): void {
  const shutdown = (signal: string): void => {
    console.error(`[WORKER] Received ${signal}, initiating graceful shutdown...`);
    // Workers should complete quickly, give 30s before force exit
    setTimeout(() => {
      console.error('[WORKER] Shutdown timeout reached, forcing exit');
      process.exit(EXIT_CODES.CRASH);
    }, 30000);
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
    const result = await runWorker();

    console.error('='.repeat(50));
    console.error(`[WORKER] Task complete`);
    console.error(`[WORKER] Success: ${result.success}`);
    console.error(`[WORKER] Exit code: ${result.exitCode}`);
    console.error(`[WORKER] Reason: ${result.reason}`);
    console.error(`[WORKER] Iterations: ${result.loopResult.iterations}`);
    if (result.statusFragmentPath !== null) {
      console.error(`[WORKER] Status fragment: ${result.statusFragmentPath}`);
    }
    console.error('='.repeat(50));

    process.exit(result.exitCode);
  } catch (error) {
    console.error('[WORKER] Fatal error:', error);
    process.exit(EXIT_CODES.CRASH);
  }
}

// Run if this is the main module
main().catch((error) => {
  console.error('[WORKER] Unhandled error:', error);
  process.exit(EXIT_CODES.CRASH);
});
