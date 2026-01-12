/**
 * Socket.io server setup
 * Socket.io on Express, handles telemetry and crisis events
 */
import { Server as HTTPServer } from 'node:http';
import { Server as SocketServer, type Socket } from 'socket.io';

/**
 * Socket server configuration
 */
export interface SocketServerConfig {
  httpServer: HTTPServer;
  corsOrigin?: string | string[];
}

/**
 * Crisis event data
 */
export interface CrisisEventData {
  triggered: boolean;
  reason: string;
  action: 'kill' | 'reset' | 'pause';
}

/**
 * Socket server wrapper
 */
export class WatcherSocketServer {
  private readonly io: SocketServer;
  private connectedClients: Map<string, Socket> = new Map();

  constructor(config: SocketServerConfig) {
    this.io = new SocketServer(config.httpServer, {
      cors: {
        origin: config.corsOrigin ?? '*',
        methods: ['GET', 'POST'],
      },
    });

    this.setupEventHandlers();
  }

  /**
   * Set up Socket.io event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      this.connectedClients.set(socket.id, socket);

      // Handle client disconnect
      socket.on('disconnect', () => {
        this.connectedClients.delete(socket.id);
      });

      // Handle crisis mode trigger from dashboard
      socket.on('crisis:trigger', (data: CrisisEventData) => {
        this.handleCrisisEvent(data);
      });

      // Handle status request
      socket.on('status:request', () => {
        socket.emit('status:response', {
          connectedClients: this.connectedClients.size,
          serverTime: new Date().toISOString(),
        });
      });

      // Send welcome message
      socket.emit('connected', {
        clientId: socket.id,
        serverTime: new Date().toISOString(),
      });
    });
  }

  /**
   * Handle crisis event from dashboard
   */
  private handleCrisisEvent(data: CrisisEventData): void {
    // Broadcast to all clients
    this.io.emit('crisis:activated', data);

    // Log crisis event
    console.error(`[CRISIS] Action: ${data.action}, Reason: ${data.reason}`);
  }

  /**
   * Get Socket.io server instance
   */
  getIO(): SocketServer {
    return this.io;
  }

  /**
   * Get connected client count
   */
  getClientCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Broadcast telemetry update to all clients
   */
  broadcastTelemetry(telemetry: unknown): void {
    this.io.emit('telemetry:update', telemetry);
  }

  /**
   * Broadcast roadmap update to all clients
   */
  broadcastRoadmap(progress: unknown): void {
    this.io.emit('roadmap:update', progress);
  }

  /**
   * Broadcast guardrail status to all clients
   */
  broadcastGuardrail(status: unknown): void {
    this.io.emit('guardrail:update', status);
  }

  /**
   * Broadcast crisis mode to all clients
   */
  broadcastCrisis(data: CrisisEventData): void {
    this.io.emit('crisis:activated', data);
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId: string, event: string, data: unknown): void {
    const socket = this.connectedClients.get(clientId);
    if (socket !== undefined) {
      socket.emit(event, data);
    }
  }

  /**
   * Close all connections
   */
  close(): Promise<void> {
    return new Promise((resolve) => {
      this.io.close(() => {
        resolve();
      });
    });
  }
}

/**
 * Create a socket server instance
 */
export function createSocketServer(config: SocketServerConfig): WatcherSocketServer {
  return new WatcherSocketServer(config);
}
