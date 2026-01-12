/**
 * Zod schema for PRD entity (ENT-002)
 * Product Requirements Document - immutable once approved
 */
import { z } from 'zod';

export const PRDSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  file_path: z.string().min(1),
  content_hash: z.string().length(64), // SHA-256 hash
  user_stories_count: z.number().int().min(0),
  is_immutable: z.boolean().default(false),
  created_at: z.string().datetime(),
  approved_at: z.string().datetime().optional(),
  approved_by: z.string().email().optional(),
});

export type PRD = z.infer<typeof PRDSchema>;
