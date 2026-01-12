/**
 * Barrel export for all TypeScript types
 */

// Project types
export type {
  ProjectState,
  CreateProjectInput,
  UpdateProjectInput,
  TaskProgressSummary,
  ProjectFilePaths,
  CostCalculation,
} from './project.types.js';

// Telemetry types
export type {
  ContextWindowConfig,
  TelemetryState,
  ZoneTransitionEvent,
  HeartbeatMessage,
  DashboardTelemetryUpdate,
} from './telemetry.types.js';

export { ZONE_COLORS, ZONE_THRESHOLDS } from './telemetry.types.js';

// Agent types
export type {
  ManagerSession,
  WorkerSession,
  AgentSpawnConfig,
  WorkerTaskAssignment,
  RotationTrigger,
  RalphWiggumLoopState,
  ProcessSpawnResult,
  ExitCode,
} from './agent.types.js';

export { EXIT_CODES } from './agent.types.js';

// Guardrail types
export type {
  CheckResult,
  TypeScriptCheckResult,
  TypeScriptError,
  TestCheckResult,
  CoverageReport,
  CoverageMetric,
  LintCheckResult,
  LintFileResult,
  LintMessage,
  KRStandardsCheckResult,
  KRStandardCheck,
  GuardrailResult,
  GuardrailConfig,
} from './guardrail.types.js';
