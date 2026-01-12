/**
 * Zod schema for StatusFragment entity (ENT-011)
 * Worker output documenting task completion
 */
import { z } from 'zod';

export const StatusFragmentSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  session_id: z.string().uuid(),
  task_id: z.string().regex(/^ST-\d{3}$/),
  what_fixed: z.string().min(10).max(500),
  what_changed: z.array(
    z.object({
      file_path: z.string(),
      change_type: z.enum(['created', 'modified', 'deleted']),
      lines_added: z.number().int().min(0),
      lines_removed: z.number().int().min(0),
    })
  ).min(1),
  patterns_used: z.array(z.string()).default([]),
  token_count: z.number().int().min(0).max(500), // Max 500 tokens
  tests_passed: z.boolean(),
  compiler_passed: z.boolean(),
  retry_count: z.number().int().min(0).max(5), // Max 5 retries
  created_at: z.string().datetime(),
});

export type StatusFragment = z.infer<typeof StatusFragmentSchema>;
