/**
 * Tests for project schema (ENT-001)
 */
import { describe, it, expect } from 'vitest';
import { ProjectStateSchema, type ProjectState } from '../../src/schemas/project.schema.js';

describe('ProjectStateSchema', () => {
  it('should validate a valid project state', () => {
    const validProject: ProjectState = {
      name: 'test-project',
      version: '1.0.0',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      root_path: '/path/to/project',
      specs_path: '/path/to/project/specs',
      implementation_path: '/path/to/project/src',
      current_phase: 'development',
      manager_rotations: 0,
      worker_rotations: 0,
      total_tasks: 10,
      completed_tasks: 3,
    };

    const result = ProjectStateSchema.safeParse(validProject);
    expect(result.success).toBe(true);
  });

  it('should reject invalid status', () => {
    const invalidProject = {
      name: 'test-project',
      version: '1.0.0',
      status: 'invalid-status',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      root_path: '/path/to/project',
      specs_path: '/path/to/project/specs',
      implementation_path: '/path/to/project/src',
      current_phase: 'development',
      manager_rotations: 0,
      worker_rotations: 0,
      total_tasks: 10,
      completed_tasks: 3,
    };

    const result = ProjectStateSchema.safeParse(invalidProject);
    expect(result.success).toBe(false);
  });

  it('should reject negative task counts', () => {
    const invalidProject = {
      name: 'test-project',
      version: '1.0.0',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      root_path: '/path/to/project',
      specs_path: '/path/to/project/specs',
      implementation_path: '/path/to/project/src',
      current_phase: 'development',
      manager_rotations: 0,
      worker_rotations: 0,
      total_tasks: -1,
      completed_tasks: 3,
    };

    const result = ProjectStateSchema.safeParse(invalidProject);
    expect(result.success).toBe(false);
  });

  it('should accept all valid status values', () => {
    const statuses = ['initializing', 'active', 'paused', 'completed', 'failed'] as const;

    for (const status of statuses) {
      const project = {
        name: 'test-project',
        version: '1.0.0',
        status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        root_path: '/path/to/project',
        specs_path: '/path/to/project/specs',
        implementation_path: '/path/to/project/src',
        current_phase: 'development',
        manager_rotations: 0,
        worker_rotations: 0,
        total_tasks: 10,
        completed_tasks: 3,
      };

      const result = ProjectStateSchema.safeParse(project);
      expect(result.success).toBe(true);
    }
  });

  it('should require all mandatory fields', () => {
    const incomplete = {
      name: 'test-project',
      version: '1.0.0',
    };

    const result = ProjectStateSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });
});
