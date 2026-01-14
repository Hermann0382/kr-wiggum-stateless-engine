/**
 * Claude CLI detection utility
 * Checks if Claude Code CLI is installed and available
 */
import { spawn } from 'node:child_process';

/**
 * Claude CLI detection result
 */
export interface ClaudeCliInfo {
  available: boolean;
  version: string | null;
  path: string | null;
  error: string | null;
}

/**
 * Check if Claude CLI is available
 */
export async function detectClaudeCli(): Promise<ClaudeCliInfo> {
  return new Promise((resolve) => {
    const child = spawn('which', ['claude']);

    let stdout = '';

    child.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.on('error', () => {
      resolve({
        available: false,
        version: null,
        path: null,
        error: 'Claude CLI not found. Install with: npm install -g @anthropic-ai/claude-code',
      });
    });

    child.on('close', (code) => {
      if (code !== 0 || stdout.trim() === '') {
        resolve({
          available: false,
          version: null,
          path: null,
          error: 'Claude CLI not found. Install with: npm install -g @anthropic-ai/claude-code',
        });
        return;
      }

      const cliPath = stdout.trim();

      // Get version
      void getClaudeVersion().then((version) => {
        resolve({
          available: true,
          version,
          path: cliPath,
          error: null,
        });
      });
    });
  });
}

/**
 * Get Claude CLI version
 */
async function getClaudeVersion(): Promise<string | null> {
  return new Promise((resolve) => {
    const child = spawn('claude', ['--version']);

    let stdout = '';

    child.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.on('error', () => {
      resolve(null);
    });

    child.on('close', (code) => {
      if (code !== 0) {
        resolve(null);
        return;
      }
      // Parse version from output (e.g., "claude 1.0.0" or just "1.0.0")
      const match = stdout.match(/(\d+\.\d+\.\d+)/);
      resolve(match?.[1] ?? stdout.trim());
    });
  });
}

/**
 * Ensure Claude CLI is available, throw if not
 */
export async function ensureClaudeCli(): Promise<ClaudeCliInfo> {
  const info = await detectClaudeCli();

  if (!info.available) {
    throw new Error(info.error ?? 'Claude CLI not available');
  }

  return info;
}

/**
 * Check if Claude CLI is available (sync-friendly wrapper)
 */
export function isClaudeCliAvailable(): Promise<boolean> {
  return detectClaudeCli().then((info) => info.available);
}
