/**
 * TypeScript compiler wrapper
 * Executes tsc, captures exit code and error output
 */
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

import type { TypeScriptCheckResult, TypeScriptError } from '../../types/index.js';

const execAsync = promisify(exec);

/**
 * Compiler verification options
 */
export interface CompilerVerifyOptions {
  basePath: string;
  strict?: boolean;
  noEmit?: boolean;
  timeout?: number;
}

/**
 * Parse TypeScript errors from output
 */
function parseTypeScriptErrors(output: string): TypeScriptError[] {
  const errors: TypeScriptError[] = [];
  const errorRegex = /(.+)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)/g;

  let match;
  while ((match = errorRegex.exec(output)) !== null) {
    errors.push({
      file: match[1] ?? '',
      line: parseInt(match[2] ?? '0', 10),
      column: parseInt(match[3] ?? '0', 10),
      code: match[4] ?? '',
      message: match[5] ?? '',
      severity: 'error',
    });
  }

  // Also check for warnings
  const warningRegex = /(.+)\((\d+),(\d+)\):\s+warning\s+(TS\d+):\s+(.+)/g;
  while ((match = warningRegex.exec(output)) !== null) {
    errors.push({
      file: match[1] ?? '',
      line: parseInt(match[2] ?? '0', 10),
      column: parseInt(match[3] ?? '0', 10),
      code: match[4] ?? '',
      message: match[5] ?? '',
      severity: 'warning',
    });
  }

  return errors;
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
 * Verify TypeScript compilation
 */
export async function verifyCompilation(
  options: CompilerVerifyOptions
): Promise<TypeScriptCheckResult> {
  const {
    basePath,
    noEmit = true,
    timeout = 60000,
  } = options;

  const start = Date.now();
  const command = noEmit ? 'npx tsc --noEmit' : 'npx tsc';

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: basePath,
      timeout,
      maxBuffer: 10 * 1024 * 1024,
    });

    const output = stdout + stderr;
    const duration = Date.now() - start;

    return {
      name: 'typescript',
      passed: true,
      exitCode: 0,
      duration,
      errorCount: 0,
      warningCount: 0,
      output,
      truncatedOutput: truncateOutput(output),
      errors: [],
    };
  } catch (error) {
    const execError = error as {
      code?: number;
      stdout?: string;
      stderr?: string;
    };

    const output = (execError.stdout ?? '') + (execError.stderr ?? '');
    const duration = Date.now() - start;
    const errors = parseTypeScriptErrors(output);

    const errorCount = errors.filter((e) => e.severity === 'error').length;
    const warningCount = errors.filter((e) => e.severity === 'warning').length;

    return {
      name: 'typescript',
      passed: false,
      exitCode: execError.code ?? 1,
      duration,
      errorCount,
      warningCount,
      output,
      truncatedOutput: truncateOutput(output),
      errors,
    };
  }
}

/**
 * Quick type check (no emit, fast)
 */
export async function quickTypeCheck(basePath: string): Promise<boolean> {
  const result = await verifyCompilation({ basePath, noEmit: true });
  return result.passed;
}

/**
 * Get error summary from result
 */
export function getErrorSummary(result: TypeScriptCheckResult): string {
  if (result.passed) {
    return 'TypeScript compilation successful';
  }

  const errorFiles = new Set(result.errors.map((e) => e.file));
  const summary = [
    `TypeScript compilation failed:`,
    `  ${result.errorCount} error(s), ${result.warningCount} warning(s)`,
    `  Files with errors: ${errorFiles.size}`,
  ];

  // Add first 3 errors
  const firstErrors = result.errors.slice(0, 3);
  for (const err of firstErrors) {
    summary.push(`  - ${err.file}:${err.line} ${err.code}: ${err.message}`);
  }

  if (result.errors.length > 3) {
    summary.push(`  ... and ${result.errors.length - 3} more errors`);
  }

  return summary.join('\n');
}
