/**
 * Clean context initialization
 * Starts Worker with empty context, receives only PRD.md and current_task.md
 */
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

import type { AgentType } from '../../schemas/index.js';
import { createTelemetryManager } from '../../state/index.js';

/**
 * Worker boot configuration
 */
export interface WorkerBootConfig {
  basePath: string;
  projectId: string;
  taskId: string;
  prdPath: string;
  currentTaskPath: string;
  contextWindowSize?: number;
}

/**
 * Worker boot result
 */
export interface WorkerBootResult {
  sessionId: string;
  taskId: string;
  prdContent: string;
  taskContent: string;
  initialTokens: number;
}

/**
 * Estimate token count from text
 * Rough estimate: ~4 chars per token
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Boot a fresh Worker context
 */
export async function bootFreshContext(config: WorkerBootConfig): Promise<WorkerBootResult> {
  const {
    basePath,
    projectId,
    taskId,
    prdPath,
    currentTaskPath,
    contextWindowSize,
  } = config;

  // Initialize telemetry for Worker
  const telemetryManager = createTelemetryManager(basePath, contextWindowSize);
  await telemetryManager.resetForWorker(projectId);

  // Read minimal context files
  const [prdContent, taskContent] = await Promise.all([
    readFile(prdPath, 'utf-8').catch(() => '# PRD Not Found\n\nPlease create specs/PRD.md'),
    readFile(currentTaskPath, 'utf-8').catch(() => '# Task Not Found'),
  ]);

  // Calculate initial token usage
  const initialTokens = estimateTokens(prdContent) + estimateTokens(taskContent);

  // Update telemetry with initial tokens
  await telemetryManager.heartbeat(initialTokens, taskId);

  const sessionId = randomUUID();

  return {
    sessionId,
    taskId,
    prdContent,
    taskContent,
    initialTokens,
  };
}

/**
 * Worker context constraints
 */
export const WORKER_CONSTRAINTS = {
  MAX_CONTEXT_PERCENT: 40, // Stay in smart zone
  MAX_FILES: 5,
  MAX_LOC: 150,
  MAX_RETRIES: 5,
} as const;

/**
 * Validate Worker can proceed with task
 */
export function validateWorkerCapacity(
  currentTokens: number,
  contextWindowSize: number
): { canProceed: boolean; reason?: string } {
  const fillPercent = (currentTokens / contextWindowSize) * 100;

  if (fillPercent >= WORKER_CONSTRAINTS.MAX_CONTEXT_PERCENT) {
    return {
      canProceed: false,
      reason: `Context fill ${fillPercent.toFixed(1)}% exceeds Worker limit of ${WORKER_CONSTRAINTS.MAX_CONTEXT_PERCENT}%`,
    };
  }

  return { canProceed: true };
}

/**
 * Create minimal context injection for Worker
 */
export function createMinimalContext(
  prdContent: string,
  taskContent: string
): string {
  return `# Worker Context

## Current Task

${taskContent}

---

## PRD Reference

${prdContent}

---

## Instructions

1. Focus only on the current task
2. Do not explore unrelated code
3. Follow the Ralph Wiggum Loop: Edit -> Build -> Test -> Fix
4. Exit when tests pass
5. Write status fragment before exit
`;
}
