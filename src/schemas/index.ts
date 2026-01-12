/**
 * Barrel export for all Zod schemas
 * All 11 entities from the ERD
 */

// ENT-001: Project
export {
  ProjectSchema,
  ProjectStatusSchema,
  type Project,
  type ProjectStatus,
} from './project.schema.js';

// ENT-002: PRD
export { PRDSchema, type PRD } from './prd.schema.js';

// ENT-003: Specification
export {
  SpecificationSchema,
  SpecificationTypeSchema,
  type Specification,
  type SpecificationType,
} from './specification.schema.js';

// ENT-004: ImplementationPlan
export {
  ImplementationPlanSchema,
  DependencyOrderSchema,
  type ImplementationPlan,
  type DependencyOrder,
} from './implementation-plan.schema.js';

// ENT-005: Task
export {
  TaskSchema,
  TaskStatusSchema,
  type Task,
  type TaskStatus,
} from './task.schema.js';

// ENT-006: ADR
export { ADRSchema, type ADR } from './adr.schema.js';

// ENT-007: ShiftReport
export {
  ShiftReportSchema,
  SystemStatusSchema,
  type ShiftReport,
  type SystemStatus,
} from './shift-report.schema.js';

// ENT-008: ShiftHandoff
export { ShiftHandoffSchema, type ShiftHandoff } from './shift-handoff.schema.js';

// ENT-009: Telemetry
export {
  TelemetrySchema,
  AgentTypeSchema,
  ContextZoneSchema,
  GuardrailStatusSchema,
  type Telemetry,
  type AgentType,
  type ContextZone,
  type GuardrailStatus,
} from './telemetry.schema.js';

// ENT-010: CompilerError
export {
  CompilerErrorSchema,
  ErrorTypeSchema,
  type CompilerError,
  type ErrorType,
} from './compiler-error.schema.js';

// ENT-011: StatusFragment
export { StatusFragmentSchema, type StatusFragment } from './status-fragment.schema.js';
