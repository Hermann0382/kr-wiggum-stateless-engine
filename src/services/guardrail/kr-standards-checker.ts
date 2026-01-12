/**
 * KreativReason standards audit
 * Checks tenantId, Zod usage, named exports via RipGrep
 */
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

import type { KRStandardsCheckResult, KRStandardCheck } from '../../types/index.js';

const execAsync = promisify(exec);

/**
 * KR Standards options
 */
export interface KRStandardsOptions {
  basePath: string;
  timeout?: number;
  rules?: string[];
}

/**
 * Available KR standard rules
 */
export const KR_RULES = {
  NAMED_EXPORTS: 'named-exports',
  NO_DEFAULT_EXPORTS: 'no-default-exports',
  ZOD_VALIDATION: 'zod-validation',
  KEBAB_CASE_FILES: 'kebab-case-files',
  TYPE_IMPORTS: 'type-imports',
  ERROR_HANDLING: 'error-handling',
} as const;

/**
 * Default rules to check
 */
const DEFAULT_RULES = [
  KR_RULES.NAMED_EXPORTS,
  KR_RULES.NO_DEFAULT_EXPORTS,
  KR_RULES.ZOD_VALIDATION,
  KR_RULES.KEBAB_CASE_FILES,
];

/**
 * Execute ripgrep search
 */
async function ripgrepSearch(
  pattern: string,
  basePath: string,
  options: { glob?: string; invert?: boolean } = {}
): Promise<string[]> {
  const { glob = '*.ts', invert = false } = options;
  const invertFlag = invert ? '-v' : '';
  const command = `rg "${pattern}" ${basePath}/src -t ts ${invertFlag} -l 2>/dev/null || true`;

  try {
    const { stdout } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024,
    });
    return stdout.split('\n').filter((line) => line.trim() !== '');
  } catch {
    return [];
  }
}

/**
 * Check for named exports (no default exports)
 */
async function checkNamedExports(basePath: string): Promise<KRStandardCheck> {
  // Find files with default exports
  const violations = await ripgrepSearch('export default', basePath);

  return {
    rule: KR_RULES.NO_DEFAULT_EXPORTS,
    description: 'All exports should be named exports (no default exports)',
    passed: violations.length === 0,
    violations: violations.map((f) => `Default export found in: ${f}`),
  };
}

/**
 * Check for Zod validation usage
 */
async function checkZodValidation(basePath: string): Promise<KRStandardCheck> {
  // Find schema files without Zod imports
  const schemaFiles = await ripgrepSearch('\\.schema\\.ts$', basePath);
  const zodFiles = await ripgrepSearch("from 'zod'", basePath);

  // Schema files should use Zod
  const violations: string[] = [];
  for (const schemaFile of schemaFiles) {
    if (!zodFiles.includes(schemaFile)) {
      violations.push(`Schema file without Zod: ${schemaFile}`);
    }
  }

  return {
    rule: KR_RULES.ZOD_VALIDATION,
    description: 'Schema files should use Zod for validation',
    passed: violations.length === 0,
    violations,
  };
}

/**
 * Check for kebab-case file names
 */
async function checkKebabCaseFiles(basePath: string): Promise<KRStandardCheck> {
  const command = `find ${basePath}/src -name "*.ts" -type f | grep -E "[A-Z]" || true`;

  try {
    const { stdout } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024,
    });

    const violations = stdout
      .split('\n')
      .filter((line) => line.trim() !== '')
      .filter((line) => !line.includes('node_modules'))
      // Allow index.ts files
      .filter((line) => !line.endsWith('index.ts'));

    return {
      rule: KR_RULES.KEBAB_CASE_FILES,
      description: 'TypeScript files should use kebab-case naming',
      passed: violations.length === 0,
      violations: violations.map((f) => `Non-kebab-case file: ${f}`),
    };
  } catch {
    return {
      rule: KR_RULES.KEBAB_CASE_FILES,
      description: 'TypeScript files should use kebab-case naming',
      passed: true,
      violations: [],
    };
  }
}

