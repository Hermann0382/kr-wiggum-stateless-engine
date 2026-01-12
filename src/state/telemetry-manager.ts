/**
 * Manager for .ralph/telemetry.json
 * Context fill calculation, zone detection (smart/degrading/dumb), atomic JSON updates
 */
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import {
  TelemetrySchema,
  type Telemetry,
  type AgentType,
  type ContextZone,
  type GuardrailStatus,
} from '../schemas/index.js';
import { FileStateManager, type FileStateOptions } from './file-state-manager.js';
import { ZONE_THRESHOLDS } from '../types/index.js';

const TELEMETRY_FILE = 'telemetry.json';
const RALPH_DIR = '.ralph';

/**
 * Default context window size (200K tokens)
 */
const DEFAULT_CONTEXT_WINDOW = 200000;

/**
 * Telemetry state manager for .ralph/telemetry.json
 */
export class TelemetryManager extends FileStateManager<Telemetry> {
  private readonly contextWindowSize: number;

  constructor(options: FileStateOptions & { contextWindowSize?: number }) {
    super(options);
    this.contextWindowSize = options.contextWindowSize ?? DEFAULT_CONTEXT_WINDOW;
  }

  protected getSchema(): z.ZodSchema<Telemetry> {
    return TelemetrySchema;
  }

  protected getFilePath(): string {
    return join(this.basePath, RALPH_DIR, TELEMETRY_FILE);
  }

  protected getDefaultState(): Telemetry {
    const now = new Date().toISOString();
    return {
      id: randomUUID(),
      project_id: randomUUID(),
      session_id: randomUUID(),
      agent_type: 'manager',
      context_fill_percent: 0,
      zone: 'smart',
      guardrail_status: 'all_passing',
      tokens_used: 0,
      tokens_remaining: this.contextWindowSize,
      heartbeat_at: now,
      created_at: now,
      updated_at: now,
    };
  }

  /**
   * Calculate context zone from fill percentage
   */
  calculateZone(fillPercent: number): ContextZone {
    if (fillPercent < ZONE_THRESHOLDS.SMART_MAX) {
      return 'smart';
    }
    if (fillPercent < ZONE_THRESHOLDS.DEGRADING_MAX) {
      return 'degrading';
    }
    return 'dumb';
  }

  /**
   * Calculate fill percentage from tokens used
   */
  calculateFillPercent(tokensUsed: number): number {
    return Math.round((tokensUsed / this.contextWindowSize) * 100);
  }

  /**
   * Start a new session
   */
  async startSession(input: {
    projectId: string;
    agentType: AgentType;
  }): Promise<Telemetry> {
    const now = new Date().toISOString();
    const telemetry: Telemetry = {
      id: randomUUID(),
      project_id: input.projectId,
      session_id: randomUUID(),
      agent_type: input.agentType,
      context_fill_percent: 0,
      zone: 'smart',
      guardrail_status: 'all_passing',
      tokens_used: 0,
      tokens_remaining: this.contextWindowSize,
      heartbeat_at: now,
      created_at: now,
      updated_at: now,
    };

    await this.write(telemetry);
    return telemetry;
  }

  /**
   * Update heartbeat with token count
   */
  async heartbeat(tokensUsed: number, currentTaskId?: string): Promise<Telemetry> {
    const fillPercent = this.calculateFillPercent(tokensUsed);
    const zone = this.calculateZone(fillPercent);
    const now = new Date().toISOString();

    return this.update({
      tokens_used: tokensUsed,
      tokens_remaining: this.contextWindowSize - tokensUsed,
      context_fill_percent: fillPercent,
      zone,
      current_task_id: currentTaskId,
      heartbeat_at: now,
      updated_at: now,
    });
  }

  /**
   * Update guardrail status
   */
  async updateGuardrailStatus(status: GuardrailStatus): Promise<Telemetry> {
    return this.update({
      guardrail_status: status,
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Set current task
   */
  async setCurrentTask(taskId: string | undefined): Promise<Telemetry> {
    return this.update({
      current_task_id: taskId,
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Check if rotation is needed for Manager
   */
  async needsRotation(threshold: number = 60): Promise<boolean> {
    const current = await this.read();
    return current.agent_type === 'manager' && current.context_fill_percent >= threshold;
  }

  /**
   * Check if Worker should self-destruct (context too full)
   */
  async shouldSelfDestruct(threshold: number = 40): Promise<boolean> {
    const current = await this.read();
    return current.agent_type === 'worker' && current.context_fill_percent >= threshold;
  }

  /**
   * Reset telemetry for new Worker
   */
  async resetForWorker(projectId: string): Promise<Telemetry> {
    const now = new Date().toISOString();
    return this.write({
      id: randomUUID(),
      project_id: projectId,
      session_id: randomUUID(),
      agent_type: 'worker',
      context_fill_percent: 0,
      zone: 'smart',
      guardrail_status: 'all_passing',
      tokens_used: 0,
      tokens_remaining: this.contextWindowSize,
      heartbeat_at: now,
      created_at: now,
      updated_at: now,
    }).then(() => this.read());
  }

  /**
   * Get context window configuration
   */
  getContextConfig(): {
    totalTokens: number;
    smartZoneMax: number;
    degradingZoneMax: number;
  } {
    return {
      totalTokens: this.contextWindowSize,
      smartZoneMax: ZONE_THRESHOLDS.SMART_MAX,
      degradingZoneMax: ZONE_THRESHOLDS.DEGRADING_MAX,
    };
  }
}

/**
 * Create a telemetry manager instance
 */
export function createTelemetryManager(
  basePath: string,
  contextWindowSize?: number
): TelemetryManager {
  return new TelemetryManager({
    basePath,
    createIfMissing: true,
    contextWindowSize,
  });
}
