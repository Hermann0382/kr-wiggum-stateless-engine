/**
 * Tests for TelemetryManager
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { createTelemetryManager, TelemetryManager } from '../../src/state/telemetry-manager.js';
import type { TelemetryState } from '../../src/schemas/telemetry.schema.js';

describe('TelemetryManager', () => {
  let testDir: string;
  let manager: TelemetryManager;

  beforeEach(async () => {
    testDir = join(tmpdir(), `kr-wiggum-telemetry-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
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
      expect(state.tasks_completed_this_session).toBe(0);
      expect(state.errors_this_session).toBe(0);
    });
  });

  describe('updateContextFill', () => {
    it('should update context fill percentage', async () => {
      await manager.updateContextFill(35);

      const state = await manager.read();
      expect(state.context_fill_percent).toBe(35);
    });

    it('should auto-detect smart zone (0-40%)', async () => {
      await manager.updateContextFill(25);

      const state = await manager.read();
      expect(state.zone).toBe('smart');
    });

    it('should auto-detect degrading zone (40-60%)', async () => {
      await manager.updateContextFill(50);

      const state = await manager.read();
      expect(state.zone).toBe('degrading');
    });

    it('should auto-detect dumb zone (60%+)', async () => {
      await manager.updateContextFill(75);

      const state = await manager.read();
      expect(state.zone).toBe('dumb');
    });

    it('should clamp percentage to 0-100 range', async () => {
      await manager.updateContextFill(150);

      const state = await manager.read();
      expect(state.context_fill_percent).toBe(100);
    });
  });

  describe('setCurrentTask', () => {
    it('should set current task ID', async () => {
      await manager.setCurrentTask('TASK-001');

      const state = await manager.read();
      expect(state.current_task_id).toBe('TASK-001');
    });

    it('should clear current task when null', async () => {
      await manager.setCurrentTask('TASK-001');
      await manager.setCurrentTask(null);

      const state = await manager.read();
      expect(state.current_task_id).toBeUndefined();
    });
  });

  describe('incrementTasksCompleted', () => {
    it('should increment completed task count', async () => {
      await manager.incrementTasksCompleted();
      await manager.incrementTasksCompleted();

      const state = await manager.read();
      expect(state.tasks_completed_this_session).toBe(2);
    });
  });

  describe('incrementErrors', () => {
    it('should increment error count', async () => {
      await manager.incrementErrors();

      const state = await manager.read();
      expect(state.errors_this_session).toBe(1);
    });
  });

  describe('setGuardrailStatus', () => {
    it('should update guardrail status', async () => {
      await manager.setGuardrailStatus('some_failing');

      const state = await manager.read();
      expect(state.guardrail_status).toBe('some_failing');
    });

    it('should accept all valid guardrail statuses', async () => {
      const statuses = ['all_passing', 'some_failing', 'blocked'] as const;

      for (const status of statuses) {
        await manager.setGuardrailStatus(status);
        const state = await manager.read();
        expect(state.guardrail_status).toBe(status);
      }
    });
  });

  describe('getZone', () => {
    it('should return current zone', async () => {
      await manager.updateContextFill(25);

      const zone = await manager.getZone();
      expect(zone).toBe('smart');
    });
  });

  describe('isInDumbZone', () => {
    it('should return false in smart zone', async () => {
      await manager.updateContextFill(30);

      const isDumb = await manager.isInDumbZone();
      expect(isDumb).toBe(false);
    });

    it('should return false in degrading zone', async () => {
      await manager.updateContextFill(50);

      const isDumb = await manager.isInDumbZone();
      expect(isDumb).toBe(false);
    });

    it('should return true in dumb zone', async () => {
      await manager.updateContextFill(70);

      const isDumb = await manager.isInDumbZone();
      expect(isDumb).toBe(true);
    });
  });

  describe('shouldRotate', () => {
    it('should not rotate in smart zone', async () => {
      await manager.updateContextFill(30);

      const shouldRotate = await manager.shouldRotate();
      expect(shouldRotate).toBe(false);
    });

    it('should rotate in dumb zone', async () => {
      await manager.updateContextFill(70);

      const shouldRotate = await manager.shouldRotate();
      expect(shouldRotate).toBe(true);
    });
  });

  describe('resetSession', () => {
    it('should reset session counters', async () => {
      await manager.incrementTasksCompleted();
      await manager.incrementTasksCompleted();
      await manager.incrementErrors();
      await manager.setCurrentTask('TASK-001');

      await manager.resetSession();

      const state = await manager.read();
      expect(state.tasks_completed_this_session).toBe(0);
      expect(state.errors_this_session).toBe(0);
      expect(state.current_task_id).toBeUndefined();
      expect(state.context_fill_percent).toBe(0);
      expect(state.zone).toBe('smart');
    });
  });
});
