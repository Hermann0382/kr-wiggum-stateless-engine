/**
 * Zod schema for Specification entity (ENT-003)
 * Generic specification type supporting PRD, PIN, architecture, concepts
 */
import { z } from 'zod';

export const SpecificationTypeSchema = z.enum([
  'prd',
  'pin',
  'architecture',
  'concepts',
  'technical',
]);

export const SpecificationSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  type: SpecificationTypeSchema,
  title: z.string().min(1).max(255),
  file_path: z.string().min(1),
  content_hash: z.string().length(64),
  keywords: z.array(z.string()).min(1), // For RipGrep optimization
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  is_active: z.boolean().default(true),
});

export type Specification = z.infer<typeof SpecificationSchema>;
export type SpecificationType = z.infer<typeof SpecificationTypeSchema>;
