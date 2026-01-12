/**
 * Tests for project schema (ENT-001)
 */
import { describe, it, expect } from 'vitest';
import {
  ProjectSchema,
  ProjectStatusSchema,
  type Project,
} from '../../src/schemas/project.schema.js';

describe('ProjectSchema', () => {
  const now = new Date().toISOString();

  it('should validate a valid project state', () => {
    const validProject: Project = {
      id: crypto.randomUUID(),
      name: 'test-project',
      owner_email: 'test@example.com',
      version: '1.0.0',
      status: 'active',
      created_at: now,
      updated_at: now,
      cost_tracking: {
        total_cost_usd: 0,
        hourly_rate_usd: 10.42,
        total_hours: 0,
      },
      specs_path: '/path/to/specs',
      implementation_plan_path: '/path/to/plan',
    };

    const result = ProjectSchema.safeParse(validProject);
    expect(result.success).toBe(true);
  });

  it('should reject invalid status', () => {
    const invalidProject = {
      id: crypto.randomUUID(),
      name: 'test-project',
      owner_email: 'test@example.com',
      version: '1.0.0',
      status: 'invalid-status',
      created_at: now,
      updated_at: now,
      cost_tracking: {
        total_cost_usd: 0,
        hourly_rate_usd: 10.42,
        total_hours: 0,
      },
    };

    const result = ProjectSchema.safeParse(invalidProject);
    expect(result.success).toBe(false);
  });

  it('should reject negative cost values', () => {
    const invalidProject = {
      id: crypto.randomUUID(),
      name: 'test-project',
      owner_email: 'test@example.com',
      version: '1.0.0',
      status: 'active',
      created_at: now,
      updated_at: now,
      cost_tracking: {
        total_cost_usd: -100,
        hourly_rate_usd: 10.42,
        total_hours: 0,
      },
    };

    const result = ProjectSchema.safeParse(invalidProject);
    expect(result.success).toBe(false);
  });

  it('should accept all valid status values', () => {
    const statuses = ['planning', 'active', 'paused', 'completed', 'archived'] as const;

    for (const status of statuses) {
      const result = ProjectStatusSchema.safeParse(status);
      expect(result.success).toBe(true);
    }
  });

  it('should require all mandatory fields', () => {
    const incomplete = {
      name: 'test-project',
      version: '1.0.0',
    };

    const result = ProjectSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });
});
