/**
 * Watcher orchestrator
 * Initializes all watchers and Socket.io server
 */
import { Server as HTTPServer } from 'node:http';

import {
  createTelemetryWatcher,
  type TelemetryWatcher,
  type TelemetryWatcherConfig,
} from './telemetry-watcher.js';
import {
  createRoadmapWatcher,
  type RoadmapWatcher,
  type RoadmapWatcherConfig,
} from './roadmap-watcher.js';
import {
  createSocketServer,
  type WatcherSocketServer,
  type SocketServerConfig,
} from './socket-server.js';

// Re-export sub-modules
export * from './telemetry-watcher.js';
export * from './roadmap-watcher.js';
export * from './socket-server.js';

/**
 * Watcher system configuration
 */
export interface WatcherSystemConfig {
  basePath: string;
  httpServer: HTTPServer;
  corsOrigin?: string | string[];
  telemetryDebounceMs?: number;
  roadmapIntervalMs?: number;
}

/**
 * Watcher system state
 */
export interface WatcherSystemState {
  isRunning: boolean;
  connectedClients: number;
  lastTelemetryUpdate: Date | null;
  lastRoadmapUpdate: Date | null;
}

/**
 * Watcher system
 * Orchestrates all file watchers and Socket.io
 */
export class WatcherSystem {
  private readonly config: WatcherSystemConfig;
  private readonly telemetryWatcher: TelemetryWatcher;
  private readonly roadmapWatcher: RoadmapWatcher;
  private readonly socketServer: WatcherSocketServer;
  private isRunning: boolean = false;
  private lastTelemetryUpdate: Date | null = null;
  private lastRoadmapUpdate: Date | null = null;

  constructor(config: WatcherSystemConfig) {
    this.config = config;

    // Create socket server
    this.socketServer = createSocketServer({
      httpServer: config.httpServer,
      corsOrigin: config.corsOrigin,
    });

    // Create watchers
    this.telemetryWatcher = createTelemetryWatcher({
      basePath: config.basePath,
      debounceMs: config.telemetryDebounceMs,
    });

    this.roadmapWatcher = createRoadmapWatcher({
      basePath: config.basePath,
      intervalMs: config.roadmapIntervalMs,
    });

    // Attach Socket.io to watchers
    const io = this.socketServer.getIO();
    this.telemetryWatcher.attachSocketIO(io);
    this.roadmapWatcher.attachSocketIO(io);

    // Set up internal event tracking
    io.on('connection', (socket) => {
      socket.on('telemetry:update', () => {
        this.lastTelemetryUpdate = new Date();
      });
      socket.on('roadmap:update', () => {
        this.lastRoadmapUpdate = new Date();
      });
    });
  }

  /**
   * Start all watchers
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.telemetryWatcher.start();
    this.roadmapWatcher.start();
    this.isRunning = true;
  }

  /**
   * Stop all watchers
   */
  async stop(): Promise<void> {
    this.telemetryWatcher.stop();
    this.roadmapWatcher.stop();
    await this.socketServer.close();
    this.isRunning = false;
  }

  /**
   * Get current state
   */
  getState(): WatcherSystemState {
    return {
      isRunning: this.isRunning,
      connectedClients: this.socketServer.getClientCount(),
      lastTelemetryUpdate: this.lastTelemetryUpdate,
      lastRoadmapUpdate: this.lastRoadmapUpdate,
    };
  }

  /**
   * Get Socket.io server
   */
  getSocketServer(): WatcherSocketServer {
    return this.socketServer;
  }

  /**
   * Get telemetry watcher
   */
  getTelemetryWatcher(): TelemetryWatcher {
    return this.telemetryWatcher;
  }

  /**
   * Get roadmap watcher
   */
  getRoadmapWatcher(): RoadmapWatcher {
    return this.roadmapWatcher;
  }

  /**
   * Broadcast crisis mode
   */
  triggerCrisisMode(reason: string): void {
    this.socketServer.broadcastCrisis({
      triggered: true,
      reason,
      action: 'pause',
    });
  }
}

/**
 * Create a watcher system instance
 */
export function createWatcherSystem(config: WatcherSystemConfig): WatcherSystem {
  return new WatcherSystem(config);
}