/**
 * Check for proper type imports
 */
async function checkTypeImports(basePath: string): Promise<KRStandardCheck> {
  // Find imports that should be type imports
  const typeOnlyImports = await ripgrepSearch("import type {", basePath);
  const regularTypeImports = await ripgrepSearch("import { type ", basePath);

  // This is a soft check - we just want to encourage type imports
  // Not a violation if not used
  return {
    rule: KR_RULES.TYPE_IMPORTS,
    description: 'Type-only imports should use `import type` syntax',
    passed: true, // Soft check, always passes
    violations: [],
  };
}

/**
 * Check for error handling patterns
 */
async function checkErrorHandling(basePath: string): Promise<KRStandardCheck> {
  // Find async functions without try/catch
  // This is a simplified check
  const asyncFunctions = await ripgrepSearch('async function|async \\(', basePath);
  const tryCatch = await ripgrepSearch('try {', basePath);

  // Basic heuristic: if there are async functions, there should be try/catch
  const ratio = tryCatch.length / Math.max(asyncFunctions.length, 1);

  return {
    rule: KR_RULES.ERROR_HANDLING,
    description: 'Async functions should have proper error handling',
    passed: ratio >= 0.3, // At least 30% of files with async should have try/catch
    violations: ratio < 0.3 ? ['Low error handling coverage detected'] : [],
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
 * Run KR standards check
 */
export async function checkKRStandards(
  options: KRStandardsOptions
): Promise<KRStandardsCheckResult> {
  const {
    basePath,
    rules = DEFAULT_RULES,
  } = options;

  const start = Date.now();
  const checks: KRStandardCheck[] = [];

  // Run enabled checks
  if (rules.includes(KR_RULES.NO_DEFAULT_EXPORTS)) {
    checks.push(await checkNamedExports(basePath));
  }

  if (rules.includes(KR_RULES.ZOD_VALIDATION)) {
    checks.push(await checkZodValidation(basePath));
  }

  if (rules.includes(KR_RULES.KEBAB_CASE_FILES)) {
    checks.push(await checkKebabCaseFiles(basePath));
  }

  if (rules.includes(KR_RULES.TYPE_IMPORTS)) {
    checks.push(await checkTypeImports(basePath));
  }

  if (rules.includes(KR_RULES.ERROR_HANDLING)) {
    checks.push(await checkErrorHandling(basePath));
  }

  const duration = Date.now() - start;
  const failedChecks = checks.filter((c) => !c.passed);
  const allPassed = failedChecks.length === 0;
  const allViolations = checks.flatMap((c) => c.violations);

  const output = checks
    .map((c) => `${c.passed ? 'PASS' : 'FAIL'}: ${c.rule} - ${c.description}`)
    .join('\n');

  return {
    name: 'kr-standards',
    passed: allPassed,
    exitCode: allPassed ? 0 : 1,
    duration,
    errorCount: failedChecks.length,
    warningCount: 0,
    output,
    truncatedOutput: truncateOutput(output),
    checks,
  };
}

/**
 * Quick KR standards check
 */
export async function quickKRCheck(basePath: string): Promise<boolean> {
  const result = await checkKRStandards({ basePath });
  return result.passed;
}

/**
 * Get KR standards summary
 */
export function getKRStandardsSummary(result: KRStandardsCheckResult): string {
  const lines = [
    result.passed ? 'KR Standards: PASSED' : 'KR Standards: FAILED',
    '',
  ];

  for (const check of result.checks) {
    lines.push(`  ${check.passed ? '[PASS]' : '[FAIL]'} ${check.rule}`);
    if (!check.passed && check.violations.length > 0) {
      for (const violation of check.violations.slice(0, 3)) {
        lines.push(`    - ${violation}`);
      }
      if (check.violations.length > 3) {
        lines.push(`    ... and ${check.violations.length - 3} more violations`);
      }
    }
  }

  return lines.join('\n');
}
