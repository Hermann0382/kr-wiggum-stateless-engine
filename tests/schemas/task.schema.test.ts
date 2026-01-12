/**
 * Tests for task schema (ENT-005)
 */
import { describe, it, expect } from 'vitest';
import { TaskSchema, type Task } from '../../src/schemas/task.schema.js';

describe('TaskSchema', () => {
  it('should validate a valid task', () => {
    const validTask: Task = {
      id: 'TASK-001',
      title: 'Implement user authentication',
      description: 'Add login and registration endpoints',
      status: 'pending',
      priority: 1,
      estimated_minutes: 25,
      actual_minutes: 0,
      dependency_layer: 1,
      dependencies: [],
      files_to_modify: ['src/auth/login.ts', 'src/auth/register.ts'],
      acceptance_criteria: [
        'Users can register with email and password',
        'Users can login and receive JWT token',
      ],
      user_story_id: 'US-001',
      assigned_worker_id: null,
      retry_count: 0,
      max_retries: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = TaskSchema.safeParse(validTask);
    expect(result.success).toBe(true);
  });

  it('should validate all status values', () => {
    const statuses = ['pending', 'in_progress', 'completed', 'failed', 'blocked'] as const;

    for (const status of statuses) {
      const task = {
        id: 'TASK-001',
        title: 'Test task',
        description: 'A test task',
        status,
        priority: 1,
        estimated_minutes: 20,
        actual_minutes: 0,
        dependency_layer: 1,
        dependencies: [],
        files_to_modify: [],
        acceptance_criteria: ['Test passes'],
        retry_count: 0,
        max_retries: 5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = TaskSchema.safeParse(task);
      expect(result.success).toBe(true);
    }
  });

  it('should reject estimated_minutes over 30', () => {
    const invalidTask = {
      id: 'TASK-001',
      title: 'Test task',
      description: 'A test task',
      status: 'pending',
      priority: 1,
      estimated_minutes: 45,
      actual_minutes: 0,
      dependency_layer: 1,
      dependencies: [],
      files_to_modify: [],
      acceptance_criteria: ['Test passes'],
      retry_count: 0,
      max_retries: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = TaskSchema.safeParse(invalidTask);
    expect(result.success).toBe(false);
  });

  it('should reject estimated_minutes under 15', () => {
    const invalidTask = {
      id: 'TASK-001',
      title: 'Test task',
      description: 'A test task',
      status: 'pending',
      priority: 1,
      estimated_minutes: 10,
      actual_minutes: 0,
      dependency_layer: 1,
      dependencies: [],
      files_to_modify: [],
      acceptance_criteria: ['Test passes'],
      retry_count: 0,
      max_retries: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = TaskSchema.safeParse(invalidTask);
    expect(result.success).toBe(false);
  });

  it('should reject more than 5 files_to_modify', () => {
    const invalidTask = {
      id: 'TASK-001',
      title: 'Test task',
      description: 'A test task',
      status: 'pending',
      priority: 1,
      estimated_minutes: 20,
      actual_minutes: 0,
      dependency_layer: 1,
      dependencies: [],
      files_to_modify: ['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts', 'f.ts'],
      acceptance_criteria: ['Test passes'],
      retry_count: 0,
      max_retries: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = TaskSchema.safeParse(invalidTask);
    expect(result.success).toBe(false);
  });

  it('should validate task with dependencies', () => {
    const taskWithDeps = {
      id: 'TASK-002',
      title: 'Test task with deps',
      description: 'A test task with dependencies',
      status: 'blocked',
      priority: 2,
      estimated_minutes: 25,
      actual_minutes: 0,
      dependency_layer: 2,
      dependencies: ['TASK-001'],
      files_to_modify: ['src/feature.ts'],
      acceptance_criteria: ['Feature works'],
      retry_count: 0,
      max_retries: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = TaskSchema.safeParse(taskWithDeps);
    expect(result.success).toBe(true);
  });

  it('should reject retry_count exceeding max_retries', () => {
    const invalidTask = {
      id: 'TASK-001',
      title: 'Test task',
      description: 'A test task',
      status: 'failed',
      priority: 1,
      estimated_minutes: 20,
      actual_minutes: 30,
      dependency_layer: 1,
      dependencies: [],
      files_to_modify: [],
      acceptance_criteria: ['Test passes'],
      retry_count: 6,
      max_retries: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = TaskSchema.safeParse(invalidTask);
    expect(result.success).toBe(false);
  });
});
