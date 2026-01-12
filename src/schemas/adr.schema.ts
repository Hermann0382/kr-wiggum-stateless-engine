/**
 * Zod schema for ADR entity (ENT-006)
 * Architecture Decision Record with keywords for RipGrep
 */
import { z } from 'zod';

export const ADRSchema = z.object({
  id: z.string().regex(/^ADR-\d{3}$/), // ADR-001 format
  project_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  decision: z.string().min(10).max(2000),
  rationale: z.string().min(50).max(5000), // Min 50 chars for meaningful rationale
  keywords: z.array(z.string().min(2)).min(1), // For RipGrep optimization
  status: z.enum(['proposed', 'accepted', 'deprecated', 'superseded']),
  commit_hash: z.string().length(40).optional(), // Git commit hash
  supersedes: z.string().regex(/^ADR-\d{3}$/).optional(),
  superseded_by: z.string().regex(/^ADR-\d{3}$/).optional(),
  created_at: z.string().datetime(),
  created_by: z.enum(['manager', 'worker', 'human']),
});

export type ADR = z.infer<typeof ADRSchema>;
