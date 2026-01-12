/**
 * Tests for task schema (ENT-005)
 */
import { describe, it, expect } from 'vitest';
import { TaskSchema, TaskStatusSchema, type Task } from '../../src/schemas/task.schema.js';

describe('TaskSchema', () => {
  const now = new Date().toISOString();

  it('should validate a valid task', () => {
    const validTask: Task = {
      id: 'ST-001',
      implementation_plan_id: crypto.randomUUID(),
      title: 'Implement user authentication',
      description: 'Add login and registration endpoints',
      status: 'pending',
      checkbox_state: false,
      dependency_layer: 0,
      dependencies: [],
      estimated_minutes: 25,
      max_files: 5,
      max_loc: 150,
      created_at: now,
    };

    const result = TaskSchema.safeParse(validTask);
    expect(result.success).toBe(true);
  });

  it('should validate all status values', () => {
    const statuses = ['pending', 'in_progress', 'completed', 'blocked', 'skipped'] as const;

    for (const status of statuses) {
      const result = TaskStatusSchema.safeParse(status);
      expect(result.success).toBe(true);
    }
  });

  it('should reject estimated_minutes over 60', () => {
    const invalidTask = {
      id: 'ST-001',
      implementation_plan_id: crypto.randomUUID(),
      title: 'Test task',
      status: 'pending',
      checkbox_state: false,
      dependency_layer: 0,
      dependencies: [],
      estimated_minutes: 90,
      max_files: 5,
      max_loc: 150,
      created_at: now,
    };

    const result = TaskSchema.safeParse(invalidTask);
    expect(result.success).toBe(false);
  });

  it('should reject estimated_minutes under 15', () => {
    const invalidTask = {
      id: 'ST-001',
      implementation_plan_id: crypto.randomUUID(),
      title: 'Test task',
      status: 'pending',
      checkbox_state: false,
      dependency_layer: 0,
      dependencies: [],
      estimated_minutes: 10,
      max_files: 5,
      max_loc: 150,
      created_at: now,
    };

    const result = TaskSchema.safeParse(invalidTask);
    expect(result.success).toBe(false);
  });

  it('should reject max_files over 10', () => {
    const invalidTask = {
      id: 'ST-001',
      implementation_plan_id: crypto.randomUUID(),
      title: 'Test task',
      status: 'pending',
      checkbox_state: false,
      dependency_layer: 0,
      dependencies: [],
      estimated_minutes: 25,
      max_files: 15,
      max_loc: 150,
      created_at: now,
    };

    const result = TaskSchema.safeParse(invalidTask);
    expect(result.success).toBe(false);
  });

  it('should validate task with dependencies', () => {
    const taskWithDeps = {
      id: 'ST-002',
      implementation_plan_id: crypto.randomUUID(),
      title: 'Test task with deps',
      description: 'A test task with dependencies',
      status: 'blocked',
      checkbox_state: false,
      dependency_layer: 1,
      dependencies: ['ST-001'],
      estimated_minutes: 25,
      max_files: 5,
      max_loc: 150,
      created_at: now,
    };

    const result = TaskSchema.safeParse(taskWithDeps);
    expect(result.success).toBe(true);
  });

  it('should reject invalid task ID format', () => {
    const invalidTask = {
      id: 'TASK-001', // Should be ST-XXX
      implementation_plan_id: crypto.randomUUID(),
      title: 'Test task',
      status: 'pending',
      checkbox_state: false,
      dependency_layer: 0,
      dependencies: [],
      estimated_minutes: 25,
      max_files: 5,
      max_loc: 150,
      created_at: now,
    };

    const result = TaskSchema.safeParse(invalidTask);
    expect(result.success).toBe(false);
  });
});
