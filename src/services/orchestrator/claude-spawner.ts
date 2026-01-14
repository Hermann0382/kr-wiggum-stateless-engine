/**
 * Claude Code CLI spawner
 * Spawns Claude Code sessions with prompts for Worker/Manager agents
 */
import { spawn } from 'node:child_process';

import { EXIT_CODES, type ExitCode } from '../../types/index.js';

import { ensureClaudeCli } from './cli-detector.js';

/**
 * Claude spawn configuration
 */
export interface ClaudeSpawnConfig {
  /** The prompt to send to Claude */
  prompt: string;
  /** Working directory for Claude session */
  cwd: string;
  /** Timeout in milliseconds (default: 10 minutes) */
  timeout?: number;
  /** Allowed tools (if restricted) */
  allowedTools?: string[];
  /** Callback for output streaming */
  onOutput?: (data: string) => void;
  /** Environment variables to pass */
  env?: Record<string, string>;
}

/**
 * Claude spawn result
 */
export interface ClaudeSpawnResult {
  /** Process ID */
  pid: number;
  /** Exit code from Claude */
  exitCode: ExitCode;
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
  /** Duration in milliseconds */
  duration: number;
  /** Whether the session completed successfully */
  success: boolean;
  /** Whether the session timed out */
  timedOut: boolean;
}

/**
 * Spawn a Claude Code CLI session
 *
 * Uses `claude --print` for non-interactive mode with prompt via stdin
 */
export async function spawnClaude(config: ClaudeSpawnConfig): Promise<ClaudeSpawnResult> {
  const {
    prompt,
    cwd,
    timeout = 600000, // 10 minutes default
    allowedTools,
    onOutput,
    env = {},
  } = config;

  // Ensure Claude CLI is available
  await ensureClaudeCli();

  return new Promise((resolve) => {
    const start = Date.now();
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    // Build arguments
    const args: string[] = ['--print'];

    // Add allowed tools if specified
    if (allowedTools !== undefined && allowedTools.length > 0) {
      args.push('--allowedTools', allowedTools.join(','));
    }

    // Add the prompt as the final argument
    args.push(prompt);

    // Spawn Claude
    const child = spawn('claude', args, {
      cwd,
      env: {
        ...process.env,
        ...env,
        // Ensure non-interactive mode
        CI: 'true',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Set timeout
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeout);

    // Capture stdout
    child.stdout?.on('data', (data: Buffer) => {
      const str = data.toString();
      stdout += str;
      onOutput?.(str);
    });

    // Capture stderr
    child.stderr?.on('data', (data: Buffer) => {
      const str = data.toString();
      stderr += str;
      onOutput?.(str);
    });

    // Handle exit
    child.on('close', (code) => {
      clearTimeout(timer);

      // Map exit code
      let exitCode: ExitCode;
      if (timedOut) {
        exitCode = EXIT_CODES.CRASH;
      } else if (code === null) {
        exitCode = EXIT_CODES.CRASH;
      } else if (code === 0) {
        exitCode = EXIT_CODES.SUCCESS;
      } else if (code === 1) {
        exitCode = EXIT_CODES.TASK_FAILED;
      } else if (code === 10) {
        exitCode = EXIT_CODES.ROTATION_NEEDED;
      } else if (code === 20) {
        exitCode = EXIT_CODES.HUMAN_INTERVENTION;
      } else {
        exitCode = EXIT_CODES.CRASH;
      }

      resolve({
        pid: child.pid ?? 0,
        exitCode,
        stdout,
        stderr,
        duration: Date.now() - start,
        success: exitCode === EXIT_CODES.SUCCESS,
        timedOut,
      });
    });

    // Handle spawn errors
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({
        pid: child.pid ?? 0,
        exitCode: EXIT_CODES.CRASH,
        stdout,
        stderr: stderr + '\nSpawn error: ' + error.message,
        duration: Date.now() - start,
        success: false,
        timedOut: false,
      });
    });
  });
}

/**
 * Spawn Claude with prompt via stdin (for very long prompts)
 */
export async function spawnClaudeWithStdin(config: ClaudeSpawnConfig): Promise<ClaudeSpawnResult> {
  const {
    prompt,
    cwd,
    timeout = 600000,
    allowedTools,
    onOutput,
    env = {},
  } = config;

  // Ensure Claude CLI is available
  await ensureClaudeCli();

  return new Promise((resolve) => {
    const start = Date.now();
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    // Build arguments
    const args: string[] = ['--print'];

    // Add allowed tools if specified
    if (allowedTools !== undefined && allowedTools.length > 0) {
      args.push('--allowedTools', allowedTools.join(','));
    }

    // Spawn Claude (prompt will come via stdin)
    const child = spawn('claude', args, {
      cwd,
      env: {
        ...process.env,
        ...env,
        CI: 'true',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Write prompt to stdin
    child.stdin?.write(prompt);
    child.stdin?.end();

    // Set timeout
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeout);

    // Capture stdout
    child.stdout?.on('data', (data: Buffer) => {
      const str = data.toString();
      stdout += str;
      onOutput?.(str);
    });

    // Capture stderr
    child.stderr?.on('data', (data: Buffer) => {
      const str = data.toString();
      stderr += str;
      onOutput?.(str);
    });

    // Handle exit
    child.on('close', (code) => {
      clearTimeout(timer);

      let exitCode: ExitCode;
      if (timedOut) {
        exitCode = EXIT_CODES.CRASH;
      } else if (code === null) {
        exitCode = EXIT_CODES.CRASH;
      } else if (code === 0) {
        exitCode = EXIT_CODES.SUCCESS;
      } else if (code === 1) {
        exitCode = EXIT_CODES.TASK_FAILED;
      } else if (code === 10) {
        exitCode = EXIT_CODES.ROTATION_NEEDED;
      } else if (code === 20) {
        exitCode = EXIT_CODES.HUMAN_INTERVENTION;
      } else {
        exitCode = EXIT_CODES.CRASH;
      }

      resolve({
        pid: child.pid ?? 0,
        exitCode,
        stdout,
        stderr,
        duration: Date.now() - start,
        success: exitCode === EXIT_CODES.SUCCESS,
        timedOut,
      });
    });

    // Handle spawn errors
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({
        pid: child.pid ?? 0,
        exitCode: EXIT_CODES.CRASH,
        stdout,
        stderr: stderr + '\nSpawn error: ' + error.message,
        duration: Date.now() - start,
        success: false,
        timedOut: false,
      });
    });
  });
}
