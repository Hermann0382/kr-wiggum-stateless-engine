/**
 * Tests for telemetry schema (ENT-009)
 */
import { describe, it, expect } from 'vitest';
import {
  TelemetrySchema,
  ContextZoneSchema,
  GuardrailStatusSchema,
  type Telemetry,
} from '../../src/schemas/telemetry.schema.js';

describe('TelemetrySchema', () => {
  const now = new Date().toISOString();

  it('should validate a valid telemetry state', () => {
    const validTelemetry: Telemetry = {
      id: crypto.randomUUID(),
      project_id: crypto.randomUUID(),
      session_id: crypto.randomUUID(),
      agent_type: 'manager',
      zone: 'smart',
      context_fill_percent: 25,
      guardrail_status: 'all_passing',
      current_task_id: 'ST-001',
      tokens_used: 50000,
      tokens_remaining: 150000,
      heartbeat_at: now,
      created_at: now,
      updated_at: now,
    };

    const result = TelemetrySchema.safeParse(validTelemetry);
    expect(result.success).toBe(true);
  });

  it('should validate all zone types', () => {
    const zones = ['smart', 'degrading', 'dumb'] as const;

    for (const zone of zones) {
      const result = ContextZoneSchema.safeParse(zone);
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid zone', () => {
    const result = ContextZoneSchema.safeParse('invalid-zone');
    expect(result.success).toBe(false);
  });

  it('should reject context_fill_percent over 100', () => {
    const invalidTelemetry = {
      id: crypto.randomUUID(),
      project_id: crypto.randomUUID(),
      session_id: crypto.randomUUID(),
      agent_type: 'manager',
      zone: 'smart',
      context_fill_percent: 150,
      guardrail_status: 'all_passing',
      tokens_used: 50000,
      tokens_remaining: 0,
      heartbeat_at: now,
      created_at: now,
      updated_at: now,
    };

    const result = TelemetrySchema.safeParse(invalidTelemetry);
    expect(result.success).toBe(false);
  });

  it('should reject negative context_fill_percent', () => {
    const invalidTelemetry = {
      id: crypto.randomUUID(),
      project_id: crypto.randomUUID(),
      session_id: crypto.randomUUID(),
      agent_type: 'manager',
      zone: 'smart',
      context_fill_percent: -10,
      guardrail_status: 'all_passing',
      tokens_used: 0,
      tokens_remaining: 200000,
      heartbeat_at: now,
      created_at: now,
      updated_at: now,
    };

    const result = TelemetrySchema.safeParse(invalidTelemetry);
    expect(result.success).toBe(false);
  });

  it('should validate all guardrail status types', () => {
    const statuses = [
      'all_passing',
      'tests_failing',
      'compiler_failing',
      'lint_failing',
      'multiple_failing',
    ] as const;

    for (const status of statuses) {
      const result = GuardrailStatusSchema.safeParse(status);
      expect(result.success).toBe(true);
    }
  });

  it('should allow optional current_task_id', () => {
    const telemetryWithoutTask = {
      id: crypto.randomUUID(),
      project_id: crypto.randomUUID(),
      session_id: crypto.randomUUID(),
      agent_type: 'manager',
      zone: 'smart',
      context_fill_percent: 25,
      guardrail_status: 'all_passing',
      tokens_used: 50000,
      tokens_remaining: 150000,
      heartbeat_at: now,
      created_at: now,
      updated_at: now,
    };

    const result = TelemetrySchema.safeParse(telemetryWithoutTask);
    expect(result.success).toBe(true);
  });
});
