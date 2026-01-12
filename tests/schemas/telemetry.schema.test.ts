/**
 * Tests for telemetry schema (ENT-009)
 */
import { describe, it, expect } from 'vitest';
import { TelemetryStateSchema, type TelemetryState } from '../../src/schemas/telemetry.schema.js';

describe('TelemetryStateSchema', () => {
  it('should validate a valid telemetry state', () => {
    const validTelemetry: TelemetryState = {
      agent_type: 'manager',
      agent_id: 'mgr-001',
      session_id: 'session-abc123',
      zone: 'smart',
      context_fill_percent: 25,
      timestamp: new Date().toISOString(),
      guardrail_status: 'all_passing',
      current_task_id: 'TASK-001',
      tasks_completed_this_session: 3,
      errors_this_session: 0,
      estimated_context_remaining: 75000,
    };

    const result = TelemetryStateSchema.safeParse(validTelemetry);
    expect(result.success).toBe(true);
  });

  it('should validate all zone types', () => {
    const zones = ['smart', 'degrading', 'dumb'] as const;

    for (const zone of zones) {
      const telemetry = {
        agent_type: 'worker',
        agent_id: 'wkr-001',
        session_id: 'session-abc123',
        zone,
        context_fill_percent: 50,
        timestamp: new Date().toISOString(),
        guardrail_status: 'all_passing',
        tasks_completed_this_session: 0,
        errors_this_session: 0,
        estimated_context_remaining: 50000,
      };

      const result = TelemetryStateSchema.safeParse(telemetry);
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid zone', () => {
    const invalidTelemetry = {
      agent_type: 'manager',
      agent_id: 'mgr-001',
      session_id: 'session-abc123',
      zone: 'invalid-zone',
      context_fill_percent: 25,
      timestamp: new Date().toISOString(),
      guardrail_status: 'all_passing',
      tasks_completed_this_session: 0,
      errors_this_session: 0,
      estimated_context_remaining: 75000,
    };

    const result = TelemetryStateSchema.safeParse(invalidTelemetry);
    expect(result.success).toBe(false);
  });

  it('should reject context_fill_percent over 100', () => {
    const invalidTelemetry = {
      agent_type: 'manager',
      agent_id: 'mgr-001',
      session_id: 'session-abc123',
      zone: 'smart',
      context_fill_percent: 150,
      timestamp: new Date().toISOString(),
      guardrail_status: 'all_passing',
      tasks_completed_this_session: 0,
      errors_this_session: 0,
      estimated_context_remaining: 0,
    };

    const result = TelemetryStateSchema.safeParse(invalidTelemetry);
    expect(result.success).toBe(false);
  });

  it('should reject negative context_fill_percent', () => {
    const invalidTelemetry = {
      agent_type: 'manager',
      agent_id: 'mgr-001',
      session_id: 'session-abc123',
      zone: 'smart',
      context_fill_percent: -10,
      timestamp: new Date().toISOString(),
      guardrail_status: 'all_passing',
      tasks_completed_this_session: 0,
      errors_this_session: 0,
      estimated_context_remaining: 100000,
    };

    const result = TelemetryStateSchema.safeParse(invalidTelemetry);
    expect(result.success).toBe(false);
  });

  it('should validate all guardrail status types', () => {
    const statuses = ['all_passing', 'some_failing', 'blocked'] as const;

    for (const guardrail_status of statuses) {
      const telemetry = {
        agent_type: 'worker',
        agent_id: 'wkr-001',
        session_id: 'session-abc123',
        zone: 'smart',
        context_fill_percent: 30,
        timestamp: new Date().toISOString(),
        guardrail_status,
        tasks_completed_this_session: 0,
        errors_this_session: 0,
        estimated_context_remaining: 70000,
      };

      const result = TelemetryStateSchema.safeParse(telemetry);
      expect(result.success).toBe(true);
    }
  });

  it('should allow optional current_task_id', () => {
    const telemetryWithoutTask = {
      agent_type: 'manager',
      agent_id: 'mgr-001',
      session_id: 'session-abc123',
      zone: 'smart',
      context_fill_percent: 25,
      timestamp: new Date().toISOString(),
      guardrail_status: 'all_passing',
      tasks_completed_this_session: 0,
      errors_this_session: 0,
      estimated_context_remaining: 75000,
    };

    const result = TelemetryStateSchema.safeParse(telemetryWithoutTask);
    expect(result.success).toBe(true);
  });
});
