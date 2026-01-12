/**
 * Zod schema for Task entity (ENT-005)
 * Atomic task with ST-XXX identifier and checkbox state
 */
import { z } from 'zod';

export const TaskStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'blocked',
  'skipped',
]);

export const TaskSchema = z.object({
  id: z.string().regex(/^ST-\d{3}$/), // ST-001 format
  implementation_plan_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  status: TaskStatusSchema,
  checkbox_state: z.boolean().default(false),
  dependency_layer: z.number().int().min(0), // 0 = no dependencies
  dependencies: z.array(z.string().regex(/^ST-\d{3}$/)).default([]),
  estimated_minutes: z.number().int().min(15).max(60).default(30), // 15-30 min atomic
  max_files: z.number().int().min(1).max(10).default(5), // 3-5 files
  max_loc: z.number().int().min(10).max(300).default(150), // <150 LOC
  created_at: z.string().datetime(),
  completed_at: z.string().datetime().optional(),
  worker_session_id: z.string().uuid().optional(),
});

export type Task = z.infer<typeof TaskSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
