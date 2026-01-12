/**
 * Agent-related TypeScript types
 * For Manager and Worker lifecycle management
 */
import type { AgentType, Task, ShiftHandoff, Telemetry } from '../schemas/index.js';

/**
 * Exit codes for agent processes
 */
export const EXIT_CODES = {
  SUCCESS: 0,           // Task completed successfully
  TASK_FAILED: 1,       // Task failed after max retries
  ROTATION_NEEDED: 10,  // Manager needs rotation (context full)
  HUMAN_INTERVENTION: 20, // Crisis mode - needs human
  CRASH: 99,            // Unexpected crash
} as const;

export type ExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES];

/**
 * Manager session state
 */
export interface ManagerSession {
  sessionId: string;
  projectId: string;
  startedAt: Date;
  contextFillAtStart: number;
  currentContextFill: number;
  tasksAssigned: string[];
  tasksCompleted: string[];
  adrsCreated: string[];
  handoffFile: string | null;
}

/**
 * Worker session state
 */
export interface WorkerSession {
  sessionId: string;
  projectId: string;
  taskId: string;
  startedAt: Date;
  retryCount: number;
  maxRetries: number;
  prdPath: string;
  currentTaskPath: string;
}

/**
 * Agent spawn configuration
 */
export interface AgentSpawnConfig {
  agentType: AgentType;
  projectPath: string;
  handoffFile?: string;
  taskFile?: string;
  prdFile?: string;
  environmentVars: Record<string, string>;
}

/**
 * Worker task assignment
 */
export interface WorkerTaskAssignment {
  task: Task;
  prdPath: string;
  currentTaskPath: string;
  contextInjection: string[];
}

/**
 * Manager rotation trigger
 */
export interface RotationTrigger {
  reason: 'context_full' | 'shift_complete' | 'error';
  contextFillPercent: number;
  handoff: ShiftHandoff;
}

/**
 * Ralph Wiggum Loop state
 */
export interface RalphWiggumLoopState {
  iteration: number;
  maxIterations: number;
  lastError: string | null;
  testsPass: boolean;
  compilerPass: boolean;
  filesModified: string[];
}

/**
 * Process spawn result
 */
export interface ProcessSpawnResult {
  pid: number;
  exitCode: ExitCode | null;
  stdout: string;
  stderr: string;
  duration: number;
}
