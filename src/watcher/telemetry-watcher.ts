/**
 * Telemetry file watcher
 * fs.watch for telemetry.json, emits Socket.io events
 */
import { watch, type FSWatcher } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Server as SocketServer } from 'socket.io';

import type { Telemetry, ContextZone } from '../schemas/index.js';

/**
 * Telemetry watcher configuration
 */
export interface TelemetryWatcherConfig {
  basePath: string;
  debounceMs?: number;
}

/**
 * Telemetry update event
 */
export interface TelemetryUpdateEvent {
  telemetry: Telemetry;
  previousZone: ContextZone | null;
  zoneChanged: boolean;
}

/**
 * Telemetry watcher
 */
export class TelemetryWatcher {
  private readonly basePath: string;
  private readonly telemetryPath: string;
  private readonly debounceMs: number;
  private watcher: FSWatcher | null = null;
  private lastTelemetry: Telemetry | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private io: SocketServer | null = null;

  constructor(config: TelemetryWatcherConfig) {
    this.basePath = config.basePath;
    this.telemetryPath = join(config.basePath, '.ralph', 'telemetry.json');
    this.debounceMs = config.debounceMs ?? 100;
  }

  /**
   * Attach Socket.io server for event emission
   */
  attachSocketIO(io: SocketServer): void {
    this.io = io;
  }

  /**
   * Start watching for telemetry changes
   */
  start(): void {
    if (this.watcher !== null) {
      return;
    }

    try {
      this.watcher = watch(this.telemetryPath, { persistent: true }, (eventType) => {
        if (eventType === 'change') {
          this.handleChange();
        }
      });

      // Initial read
      void this.readAndEmit();
    } catch {
      // File might not exist yet, that's okay
    }
  }

  /**
   * Stop watching
   */
  stop(): void {
    if (this.watcher !== null) {
      this.watcher.close();
      this.watcher = null;
    }
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Handle file change with debouncing
   */
  private handleChange(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      void this.readAndEmit();
    }, this.debounceMs);
  }

  /**
   * Read telemetry and emit event
   */
  private async readAndEmit(): Promise<void> {
    try {
      const content = await readFile(this.telemetryPath, 'utf-8');
      const telemetry = JSON.parse(content) as Telemetry;

      const previousZone = this.lastTelemetry?.zone ?? null;
      const zoneChanged = previousZone !== null && previousZone !== telemetry.zone;

      const event: TelemetryUpdateEvent = {
        telemetry,
        previousZone,
        zoneChanged,
      };

      // Emit via Socket.io
      if (this.io !== null) {
        this.io.emit('telemetry:update', event);

        if (zoneChanged) {
          this.io.emit('telemetry:zone-change', {
            from: previousZone,
            to: telemetry.zone,
            fillPercent: telemetry.context_fill_percent,
          });
        }
      }

      this.lastTelemetry = telemetry;
    } catch {
      // File read failed, will try again on next change
    }
  }

  /**
   * Get current telemetry
   */
  async getCurrentTelemetry(): Promise<Telemetry | null> {
    try {
      const content = await readFile(this.telemetryPath, 'utf-8');
      return JSON.parse(content) as Telemetry;
    } catch {
      return null;
    }
  }

  /**
   * Get last known telemetry
   */
  getLastTelemetry(): Telemetry | null {
    return this.lastTelemetry;
  }
}

/**
 * Create a telemetry watcher instance
 */
export function createTelemetryWatcher(config: TelemetryWatcherConfig): TelemetryWatcher {
  return new TelemetryWatcher(config);
}
