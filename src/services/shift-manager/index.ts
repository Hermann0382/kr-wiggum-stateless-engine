/**
 * Shift Manager main service
 * Full Manager lifecycle with exit code 10 for rotation, 0 for completion
 */
import { randomUUID } from 'node:crypto';

import type { GuardrailStatus } from '../../schemas/index.js';
import {
  createProjectStateManager,
  createTelemetryManager,
  createImplementationPlanManager,
} from '../../state/index.js';
import { EXIT_CODES, type ManagerSession } from '../../types/index.js';

import { createADRLogger, type ADRLogger } from './adr-logger.js';
import { createContextMonitor, type ContextMonitor, type ContextStatus } from './context-monitor.js';
import { createShiftHandoffWriter, type ShiftHandoffWriter } from './shift-handoff-writer.js';
import { createTaskSelector, type TaskSelector, type TaskSelectionResult } from './task-selector.js';

// Re-export sub-modules
export * from './context-monitor.js';
export * from './task-selector.js';
export * from './shift-handoff-writer.js';
export * from './adr-logger.js';

/**
 * Shift Manager configuration
 */
export interface ShiftManagerConfig {
  basePath: string;
  projectId?: string;
  rotationThreshold?: number;
  contextWindowSize?: number;
}

/**
 * Shift Manager state
 */
export interface ShiftManagerState {
  session: ManagerSession;
  contextStatus: ContextStatus;
  tasksAssigned: number;
  tasksCompleted: number;
  adrsCreated: string[];
}

/**
 * Shift Manager result
 */
export interface ShiftManagerResult {
  exitCode: number;
  session: ManagerSession;
  handoffPath: string | null;
  reason: string;
}

/**
 * Shift Manager service
 * Orchestrates the Manager lifecycle
 */
export class ShiftManager {
  private readonly basePath: string;
  private readonly projectId: string;
  private readonly contextMonitor: ContextMonitor;
  private readonly taskSelector: TaskSelector;
  private readonly handoffWriter: ShiftHandoffWriter;
  private readonly adrLogger: ADRLogger;
  private session: ManagerSession | null = null;
  private accomplishments: string[] = [];
  private architectureDelta: string = '';

  constructor(config: ShiftManagerConfig) {
    this.basePath = config.basePath;
    this.projectId = config.projectId ?? randomUUID();

    this.contextMonitor = createContextMonitor({
      basePath: config.basePath,
      rotationThreshold: config.rotationThreshold ?? 60,
      contextWindowSize: config.contextWindowSize,
    });

    this.taskSelector = createTaskSelector({
      basePath: config.basePath,
    });

    this.handoffWriter = createShiftHandoffWriter(config.basePath);
    this.adrLogger = createADRLogger(config.basePath);
  }

  /**
   * Start a new Manager session
   */
  async startSession(): Promise<ManagerSession> {
    const sessionId = randomUUID();
    const now = new Date();

    // Initialize telemetry
    const telemetryManager = createTelemetryManager(this.basePath);
    await telemetryManager.startSession({
      projectId: this.projectId,
      agentType: 'manager',
    });

    // Get initial context status
    const contextStatus = await this.contextMonitor.getStatus();

    this.session = {
      sessionId,
      projectId: this.projectId,
      startedAt: now,
      contextFillAtStart: contextStatus.fillPercent,
      currentContextFill: contextStatus.fillPercent,
      tasksAssigned: [],
      tasksCompleted: [],
      adrsCreated: [],
      handoffFile: null,
    };

    // Check for existing handoff
    const existingHandoff = await this.handoffWriter.read();
    if (existingHandoff !== null) {
      await this.handoffWriter.markPickedUp(sessionId);
      this.accomplishments.push('Picked up handoff from previous Manager');
    }

    return this.session;
  }

  /**
   * Select next task for Worker
   */
  async selectNextTask(): Promise<TaskSelectionResult | null> {
    const result = await this.taskSelector.selectNextTask();

    if (result !== null && this.session !== null) {
      this.session.tasksAssigned.push(result.task.id);
    }

    return result;
  }

