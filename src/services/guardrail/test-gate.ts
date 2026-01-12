/**
 * Unit test verification
 * Runs vitest, enforces coverage (>90% services, >80% controllers)
 */
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

import type { TestCheckResult, CoverageReport, CoverageMetric } from '../../types/index.js';

const execAsync = promisify(exec);

/**
 * Test gate options
 */
export interface TestGateOptions {
  basePath: string;
  coverage?: boolean;
  timeout?: number;
  pattern?: string;
  coverageThresholds?: {
    lines?: number;
    functions?: number;
    branches?: number;
    statements?: number;
  };
}

/**
 * Default coverage thresholds
 */
const DEFAULT_THRESHOLDS = {
  lines: 80,
  functions: 80,
  branches: 80,
  statements: 80,
};

/**
 * Parse test results from vitest output
 */
function parseTestResults(output: string): {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
} {
  // Parse vitest output format
  const totalMatch = output.match(/Tests\s+(\d+)\s+(passed|failed)/);
  const passedMatch = output.match(/(\d+)\s+passed/);
  const failedMatch = output.match(/(\d+)\s+failed/);
  const skippedMatch = output.match(/(\d+)\s+skipped/);

  return {
    total: parseInt(totalMatch?.[1] ?? '0', 10),
    passed: parseInt(passedMatch?.[1] ?? '0', 10),
    failed: parseInt(failedMatch?.[1] ?? '0', 10),
    skipped: parseInt(skippedMatch?.[1] ?? '0', 10),
  };
}

/**
 * Parse coverage from vitest output
 */
function parseCoverageReport(
  output: string,
  thresholds: typeof DEFAULT_THRESHOLDS
): CoverageReport | null {
  // Look for coverage summary in output
  const coverageMatch = output.match(/All files[^|]*\|\s*([0-9.]+)\s*\|\s*([0-9.]+)\s*\|\s*([0-9.]+)\s*\|\s*([0-9.]+)/);

  if (coverageMatch === null) {
    return null;
  }

  const statements = parseFloat(coverageMatch[1] ?? '0');
  const branches = parseFloat(coverageMatch[2] ?? '0');
  const functions = parseFloat(coverageMatch[3] ?? '0');
  const lines = parseFloat(coverageMatch[4] ?? '0');

  const createMetric = (percent: number, threshold: number): CoverageMetric => ({
    total: 100,
    covered: percent,
    percent,
    threshold,
  });

  const meetsThreshold =
    lines >= thresholds.lines &&
    functions >= thresholds.functions &&
    branches >= thresholds.branches &&
    statements >= thresholds.statements;

  return {
    lines: createMetric(lines, thresholds.lines),
    functions: createMetric(functions, thresholds.functions),
    branches: createMetric(branches, thresholds.branches),
    statements: createMetric(statements, thresholds.statements),
    meetsThreshold,
  };
}

/**
 * Truncate output to max length
 */
function truncateOutput(output: string, maxLength: number = 4000): string {
  if (output.length <= maxLength) {
    return output;
  }
  return output.slice(0, maxLength - 50) + '\n... [truncated] ...';
}

/**
 * Run test gate verification
 */
export async function runTestGate(options: TestGateOptions): Promise<TestCheckResult> {
  const {
    basePath,
    coverage = true,
    timeout = 120000,
    pattern,
    coverageThresholds,
  } = options;

  // Merge with defaults to ensure all properties are defined
  const thresholds = { ...DEFAULT_THRESHOLDS, ...coverageThresholds };

  const start = Date.now();

  // Build command
  let command = 'npx vitest run';
  if (coverage) {
    command += ' --coverage';
  }
  if (pattern !== undefined) {
    command += ` ${pattern}`;
  }

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: basePath,
      timeout,
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, CI: 'true' },
    });

    const output = stdout + stderr;
    const duration = Date.now() - start;
    const testResults = parseTestResults(output);
    const coverageReport = coverage
      ? parseCoverageReport(output, thresholds)
      : null;

    return {
      name: 'test',
      passed: true,
      exitCode: 0,
      duration,
      errorCount: 0,
      warningCount: 0,
      output,
      truncatedOutput: truncateOutput(output),
      testsTotal: testResults.total,
      testsPassed: testResults.passed,
      testsFailed: testResults.failed,
      testsSkipped: testResults.skipped,
      coverage: coverageReport,
    };
  } catch (error) {
    const execError = error as {
      code?: number;
      stdout?: string;
      stderr?: string;
    };

    const output = (execError.stdout ?? '') + (execError.stderr ?? '');
    const duration = Date.now() - start;
    const testResults = parseTestResults(output);
    const coverageReport = coverage
      ? parseCoverageReport(output, thresholds)
      : null;

    return {
      name: 'test',
      passed: false,
      exitCode: execError.code ?? 1,
      duration,
      errorCount: testResults.failed,
      warningCount: 0,
      output,
      truncatedOutput: truncateOutput(output),
      testsTotal: testResults.total,
      testsPassed: testResults.passed,
      testsFailed: testResults.failed,
      testsSkipped: testResults.skipped,
      coverage: coverageReport,
    };
  }
}

/**
 * Quick test run (no coverage)
 */
export async function quickTest(basePath: string): Promise<boolean> {
  const result = await runTestGate({ basePath, coverage: false });
  return result.passed;
}

/**
 * Get test summary from result
 */
export function getTestSummary(result: TestCheckResult): string {
  const lines = [
    result.passed ? 'Tests passed' : 'Tests failed',
    `  Total: ${result.testsTotal}`,
    `  Passed: ${result.testsPassed}`,
    `  Failed: ${result.testsFailed}`,
    `  Skipped: ${result.testsSkipped}`,
  ];

  if (result.coverage !== null) {
    lines.push(
      '',
      'Coverage:',
      `  Lines: ${result.coverage.lines.percent.toFixed(1)}% (threshold: ${result.coverage.lines.threshold}%)`,
      `  Functions: ${result.coverage.functions.percent.toFixed(1)}% (threshold: ${result.coverage.functions.threshold}%)`,
      `  Branches: ${result.coverage.branches.percent.toFixed(1)}% (threshold: ${result.coverage.branches.threshold}%)`,
      `  Statements: ${result.coverage.statements.percent.toFixed(1)}% (threshold: ${result.coverage.statements.threshold}%)`,
      '',
      result.coverage.meetsThreshold
        ? '  Coverage thresholds: MET'
        : '  Coverage thresholds: NOT MET'
    );
  }

  return lines.join('\n');
}
