/**
 * Zod schema for ImplementationPlan entity (ENT-004)
 * Roadmap with checkbox tasks ordered by dependency
 */
import { z } from 'zod';

export const DependencyOrderSchema = z.enum([
  'parallel',
  'sequential',
  'mixed',
]);

export const ImplementationPlanSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  file_path: z.string().min(1),
  content_hash: z.string().length(64),
  total_tasks: z.number().int().min(0),
  completed_tasks: z.number().int().min(0),
  progress_percent: z.number().min(0).max(100),
  dependency_order: DependencyOrderSchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  estimated_hours_remaining: z.number().min(0).optional(),
});

export type ImplementationPlan = z.infer<typeof ImplementationPlanSchema>;
export type DependencyOrder = z.infer<typeof DependencyOrderSchema>;
