/**
 * Guardrail orchestrator
 * Runs all checks, returns unified status, updates telemetry
 */
import type { GuardrailStatus } from '../../schemas/index.js';
import { createTelemetryManager } from '../../state/index.js';
import type {
  GuardrailResult,
  GuardrailConfig,
  TypeScriptCheckResult,
  TestCheckResult,
  KRStandardsCheckResult,
} from '../../types/index.js';
import {
  verifyCompilation,
  quickTypeCheck,
  getErrorSummary as getTypeScriptSummary,
  type CompilerVerifyOptions,
} from './compiler-verifier.js';
import {
  runTestGate,
  quickTest,
  getTestSummary,
  type TestGateOptions,
} from './test-gate.js';
import {
  checkKRStandards,
  quickKRCheck,
  getKRStandardsSummary,
  KR_RULES,
  type KRStandardsOptions,
} from './kr-standards-checker.js';

// Re-export sub-modules
export * from './compiler-verifier.js';
export * from './test-gate.js';
export * from './kr-standards-checker.js';

/**
 * Guardrail options
 */
export interface GuardrailOptions {
  basePath: string;
  updateTelemetry?: boolean;
  config?: Partial<GuardrailConfig>;
}

/**
 * Default guardrail configuration
 */
const DEFAULT_CONFIG: GuardrailConfig = {
  typescript: {
    enabled: true,
    strict: true,
  },
  tests: {
    enabled: true,
    coverageThreshold: {
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
  },
  lint: {
    enabled: true,
    autoFix: false,
  },
  krStandards: {
    enabled: true,
    rules: [
      KR_RULES.NAMED_EXPORTS,
      KR_RULES.NO_DEFAULT_EXPORTS,
      KR_RULES.ZOD_VALIDATION,
      KR_RULES.KEBAB_CASE_FILES,
    ],
  },
};

/**
 * Determine overall guardrail status from individual results
 */
function determineStatus(
  typescript: TypeScriptCheckResult,
  tests: TestCheckResult,
  krStandards: KRStandardsCheckResult
): GuardrailStatus {
  const failures: string[] = [];

  if (!typescript.passed) {
    failures.push('compiler');
  }
  if (!tests.passed) {
    failures.push('tests');
  }
  // KR Standards is a soft check, doesn't block

  if (failures.length === 0) {
    return 'all_passing';
  }
  if (failures.length > 1) {
    return 'multiple_failing';
  }
  if (failures.includes('compiler')) {
    return 'compiler_failing';
  }
  if (failures.includes('tests')) {
    return 'tests_failing';
  }

  return 'all_passing';
}

/**
 * Create a placeholder lint result (lint is handled by eslint)
 */
function createLintResult(): {
  name: 'lint';
  passed: boolean;
  exitCode: number;
  duration: number;
  errorCount: number;
  warningCount: number;
  output: string;
  truncatedOutput: string;
  fixableErrorCount: number;
  fixableWarningCount: number;
  files: never[];
} {
  return {
    name: 'lint',
    passed: true,
    exitCode: 0,
    duration: 0,
    errorCount: 0,
    warningCount: 0,
    output: 'Lint check skipped (use npm run lint)',
    truncatedOutput: 'Lint check skipped',
    fixableErrorCount: 0,
    fixableWarningCount: 0,
    files: [],
  };
}

/**
 * Run all guardrail checks
 */
export async function runGuardrails(options: GuardrailOptions): Promise<GuardrailResult> {
  const {
    basePath,
    updateTelemetry = true,
    config = {},
  } = options;

  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const start = Date.now();

  // Run checks in parallel where possible
  const [typescript, tests, krStandards] = await Promise.all([
    mergedConfig.typescript.enabled
      ? verifyCompilation({ basePath })
      : Promise.resolve<TypeScriptCheckResult>({
          name: 'typescript',
          passed: true,
          exitCode: 0,
          duration: 0,
          errorCount: 0,
          warningCount: 0,
          output: 'Skipped',
          truncatedOutput: 'Skipped',
          errors: [],
        }),
    mergedConfig.tests.enabled
      ? runTestGate({
          basePath,
          coverageThresholds: mergedConfig.tests.coverageThreshold,
        })
      : Promise.resolve<TestCheckResult>({
          name: 'test',
          passed: true,
          exitCode: 0,
          duration: 0,
          errorCount: 0,
          warningCount: 0,
          output: 'Skipped',
          truncatedOutput: 'Skipped',
          testsTotal: 0,
          testsPassed: 0,
          testsFailed: 0,
          testsSkipped: 0,
          coverage: null,
        }),
    mergedConfig.krStandards.enabled
      ? checkKRStandards({ basePath, rules: mergedConfig.krStandards.rules })
      : Promise.resolve<KRStandardsCheckResult>({
          name: 'kr-standards',
          passed: true,
          exitCode: 0,
          duration: 0,
          errorCount: 0,
          warningCount: 0,
          output: 'Skipped',
          truncatedOutput: 'Skipped',
          checks: [],
        }),
  ]);

  const lint = createLintResult();
  const duration = Date.now() - start;
  const status = determineStatus(typescript, tests, krStandards);
  const allPassing = typescript.passed && tests.passed;
  const blocksProgress = !allPassing;

  // Update telemetry if requested
  if (updateTelemetry) {
    try {
      const telemetryManager = createTelemetryManager(basePath);
      await telemetryManager.updateGuardrailStatus(status);
    } catch {
      // Telemetry update failed, continue
    }
  }

  return {
    status,
    timestamp: new Date(),
    duration,
    typescript,
    tests,
    lint,
    krStandards,
    allPassing,
    blocksProgress,
  };
}

/**
 * Quick guardrail check (TypeScript only)
 */
export async function quickGuardrailCheck(basePath: string): Promise<boolean> {
  return quickTypeCheck(basePath);
}

/**
 * Get full guardrail summary
 */
export function getGuardrailSummary(result: GuardrailResult): string {
  const statusEmoji = result.allPassing ? 'PASS' : 'FAIL';
  const lines = [
    `Guardrails: ${statusEmoji}`,
    `Status: ${result.status}`,
    `Duration: ${result.duration}ms`,
    '',
    '--- TypeScript ---',
    getTypeScriptSummary(result.typescript),
    '',
    '--- Tests ---',
    getTestSummary(result.tests),
    '',
    '--- KR Standards ---',
    getKRStandardsSummary(result.krStandards),
  ];

  if (result.blocksProgress) {
    lines.push(
      '',
      '*** PROGRESS BLOCKED ***',
      'Fix the failing checks before continuing.'
    );
  }

  return lines.join('\n');
}

/**
 * Check if guardrails are blocking
 */
export function isBlocking(result: GuardrailResult): boolean {
  return result.blocksProgress;
}

/**
 * Get blocking reasons
 */
export function getBlockingReasons(result: GuardrailResult): string[] {
  const reasons: string[] = [];

  if (!result.typescript.passed) {
    reasons.push(`TypeScript: ${result.typescript.errorCount} errors`);
  }
  if (!result.tests.passed) {
    reasons.push(`Tests: ${result.tests.testsFailed} failed`);
  }

  return reasons;
}
