/**
 * Express server entry point
 * Starts HTTP server on port 3000, serves dashboard
 */
import { createServer } from 'node:http';

import { createApp } from './app.js';
import { createWatcherSystem } from './watcher/index.js';

/**
 * Server configuration
 */
interface ServerConfig {
  port: number;
  basePath: string;
}

/**
 * Get configuration from environment
 */
function getConfig(): ServerConfig {
  return {
    port: parseInt(process.env['PORT'] ?? '3000', 10),
    basePath: process.env['PROJECT_PATH'] ?? process.cwd(),
  };
}

/**
 * Start the server
 */
async function main(): Promise<void> {
  const config = getConfig();

  // Create Express app
  const app = createApp({ basePath: config.basePath });

  // Create HTTP server
  const httpServer = createServer(app);

  // Create watcher system with Socket.io
  const watcherSystem = createWatcherSystem({
    basePath: config.basePath,
    httpServer,
    corsOrigin: '*',
  });

  // Start watchers
  watcherSystem.start();

  // Start HTTP server
  httpServer.listen(config.port, () => {
    console.log('');
    console.log('===========================================');
    console.log('  KR-Wiggum Stateless Engine Dashboard');
    console.log('===========================================');
    console.log('');
    console.log(`  Server running at: http://localhost:${config.port}`);
    console.log(`  Project path: ${config.basePath}`);
    console.log('');
    console.log('  Endpoints:');
    console.log(`    Dashboard:  http://localhost:${config.port}/`);
    console.log(`    API Health: http://localhost:${config.port}/api/health`);
    console.log(`    API Status: http://localhost:${config.port}/api/status`);
    console.log('');
    console.log('  WebSocket: Enabled (Socket.io)');
    console.log('');
    console.log('  Watchers:');
    console.log('    - Telemetry (.ralph/telemetry.json)');
    console.log('    - Roadmap (IMPLEMENTATION_PLAN.md)');
    console.log('');
    console.log('===========================================');
    console.log('');
  });

  // Graceful shutdown
  const shutdown = async (): Promise<void> => {
    console.log('\nShutting down...');

    await watcherSystem.stop();

    httpServer.close(() => {
      console.log('Server closed');
      process.exit(0);
    });

    // Force exit after timeout
    setTimeout(() => {
      console.error('Forced shutdown');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Run
main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
