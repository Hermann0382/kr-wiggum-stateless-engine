/**
 * Barrel export for state management services
 */

// Base file state manager
export {
  FileStateManager,
  calculateHash,
  readFileSafe,
  ensureDirectory,
  type FileStateOptions,
  type WatchCallback,
} from './file-state-manager.js';

// Project state manager (.agent/project.json)
export {
  ProjectStateManager,
  createProjectStateManager,
} from './project-state-manager.js';

// Implementation plan manager (IMPLEMENTATION_PLAN.md)
export {
  ImplementationPlanManager,
  createImplementationPlanManager,
  type ParsedTask,
  type ProgressSummary,
} from './implementation-plan-manager.js';

// Telemetry manager (.ralph/telemetry.json)
export {
  TelemetryManager,
  createTelemetryManager,
} from './telemetry-manager.js';

// ADR manager (.agent/ADR.md)
export {
  ADRManager,
  createADRManager,
  type ADREntry,
} from './adr-manager.js';

// Compiler error manager (LAST_COMPILER_ERROR.log)
export {
  CompilerErrorManager,
  createCompilerErrorManager,
  type CompilerErrorEntry,
  type ParsedCompilerError,
} from './compiler-error-manager.js';
