/**
 * Express application setup
 * Static file serving for /public, Socket.io integration
 */
import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Application configuration
 */
export interface AppConfig {
  publicPath?: string;
  basePath?: string;
}

/**
 * Create and configure Express application
 */
export function createApp(config: AppConfig = {}): Express {
  const app = express();

  // Determine paths
  const publicPath = config.publicPath ?? join(__dirname, '..', 'public');
  const basePath = config.basePath ?? process.cwd();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Static files
  app.use(express.static(publicPath));

  // API routes
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  app.get('/api/status', async (_req: Request, res: Response) => {
    try {
      // Read telemetry and progress
      const { readFile } = await import('node:fs/promises');

      let telemetry = null;
      let progress = null;

      try {
        const telemetryContent = await readFile(
          join(basePath, '.ralph', 'telemetry.json'),
          'utf-8'
        );
        telemetry = JSON.parse(telemetryContent);
      } catch {
        // No telemetry yet
      }

      try {
        const planContent = await readFile(
          join(basePath, 'IMPLEMENTATION_PLAN.md'),
          'utf-8'
        );

        // Parse progress
        const checkedCount = (planContent.match(/- \[x\]/gi) ?? []).length;
        const uncheckedCount = (planContent.match(/- \[ \]/gi) ?? []).length;
        const total = checkedCount + uncheckedCount;

        progress = {
          total,
          completed: checkedCount,
          remaining: uncheckedCount,
          percentComplete: total > 0 ? Math.round((checkedCount / total) * 100) : 0,
        };
      } catch {
        // No plan yet
      }

      res.json({
        telemetry,
        progress,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to read status',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Crisis mode endpoint
  app.post('/api/crisis', (req: Request, res: Response) => {
    const { action, reason } = req.body as { action?: string; reason?: string };

    if (action === undefined) {
      res.status(400).json({ error: 'Action required' });
      return;
    }

    // Log crisis event
    console.error(`[CRISIS] Action: ${action}, Reason: ${reason ?? 'Not specified'}`);

    res.json({
      success: true,
      action,
      reason,
      timestamp: new Date().toISOString(),
    });
  });

  // Dashboard route (serve index.html for SPA routing)
  app.get('/', (_req: Request, res: Response) => {
    res.sendFile(join(publicPath, 'index.html'));
  });

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[ERROR]', err.message);
    res.status(500).json({
      error: 'Internal server error',
      message: process.env['NODE_ENV'] === 'development' ? err.message : undefined,
    });
  });

  return app;
}

/**
 * Get Express app instance with default config
 */
export const app = createApp();
