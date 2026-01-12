/**
 * Tests for TelemetryManager
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { createTelemetryManager, TelemetryManager } from '../../src/state/telemetry-manager.js';

describe('TelemetryManager', () => {
  let testDir: string;
  let manager: TelemetryManager;

  beforeEach(async () => {
    testDir = join(tmpdir(), `kr-wiggum-telemetry-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    await mkdir(join(testDir, '.ralph'), { recursive: true });
    manager = createTelemetryManager(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('getDefaultState', () => {
    it('should return default telemetry state', async () => {
      const state = await manager.read();

      expect(state.agent_type).toBe('manager');
      expect(state.zone).toBe('smart');
      expect(state.context_fill_percent).toBe(0);
      expect(state.guardrail_status).toBe('all_passing');
      expect(state.tokens_used).toBe(0);
    });
  });

  describe('startSession', () => {
    it('should start a new session with given project ID and agent type', async () => {
      const projectId = crypto.randomUUID();
      const state = await manager.startSession({
        projectId,
        agentType: 'worker',
      });

      expect(state.project_id).toBe(projectId);
      expect(state.agent_type).toBe('worker');
      expect(state.context_fill_percent).toBe(0);
      expect(state.zone).toBe('smart');
    });
  });

  describe('heartbeat', () => {
    it('should update token count and calculate fill percentage', async () => {
      // With default 200K context window, 40K tokens = 20%
      const state = await manager.heartbeat(40000);

      expect(state.tokens_used).toBe(40000);
      expect(state.context_fill_percent).toBe(20);
      expect(state.zone).toBe('smart');
    });

    it('should auto-detect smart zone (0-40%)', async () => {
      await manager.heartbeat(50000); // 25% of 200K

      const state = await manager.read();
      expect(state.zone).toBe('smart');
    });

    it('should auto-detect degrading zone (40-60%)', async () => {
      await manager.heartbeat(100000); // 50% of 200K

      const state = await manager.read();
      expect(state.zone).toBe('degrading');
    });

    it('should auto-detect dumb zone (60%+)', async () => {
      await manager.heartbeat(150000); // 75% of 200K

      const state = await manager.read();
      expect(state.zone).toBe('dumb');
    });

    it('should set current task ID when provided', async () => {
      await manager.heartbeat(10000, 'ST-001');

      const state = await manager.read();
      expect(state.current_task_id).toBe('ST-001');
    });
  });

  describe('setCurrentTask', () => {
    it('should set current task ID', async () => {
      await manager.setCurrentTask('ST-001');

      const state = await manager.read();
      expect(state.current_task_id).toBe('ST-001');
    });

    it('should clear current task when undefined', async () => {
      await manager.setCurrentTask('ST-001');
      await manager.setCurrentTask(undefined);

      const state = await manager.read();
      expect(state.current_task_id).toBeUndefined();
    });
  });

  describe('updateGuardrailStatus', () => {
    it('should update guardrail status', async () => {
      await manager.updateGuardrailStatus('tests_failing');

      const state = await manager.read();
      expect(state.guardrail_status).toBe('tests_failing');
    });

    it('should accept all valid guardrail statuses', async () => {
      const statuses = [
        'all_passing',
        'tests_failing',
        'compiler_failing',
        'lint_failing',
        'multiple_failing',
      ] as const;

      for (const status of statuses) {
        await manager.updateGuardrailStatus(status);
        const state = await manager.read();
        expect(state.guardrail_status).toBe(status);
      }
    });
  });

  describe('calculateZone', () => {
    it('should return smart zone for 0-39%', () => {
      expect(manager.calculateZone(0)).toBe('smart');
      expect(manager.calculateZone(20)).toBe('smart');
      expect(manager.calculateZone(39)).toBe('smart');
    });

    it('should return degrading zone for 40-59%', () => {
      expect(manager.calculateZone(40)).toBe('degrading');
      expect(manager.calculateZone(50)).toBe('degrading');
      expect(manager.calculateZone(59)).toBe('degrading');
    });

    it('should return dumb zone for 60%+', () => {
      expect(manager.calculateZone(60)).toBe('dumb');
      expect(manager.calculateZone(80)).toBe('dumb');
      expect(manager.calculateZone(100)).toBe('dumb');
    });
  });

  describe('needsRotation', () => {
    it('should not rotate in smart zone for manager', async () => {
      await manager.startSession({ projectId: crypto.randomUUID(), agentType: 'manager' });
      await manager.heartbeat(50000); // 25%

      const shouldRotate = await manager.needsRotation();
      expect(shouldRotate).toBe(false);
    });

    it('should rotate in dumb zone for manager', async () => {
      await manager.startSession({ projectId: crypto.randomUUID(), agentType: 'manager' });
      await manager.heartbeat(140000); // 70%

      const shouldRotate = await manager.needsRotation();
      expect(shouldRotate).toBe(true);
    });

    it('should not trigger rotation for worker', async () => {
      await manager.startSession({ projectId: crypto.randomUUID(), agentType: 'worker' });
      await manager.heartbeat(140000); // 70%

      const shouldRotate = await manager.needsRotation();
      expect(shouldRotate).toBe(false);
    });
  });

  describe('shouldSelfDestruct', () => {
    it('should not self-destruct when worker context is low', async () => {
      await manager.startSession({ projectId: crypto.randomUUID(), agentType: 'worker' });
      await manager.heartbeat(50000); // 25%

      const should = await manager.shouldSelfDestruct();
      expect(should).toBe(false);
    });

    it('should self-destruct when worker context exceeds threshold', async () => {
      await manager.startSession({ projectId: crypto.randomUUID(), agentType: 'worker' });
      await manager.heartbeat(100000); // 50%

      const should = await manager.shouldSelfDestruct();
      expect(should).toBe(true);
    });
  });

  describe('resetForWorker', () => {
    it('should reset telemetry for new worker', async () => {
      const projectId = crypto.randomUUID();
      await manager.startSession({ projectId, agentType: 'manager' });
      await manager.heartbeat(100000);
      await manager.updateGuardrailStatus('tests_failing');

      await manager.resetForWorker(projectId);

      const state = await manager.read();
      expect(state.agent_type).toBe('worker');
      expect(state.context_fill_percent).toBe(0);
      expect(state.zone).toBe('smart');
      expect(state.guardrail_status).toBe('all_passing');
      expect(state.project_id).toBe(projectId);
    });
  });

  describe('getContextConfig', () => {
    it('should return context window configuration', () => {
      const config = manager.getContextConfig();

      expect(config.totalTokens).toBe(200000);
      expect(config.smartZoneMax).toBe(40);
      expect(config.degradingZoneMax).toBe(60);
    });
  });
});
