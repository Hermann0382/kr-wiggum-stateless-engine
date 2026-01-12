/**
 * Zod schema for ShiftReport entity (ENT-007)
 * Manager session summary with status of all systems
 */
import { z } from 'zod';

export const SystemStatusSchema = z.enum([
  'passing',
  'failing',
  'unknown',
  'skipped',
]);

export const ShiftReportSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  session_id: z.string().uuid(),
  executive_summary: z.string().min(50).max(2000),
  tasks_completed: z.array(z.string().regex(/^ST-\d{3}$/)),
  tasks_failed: z.array(z.string().regex(/^ST-\d{3}$/)).default([]),
  tasks_blocked: z.array(z.string().regex(/^ST-\d{3}$/)).default([]),
  llvm_status: SystemStatusSchema,
  tests_status: SystemStatusSchema,
  lint_status: SystemStatusSchema,
  context_fill_at_start: z.number().min(0).max(100),
  context_fill_at_end: z.number().min(0).max(100),
  duration_minutes: z.number().min(0),
  cost_usd: z.number().min(0),
  adrs_created: z.array(z.string().regex(/^ADR-\d{3}$/)).default([]),
  created_at: z.string().datetime(),
});

export type ShiftReport = z.infer<typeof ShiftReportSchema>;
export type SystemStatus = z.infer<typeof SystemStatusSchema>;
