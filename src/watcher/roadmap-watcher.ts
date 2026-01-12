/**
 * Roadmap file watcher
 * fs.watchFile for IMPLEMENTATION_PLAN.md, calculates progress
 */
import { watchFile, unwatchFile, type StatWatcher } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { Server as SocketServer } from 'socket.io';

/**
 * Roadmap progress
 */
export interface RoadmapProgress {
  total: number;
  completed: number;
  remaining: number;
  percentComplete: number;
  lastUpdated: Date;
}

/**
 * Roadmap watcher configuration
 */
export interface RoadmapWatcherConfig {
  basePath: string;
  intervalMs?: number;
}

/**
 * Roadmap update event
 */
export interface RoadmapUpdateEvent {
  progress: RoadmapProgress;
  taskCompleted: boolean;
  previousCompleted: number;
}

/**
 * Roadmap watcher
 */
export class RoadmapWatcher {
  private readonly basePath: string;
  private readonly planPath: string;
  private readonly intervalMs: number;
  private lastProgress: RoadmapProgress | null = null;
  private io: SocketServer | null = null;
  private isWatching: boolean = false;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: RoadmapWatcherConfig) {
    this.basePath = config.basePath;
    this.planPath = join(config.basePath, 'IMPLEMENTATION_PLAN.md');
    this.intervalMs = config.intervalMs ?? 2000;
  }

  /**
   * Attach Socket.io server for event emission
   */
  attachSocketIO(io: SocketServer): void {
    this.io = io;
  }

  /**
   * Start watching for roadmap changes
   */
  start(): void {
    if (this.isWatching) {
      return;
    }

    this.isWatching = true;

    // Use polling since watchFile is more reliable for this use case
    this.pollInterval = setInterval(() => {
      void this.checkForUpdates();
    }, this.intervalMs);

    // Initial read
    void this.readAndEmit();
  }

  /**
   * Stop watching
   */
  stop(): void {
    this.isWatching = false;
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Check for updates
   */
  private async checkForUpdates(): Promise<void> {
    try {
      const fileStat = await stat(this.planPath);
      const lastModified = fileStat.mtime;

      if (
        this.lastProgress === null ||
        lastModified > this.lastProgress.lastUpdated
      ) {
        await this.readAndEmit();
      }
    } catch {
      // File doesn't exist yet
    }
  }

  /**
   * Parse progress from markdown content
   */
  private parseProgress(content: string): RoadmapProgress {
    const lines = content.split('\n');
    let total = 0;
    let completed = 0;

    // Match checkbox patterns
    const checkedRegex = /^(\s*)- \[x\] ST-\d{3}:/i;
    const uncheckedRegex = /^(\s*)- \[ \] ST-\d{3}:/i;

    for (const line of lines) {
      if (checkedRegex.test(line)) {
        total++;
        completed++;
      } else if (uncheckedRegex.test(line)) {
        total++;
      }
    }

    return {
      total,
      completed,
      remaining: total - completed,
      percentComplete: total > 0 ? Math.round((completed / total) * 100) : 0,
      lastUpdated: new Date(),
    };
  }

  /**
   * Read roadmap and emit event
   */
  private async readAndEmit(): Promise<void> {
    try {
      const content = await readFile(this.planPath, 'utf-8');
      const progress = this.parseProgress(content);

      const previousCompleted = this.lastProgress?.completed ?? 0;
      const taskCompleted = progress.completed > previousCompleted;

      const event: RoadmapUpdateEvent = {
        progress,
        taskCompleted,
        previousCompleted,
      };

      // Emit via Socket.io
      if (this.io !== null) {
        this.io.emit('roadmap:update', event);

        if (taskCompleted) {
          this.io.emit('roadmap:task-completed', {
            newCompleted: progress.completed,
            total: progress.total,
            percentComplete: progress.percentComplete,
          });
        }
      }

      this.lastProgress = progress;
    } catch {
      // File read failed
    }
  }

  /**
   * Get current progress
   */
  async getCurrentProgress(): Promise<RoadmapProgress | null> {
    try {
      const content = await readFile(this.planPath, 'utf-8');
      return this.parseProgress(content);
    } catch {
      return null;
    }
  }

  /**
   * Get last known progress
   */
  getLastProgress(): RoadmapProgress | null {
    return this.lastProgress;
  }
}

/**
 * Create a roadmap watcher instance
 */
export function createRoadmapWatcher(config: RoadmapWatcherConfig): RoadmapWatcher {
  return new RoadmapWatcher(config);
}
