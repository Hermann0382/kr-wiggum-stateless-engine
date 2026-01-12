/**
 * Guardrail-related TypeScript types
 * For back-pressure enforcement and quality gates
 */
import type { GuardrailStatus, ErrorType } from '../schemas/index.js';

/**
 * Individual check result
 */
export interface CheckResult {
  name: string;
  passed: boolean;
  exitCode: number;
  duration: number;
  errorCount: number;
  warningCount: number;
  output: string;
  truncatedOutput: string;
}

/**
 * TypeScript compiler check result
 */
export interface TypeScriptCheckResult extends CheckResult {
  name: 'typescript';
  errors: TypeScriptError[];
}

/**
 * TypeScript error detail
 */
export interface TypeScriptError {
  file: string;
  line: number;
  column: number;
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Test check result
 */
export interface TestCheckResult extends CheckResult {
  name: 'test';
  testsTotal: number;
  testsPassed: number;
  testsFailed: number;
  testsSkipped: number;
  coverage: CoverageReport | null;
}

/**
 * Coverage report
 */
export interface CoverageReport {
  lines: CoverageMetric;
  functions: CoverageMetric;
  branches: CoverageMetric;
  statements: CoverageMetric;
  meetsThreshold: boolean;
}

/**
 * Coverage metric
 */
export interface CoverageMetric {
  total: number;
  covered: number;
  percent: number;
  threshold: number;
}

/**
 * ESLint check result
 */
export interface LintCheckResult extends CheckResult {
  name: 'lint';
  fixableErrorCount: number;
  fixableWarningCount: number;
  files: LintFileResult[];
}

/**
 * Lint file result
 */
export interface LintFileResult {
  filePath: string;
  errorCount: number;
  warningCount: number;
  messages: LintMessage[];
}

/**
 * Lint message
 */
export interface LintMessage {
  line: number;
  column: number;
  ruleId: string;
  message: string;
  severity: 'error' | 'warning';
  fix?: {
    range: [number, number];
    text: string;
  };
}

/**
 * KreativReason standards check result
 */
export interface KRStandardsCheckResult extends CheckResult {
  name: 'kr-standards';
  checks: KRStandardCheck[];
}

/**
 * Individual KR standard check
 */
export interface KRStandardCheck {
  rule: string;
  description: string;
  passed: boolean;
  violations: string[];
}

/**
 * Unified guardrail result
 */
export interface GuardrailResult {
  status: GuardrailStatus;
  timestamp: Date;
  duration: number;
  typescript: TypeScriptCheckResult;
  tests: TestCheckResult;
  lint: LintCheckResult;
  krStandards: KRStandardsCheckResult;
  allPassing: boolean;
  blocksProgress: boolean;
}

/**
 * Guardrail configuration
 */
export interface GuardrailConfig {
  typescript: {
    enabled: boolean;
    strict: boolean;
  };
  tests: {
    enabled: boolean;
    coverageThreshold: {
      lines: number;
      functions: number;
      branches: number;
      statements: number;
    };
  };
  lint: {
    enabled: boolean;
    autoFix: boolean;
  };
  krStandards: {
    enabled: boolean;
    rules: string[];
  };
}
