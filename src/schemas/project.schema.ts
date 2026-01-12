/**
 * Zod schema for Project entity (ENT-001)
 * The root aggregate for all project-related state
 */
import { z } from 'zod';

export const ProjectStatusSchema = z.enum([
  'planning',
  'active',
  'paused',
  'completed',
  'archived',
]);

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  owner_email: z.string().email(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  status: ProjectStatusSchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  cost_tracking: z.object({
    total_cost_usd: z.number().min(0),
    hourly_rate_usd: z.number().min(0).default(10.42),
    total_hours: z.number().min(0),
    last_session_cost_usd: z.number().min(0).optional(),
  }),
  specs_path: z.string().optional(),
  implementation_plan_path: z.string().optional(),
});

export type Project = z.infer<typeof ProjectSchema>;
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;
