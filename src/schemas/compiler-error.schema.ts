/**
 * Zod schema for CompilerError entity (ENT-010)
 * Captured compiler/test output with truncation
 */
import { z } from 'zod';

export const ErrorTypeSchema = z.enum([
  'typescript',
  'eslint',
  'test',
  'runtime',
  'unknown',
]);

export const CompilerErrorSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  session_id: z.string().uuid(),
  task_id: z.string().regex(/^ST-\d{3}$/).optional(),
  error_type: ErrorTypeSchema,
  file_path: z.string().optional(),
  line_number: z.number().int().min(1).optional(),
  column_number: z.number().int().min(1).optional(),
  error_code: z.string().optional(),
  message: z.string().min(1),
  truncated_output: z.string().max(4000), // ~1000 tokens max
  full_output_path: z.string().optional(), // Path to full log if truncated
  is_cleared: z.boolean().default(false),
  cleared_at: z.string().datetime().optional(),
  created_at: z.string().datetime(),
});

export type CompilerError = z.infer<typeof CompilerErrorSchema>;
export type ErrorType = z.infer<typeof ErrorTypeSchema>;
