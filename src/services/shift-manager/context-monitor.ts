/**
 * Context window monitoring
 * Calculates context_fill_percent, triggers rotation at 60%
 */
import type { ContextZone, Telemetry } from '../../schemas/index.js';
import { createTelemetryManager, type TelemetryManager } from '../../state/index.js';
import { ZONE_THRESHOLDS } from '../../types/index.js';

/**
 * Context monitor configuration
 */
export interface ContextMonitorConfig {
  basePath: string;
  contextWindowSize?: number;
  rotationThreshold?: number;
  pollingIntervalMs?: number;
}

/**
 * Context status snapshot
 */
export interface ContextStatus {
  fillPercent: number;
  zone: ContextZone;
  tokensUsed: number;
  tokensRemaining: number;
  needsRotation: boolean;
  lastHeartbeat: Date;
}

/**
 * Context monitor event
 */
export type ContextMonitorEvent =
  | { type: 'zone_change'; from: ContextZone; to: ContextZone; fillPercent: number }
  | { type: 'rotation_needed'; fillPercent: number }
  | { type: 'heartbeat'; fillPercent: number }
  | { type: 'error'; message: string };

/**
 * Context monitor event handler
 */
export type ContextMonitorEventHandler = (event: ContextMonitorEvent) => void;

/**
 * Context monitor for tracking Manager context usage
 */
export class ContextMonitor {
  private readonly telemetryManager: TelemetryManager;
  private readonly rotationThreshold: number;
  private readonly pollingIntervalMs: number;
  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private lastZone: ContextZone = 'smart';
  private eventHandlers: ContextMonitorEventHandler[] = [];

  constructor(config: ContextMonitorConfig) {
    this.telemetryManager = createTelemetryManager(
      config.basePath,
      config.contextWindowSize
    );
    this.rotationThreshold = config.rotationThreshold ?? 60;
    this.pollingIntervalMs = config.pollingIntervalMs ?? 5000;
  }

  /**
   * Add event handler
   */
  on(handler: ContextMonitorEventHandler): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Remove event handler
   */
  off(handler: ContextMonitorEventHandler): void {
    const index = this.eventHandlers.indexOf(handler);
    if (index !== -1) {
      this.eventHandlers.splice(index, 1);
    }
  }

  /**
   * Emit event to all handlers
   */
  private emit(event: ContextMonitorEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Ignore handler errors
      }
    }
  }

  /**
   * Get current context status
   */
  async getStatus(): Promise<ContextStatus> {
    const telemetry = await this.telemetryManager.read();

    return {
      fillPercent: telemetry.context_fill_percent,
      zone: telemetry.zone,
      tokensUsed: telemetry.tokens_used,
      tokensRemaining: telemetry.tokens_remaining,
      needsRotation: telemetry.context_fill_percent >= this.rotationThreshold,
      lastHeartbeat: new Date(telemetry.heartbeat_at),
    };
  }

  /**
   * Update context with new token count
   */
  async updateTokenCount(tokensUsed: number, currentTaskId?: string): Promise<ContextStatus> {
    const previousTelemetry = await this.telemetryManager.read();
    const previousZone = previousTelemetry.zone;

    // Update telemetry
    const updatedTelemetry = await this.telemetryManager.heartbeat(tokensUsed, currentTaskId);
    const currentZone = updatedTelemetry.zone;

    // Check for zone change
    if (previousZone !== currentZone) {
      this.emit({
        type: 'zone_change',
        from: previousZone,
        to: currentZone,
        fillPercent: updatedTelemetry.context_fill_percent,
      });
      this.lastZone = currentZone;
    }

    // Check for rotation
    if (updatedTelemetry.context_fill_percent >= this.rotationThreshold) {
      this.emit({
        type: 'rotation_needed',
        fillPercent: updatedTelemetry.context_fill_percent,
      });
    }

    // Emit heartbeat
    this.emit({
      type: 'heartbeat',
      fillPercent: updatedTelemetry.context_fill_percent,
    });

    return {
      fillPercent: updatedTelemetry.context_fill_percent,
      zone: updatedTelemetry.zone,
      tokensUsed: updatedTelemetry.tokens_used,
      tokensRemaining: updatedTelemetry.tokens_remaining,
      needsRotation: updatedTelemetry.context_fill_percent >= this.rotationThreshold,
      lastHeartbeat: new Date(updatedTelemetry.heartbeat_at),
    };
  }

  /**
   * Check if rotation is needed
   */
  async needsRotation(): Promise<boolean> {
    return this.telemetryManager.needsRotation(this.rotationThreshold);
  }

  /**
   * Start polling for context updates
   */
  startPolling(): void {
    if (this.pollingTimer !== null) {
      return;
    }

    this.pollingTimer = setInterval(async () => {
      try {
        const status = await this.getStatus();
        this.emit({
          type: 'heartbeat',
          fillPercent: status.fillPercent,
        });

        // Check zone change
        if (status.zone !== this.lastZone) {
          this.emit({
            type: 'zone_change',
            from: this.lastZone,
            to: status.zone,
            fillPercent: status.fillPercent,
          });
          this.lastZone = status.zone;
        }

        // Check rotation
        if (status.needsRotation) {
          this.emit({
            type: 'rotation_needed',
            fillPercent: status.fillPercent,
          });
        }
      } catch (error) {
        this.emit({
          type: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }, this.pollingIntervalMs);
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    if (this.pollingTimer !== null) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  /**
   * Get zone thresholds
   */
  getThresholds(): {
    smartMax: number;
    degradingMax: number;
    rotationAt: number;
  } {
    return {
      smartMax: ZONE_THRESHOLDS.SMART_MAX,
      degradingMax: ZONE_THRESHOLDS.DEGRADING_MAX,
      rotationAt: this.rotationThreshold,
    };
  }
}

/**
 * Create a context monitor instance
 */
export function createContextMonitor(config: ContextMonitorConfig): ContextMonitor {
  return new ContextMonitor(config);
}
