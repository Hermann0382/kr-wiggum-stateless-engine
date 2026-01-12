/**
 * Zod schema for Telemetry entity (ENT-009)
 * Real-time agent status with context zone detection
 */
import { z } from 'zod';

export const AgentTypeSchema = z.enum(['manager', 'worker']);

export const ContextZoneSchema = z.enum([
  'smart',     // 0-40% context fill
  'degrading', // 40-60% context fill
  'dumb',      // 60%+ context fill
]);

export const GuardrailStatusSchema = z.enum([
  'all_passing',
  'tests_failing',
  'compiler_failing',
  'lint_failing',
  'multiple_failing',
]);

export const TelemetrySchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  session_id: z.string().uuid(),
  agent_type: AgentTypeSchema,
  context_fill_percent: z.number().min(0).max(100),
  zone: ContextZoneSchema,
  guardrail_status: GuardrailStatusSchema,
  current_task_id: z.string().regex(/^ST-\d{3}$/).optional(),
  tokens_used: z.number().int().min(0),
  tokens_remaining: z.number().int().min(0),
  heartbeat_at: z.string().datetime(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Telemetry = z.infer<typeof TelemetrySchema>;
export type AgentType = z.infer<typeof AgentTypeSchema>;
export type ContextZone = z.infer<typeof ContextZoneSchema>;
export type GuardrailStatus = z.infer<typeof GuardrailStatusSchema>;