  /**
   * Mark task as completed by Worker
   */
  async markTaskCompleted(taskId: string): Promise<void> {
    const planManager = createImplementationPlanManager(this.basePath);
    await planManager.markTaskComplete(taskId);

    if (this.session !== null) {
      this.session.tasksCompleted.push(taskId);
    }

    this.accomplishments.push(`Completed task ${taskId}`);

    // Process any pending status fragments into ADRs
    const adrCreated = await this.adrLogger.processPendingFragment();
    if (adrCreated) {
      const recentADRs = await this.adrLogger.getRecentADRs(1);
      if (recentADRs.length > 0 && this.session !== null) {
        this.session.adrsCreated.push(recentADRs[0] ?? '');
      }
    }
  }

  /**
   * Update context with current token usage
   */
  async updateContext(tokensUsed: number, currentTaskId?: string): Promise<ContextStatus> {
    const status = await this.contextMonitor.updateTokenCount(tokensUsed, currentTaskId);

    if (this.session !== null) {
      this.session.currentContextFill = status.fillPercent;
    }

    return status;
  }

  /**
   * Check if rotation is needed
   */
  async needsRotation(): Promise<boolean> {
    return this.contextMonitor.needsRotation();
  }

  /**
   * Log architecture delta
   */
  addArchitectureDelta(delta: string): void {
    this.architectureDelta += (this.architectureDelta.length > 0 ? '\n' : '') + delta;
  }

  /**
   * Log an accomplishment
   */
  addAccomplishment(accomplishment: string): void {
    this.accomplishments.push(accomplishment);
  }

  /**
   * Perform rotation - write handoff and prepare to exit
   */
  async performRotation(): Promise<ShiftManagerResult> {
    if (this.session === null) {
      throw new Error('No active session');
    }

    const contextStatus = await this.contextMonitor.getStatus();

    // Write handoff document
    const { filePath } = await this.handoffWriter.write({
      projectId: this.projectId,
      sessionId: this.session.sessionId,
      accomplishments: this.accomplishments,
      architectureDelta: this.architectureDelta || 'No architectural changes this shift.',
      contextFillAtHandoff: contextStatus.fillPercent,
    });

    this.session.handoffFile = filePath;

    return {
      exitCode: EXIT_CODES.ROTATION_NEEDED,
      session: this.session,
      handoffPath: filePath,
      reason: `Context fill reached ${contextStatus.fillPercent}%, rotation needed`,
    };
  }

  /**
   * Complete the shift - all tasks done
   */
  async completeShift(): Promise<ShiftManagerResult> {
    if (this.session === null) {
      throw new Error('No active session');
    }

    // Check if all tasks are complete
    const planManager = createImplementationPlanManager(this.basePath);
    const progress = await planManager.getProgress();

    if (progress.remaining > 0) {
      // Still tasks remaining - rotate instead
      return this.performRotation();
    }

    // All done!
    return {
      exitCode: EXIT_CODES.SUCCESS,
      session: this.session,
      handoffPath: null,
      reason: 'All tasks completed successfully',
    };
  }

  /**
   * Get current state
   */
  async getState(): Promise<ShiftManagerState | null> {
    if (this.session === null) {
      return null;
    }

    const contextStatus = await this.contextMonitor.getStatus();

    return {
      session: this.session,
      contextStatus,
      tasksAssigned: this.session.tasksAssigned.length,
      tasksCompleted: this.session.tasksCompleted.length,
      adrsCreated: this.session.adrsCreated,
    };
  }

  /**
   * Run the Manager loop
   */
  async run(
    onTaskSelected: (task: TaskSelectionResult) => Promise<boolean>,
    onProgress?: (state: ShiftManagerState) => void
  ): Promise<ShiftManagerResult> {
    await this.startSession();

     
    while (true) {
      // Check for rotation
      if (await this.needsRotation()) {
        return this.performRotation();
      }

      // Select next task
      const task = await this.selectNextTask();

      if (task === null) {
        // No more tasks
        return this.completeShift();
      }

      // Execute task (Worker will be spawned externally)
      const success = await onTaskSelected(task);

      if (success) {
        await this.markTaskCompleted(task.task.id);
      }

      // Report progress
      if (onProgress !== undefined) {
        const state = await this.getState();
        if (state !== null) {
          onProgress(state);
        }
      }
    }
  }
}

/**
 * Create a Shift Manager instance
 */
export function createShiftManager(config: ShiftManagerConfig): ShiftManager {
  return new ShiftManager(config);
}
