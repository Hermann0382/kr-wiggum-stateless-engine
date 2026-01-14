/**
 * Prompt generators for Claude Code CLI agents
 *
 * This module exports functions to generate prompts for:
 * - Worker agents (task execution via Ralph Wiggum Loop)
 * - Manager agents (task orchestration and rotation)
 */

export {
  generateWorkerPrompt,
  generateMinimalWorkerPrompt,
  type WorkerPromptConfig,
} from './worker-prompt.js';

export {
  generateManagerPrompt,
  generateMinimalManagerPrompt,
  type ManagerPromptConfig,
} from './manager-prompt.js';
