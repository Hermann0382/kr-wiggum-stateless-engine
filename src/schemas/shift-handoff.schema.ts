/**
 * Zod schema for ShiftHandoff entity (ENT-008)
 * Context transfer document for Manager rotation
 */
import { z } from 'zod';

export const ShiftHandoffSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  from_session_id: z.string().uuid(),
  to_session_id: z.string().uuid().optional(), // Set when next Manager picks up
  accomplishments: z.array(z.string().min(10)).min(1),
  architecture_delta: z.string().max(2000), // What changed architecturally
  blockers: z.array(
    z.object({
      task_id: z.string().regex(/^ST-\d{3}$/),
      description: z.string().min(10),
      suggested_resolution: z.string().optional(),
    })
  ).default([]),
  last_5_adrs: z.array(z.string().regex(/^ADR-\d{3}$/)).max(5), // Max 5 items
  next_priority_tasks: z.array(z.string().regex(/^ST-\d{3}$/)).max(10),
  context_fill_at_handoff: z.number().min(0).max(100),
  created_at: z.string().datetime(),
  picked_up_at: z.string().datetime().optional(),
});

export type ShiftHandoff = z.infer<typeof ShiftHandoffSchema>;
