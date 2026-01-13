/**
 * Integration tests for manager and worker entry points
 * Tests process spawning, environment variables, and exit codes
 */
import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { EXIT_CODES } from '../../src/types/index.js';

describe('Entry Points Integration', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `kr-wiggum-entry-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    await mkdir(join(testDir, '.agent'), { recursive: true });
    await mkdir(join(testDir, '.ralph'), { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  /**
   * Helper to spawn a process and capture results
   */
  async function spawnEntry(
    entryFile: string,
    env: Record<string, string>
  ): Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
  }> {
    return new Promise((resolve) => {
      const proc = spawn(
        'node',
        ['--import', 'tsx', entryFile],
        {
          cwd: process.cwd(),
          env: { ...process.env, ...env },
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 10000,
        }
      );

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        resolve({
          exitCode: code ?? EXIT_CODES.CRASH,
          stdout,
          stderr,
        });
      });

      proc.on('error', (err) => {
        resolve({
          exitCode: EXIT_CODES.CRASH,
          stdout,
          stderr: stderr + '\n' + err.message,
        });
      });

      // Timeout after 8 seconds
      setTimeout(() => {
        proc.kill('SIGTERM');
      }, 8000);
    });
  }

  describe('Worker Entry Point', () => {
    it('should exit with CRASH when required env vars are missing', async () => {
      const result = await spawnEntry('src/worker-entry.ts', {
        PROJECT_PATH: testDir,
        // Missing TASK_ID, PRD_PATH, CURRENT_TASK_PATH, PROJECT_ID
      });

      expect(result.exitCode).toBe(EXIT_CODES.CRASH);
      expect(result.stderr).toContain('Missing required environment variables');
    });

    it('should exit with CRASH when TASK_ID is missing', async () => {
      const result = await spawnEntry('src/worker-entry.ts', {
        PROJECT_PATH: testDir,
        PROJECT_ID: 'test-project',
        PRD_PATH: join(testDir, 'prd.md'),
        CURRENT_TASK_PATH: join(testDir, 'task.json'),
        // Missing TASK_ID
      });

      expect(result.exitCode).toBe(EXIT_CODES.CRASH);
      expect(result.stderr).toContain('TASK_ID');
    });

    it('should start worker with all required env vars', async () => {
      // Create minimal test files
      await writeFile(
        join(testDir, 'prd.md'),
        '# Test PRD\n\n## Requirements\n- Test requirement'
      );
      await writeFile(
        join(testDir, 'task.json'),
        JSON.stringify({
          id: 'TASK-001',
          title: 'Test task',
          description: 'A test task',
          status: 'pending',
        })
      );

      const result = await spawnEntry('src/worker-entry.ts', {
        PROJECT_PATH: testDir,
        PROJECT_ID: 'test-project',
        TASK_ID: 'TASK-001',
        PRD_PATH: join(testDir, 'prd.md'),
        CURRENT_TASK_PATH: join(testDir, 'task.json'),
      });

      // Worker should start (may fail later due to missing build/test commands)
      expect(result.stderr).toContain('[WORKER] Starting Worker process');
      expect(result.stderr).toContain('TASK-001');
    });
  });

  describe('Manager Entry Point', () => {
    it('should start manager with default config', async () => {
      // Create minimal project state
      await writeFile(
        join(testDir, '.agent', 'project.json'),
        JSON.stringify({
          id: 'test-project',
          name: 'Test Project',
          status: 'in_progress',
        })
      );

      await writeFile(
        join(testDir, '.ralph', 'telemetry.json'),
        JSON.stringify({
          context_fill_percent: 10,
          zone: 'healthy',
          session_id: 'test-session',
          project_id: 'test-project',
          agent_type: 'manager',
        })
      );

      await writeFile(
        join(testDir, 'IMPLEMENTATION_PLAN.md'),
        '# Implementation Plan\n\n- [ ] Task 1\n- [ ] Task 2'
      );

      const result = await spawnEntry('src/manager-entry.ts', {
        PROJECT_PATH: testDir,
        PROJECT_ID: 'test-project',
      });

      // Manager should start
      expect(result.stderr).toContain('[MANAGER] Starting Manager process');
      expect(result.stderr).toContain('Project path:');
    });

    it('should read HANDOFF_FILE when provided', async () => {
      // Create handoff file
      const handoffContent = `# Shift Handoff

## Previous Manager Session
- Completed tasks: TASK-001, TASK-002
- Context fill: 58%

## Notes for Next Manager
Continue with TASK-003
`;
      await writeFile(join(testDir, '.agent', 'SHIFT_HANDOFF.md'), handoffContent);

      // Create required state files
      await writeFile(
        join(testDir, '.ralph', 'telemetry.json'),
        JSON.stringify({
          context_fill_percent: 5,
          zone: 'healthy',
        })
      );

      await writeFile(
        join(testDir, 'IMPLEMENTATION_PLAN.md'),
        '# Implementation Plan\n\n- [x] Task 1\n- [x] Task 2\n- [ ] Task 3'
      );

      const result = await spawnEntry('src/manager-entry.ts', {
        PROJECT_PATH: testDir,
        PROJECT_ID: 'test-project',
        HANDOFF_FILE: join(testDir, '.agent', 'SHIFT_HANDOFF.md'),
      });

      expect(result.stderr).toContain('[MANAGER] Starting Manager process');
      expect(result.stderr).toContain('Handoff file:');
    });
  });

  describe('Exit Codes', () => {
    it('EXIT_CODES should have correct values', () => {
      expect(EXIT_CODES.SUCCESS).toBe(0);
      expect(EXIT_CODES.TASK_FAILED).toBe(1);
      expect(EXIT_CODES.ROTATION_NEEDED).toBe(10);
      expect(EXIT_CODES.HUMAN_INTERVENTION).toBe(20);
      expect(EXIT_CODES.CRASH).toBe(99);
    });
  });
});
