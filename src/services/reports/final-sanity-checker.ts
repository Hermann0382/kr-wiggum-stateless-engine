/**
 * FinalSanityChecker - TASK-050
 * Pre-deployment checklist verification
 */
import { constants } from 'node:fs';
import { access, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { createImplementationPlanManager } from '../../state/index.js';
import { runGuardrails } from '../guardrail/index.js';

/**
 * Check result status
 */
export type CheckStatus = 'pass' | 'fail' | 'warn' | 'skip';

/**
 * Individual sanity check result
 */
export interface SanityCheck {
  name: string;
  status: CheckStatus;
  message: string;
  details?: string[];
}

/**
 * Sanity check category
 */
export interface SanityCheckCategory {
  category: string;
  checks: SanityCheck[];
  allPassing: boolean;
}

/**
 * Final sanity check result
 */
export interface FinalSanityResult {
  timestamp: string;
  duration: number;
  readyForDeployment: boolean;
  blockers: string[];
  warnings: string[];
  categories: SanityCheckCategory[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    skipped: number;
  };
}

/**
 * Sanity checker options
 */
export interface SanityCheckerOptions {
  basePath: string;
  skipTests?: boolean;
  skipGuardrails?: boolean;
}

/**
 * Check if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check required files exist
 */
async function checkRequiredFiles(basePath: string): Promise<SanityCheck[]> {
  const checks: SanityCheck[] = [];

  const requiredFiles = [
    { path: 'package.json', name: 'Package manifest' },
    { path: 'tsconfig.json', name: 'TypeScript config' },
    { path: 'README.md', name: 'README documentation', optional: true },
    { path: 'LICENSE', name: 'License file', optional: true },
  ];

  for (const file of requiredFiles) {
    const exists = await fileExists(join(basePath, file.path));
    checks.push({
      name: file.name,
      status: exists ? 'pass' : file.optional ? 'warn' : 'fail',
      message: exists
        ? `${file.path} exists`
        : `${file.path} ${file.optional ? 'missing (recommended)' : 'not found (required)'}`,
    });
  }

  return checks;
}

/**
 * Check source code structure
 */
async function checkSourceStructure(basePath: string): Promise<SanityCheck[]> {
  const checks: SanityCheck[] = [];

  // Check src directory exists
  const srcExists = await fileExists(join(basePath, 'src'));
  checks.push({
    name: 'Source directory',
    status: srcExists ? 'pass' : 'fail',
    message: srcExists ? 'src/ directory exists' : 'src/ directory not found',
  });

  // Check for index.ts entry point
  const indexExists = await fileExists(join(basePath, 'src', 'index.ts')) ||
    await fileExists(join(basePath, 'src', 'app.ts'));
  checks.push({
    name: 'Entry point',
    status: indexExists ? 'pass' : 'warn',
    message: indexExists
      ? 'Entry point file exists'
      : 'No index.ts or app.ts entry point found',
  });

  // Check for schemas
  const schemasExist = await fileExists(join(basePath, 'src', 'schemas'));
  checks.push({
    name: 'Schema definitions',
    status: schemasExist ? 'pass' : 'warn',
    message: schemasExist
      ? 'Zod schemas directory exists'
      : 'No schemas/ directory found',
  });

  return checks;
}

/**
 * Check dependencies
 */
async function checkDependencies(basePath: string): Promise<SanityCheck[]> {
  const checks: SanityCheck[] = [];

  try {
    const packageJson = JSON.parse(
      await readFile(join(basePath, 'package.json'), 'utf-8')
    );

    // Check for required dependencies
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    const requiredDeps = ['typescript', 'zod'];
    const missingDeps = requiredDeps.filter((dep) => !allDeps[dep]);

    checks.push({
      name: 'Required dependencies',
      status: missingDeps.length === 0 ? 'pass' : 'fail',
      message:
        missingDeps.length === 0
          ? 'All required dependencies present'
          : `Missing dependencies: ${missingDeps.join(', ')}`,
    });

    // Check for test framework
    const hasTestFramework = !!allDeps.vitest || !!allDeps.jest;
    checks.push({
      name: 'Test framework',
      status: hasTestFramework ? 'pass' : 'warn',
      message: hasTestFramework
        ? 'Test framework configured'
        : 'No test framework detected',
    });

    // Check for scripts
    const hasScripts = packageJson.scripts;
    const hasBuildScript = hasScripts?.build;
    const hasTestScript = hasScripts?.test;

    checks.push({
      name: 'Build script',
      status: hasBuildScript ? 'pass' : 'warn',
      message: hasBuildScript
        ? 'Build script configured'
        : 'No build script in package.json',
    });

    checks.push({
      name: 'Test script',
      status: hasTestScript ? 'pass' : 'warn',
      message: hasTestScript
        ? 'Test script configured'
        : 'No test script in package.json',
    });
  } catch {
    checks.push({
      name: 'Package analysis',
      status: 'fail',
      message: 'Could not read package.json',
    });
  }

  return checks;
}

/**
 * Check task completion
 */
async function checkTaskCompletion(basePath: string): Promise<SanityCheck[]> {
  const checks: SanityCheck[] = [];

  try {
    const planManager = createImplementationPlanManager(basePath);
    const progress = await planManager.getProgress();

    const completionRate = progress.total > 0
      ? Math.round((progress.completed / progress.total) * 100)
      : 100;

    checks.push({
      name: 'Task completion',
      status: completionRate === 100 ? 'pass' : completionRate >= 90 ? 'warn' : 'fail',
      message: `${completionRate}% of tasks completed (${progress.completed}/${progress.total})`,
      details:
        progress.remaining > 0
          ? [`${progress.remaining} tasks remaining`]
          : undefined,
    });

    // Check for unchecked tasks (potential blockers)
    const planContent = await planManager.read();
    const parsedTasks = planManager.parseTasks(planContent);
    const uncheckedTasks = parsedTasks.filter((t) => !t.checked);

    if (uncheckedTasks.length > 0 && progress.remaining > 0) {
      checks.push({
        name: 'Pending tasks',
        status: 'warn',
        message: `${uncheckedTasks.length} tasks not yet completed`,
        details: uncheckedTasks.slice(0, 5).map((t) => `${t.id}: ${t.title}`),
      });
    }
  } catch {
    checks.push({
      name: 'Task completion',
      status: 'skip',
      message: 'No implementation plan found',
    });
  }

  return checks;
}

/**
 * Check code quality via guardrails
 */
async function checkCodeQuality(
  basePath: string,
  skipGuardrails: boolean
): Promise<SanityCheck[]> {
  const checks: SanityCheck[] = [];

  if (skipGuardrails) {
    checks.push({
      name: 'Guardrails',
      status: 'skip',
      message: 'Guardrail checks skipped',
    });
    return checks;
  }

  try {
    const result = await runGuardrails({
      basePath,
      updateTelemetry: false,
    });

    checks.push({
      name: 'TypeScript compilation',
      status: result.typescript.passed ? 'pass' : 'fail',
      message: result.typescript.passed
        ? 'TypeScript compiles without errors'
        : `${result.typescript.errorCount} compilation errors`,
    });

    checks.push({
      name: 'Test suite',
      status: result.tests.passed ? 'pass' : 'fail',
      message: result.tests.passed
        ? `Tests passing (${result.tests.testsPassed}/${result.tests.testsTotal})`
        : `${result.tests.testsFailed} tests failing`,
    });

    checks.push({
      name: 'KR Standards',
      status: result.krStandards.passed ? 'pass' : 'warn',
      message: result.krStandards.passed
        ? 'Meets KR coding standards'
        : `${result.krStandards.errorCount} standard violations`,
    });
  } catch (error) {
    checks.push({
      name: 'Code quality',
      status: 'fail',
      message: `Guardrail check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }

  return checks;
}

/**
 * Check documentation
 */
async function checkDocumentation(basePath: string): Promise<SanityCheck[]> {
  const checks: SanityCheck[] = [];

  // Check for README
  const readmeExists = await fileExists(join(basePath, 'README.md'));
  if (readmeExists) {
    const readme = await readFile(join(basePath, 'README.md'), 'utf-8');
    const hasInstallSection = readme.toLowerCase().includes('install');
    const hasUsageSection = readme.toLowerCase().includes('usage');

    checks.push({
      name: 'README content',
      status: hasInstallSection && hasUsageSection ? 'pass' : 'warn',
      message:
        hasInstallSection && hasUsageSection
          ? 'README has install and usage sections'
          : 'README may be incomplete',
      details: [
        hasInstallSection ? '✓ Has installation section' : '✗ Missing installation section',
        hasUsageSection ? '✓ Has usage section' : '✗ Missing usage section',
      ],
    });
  } else {
    checks.push({
      name: 'README',
      status: 'warn',
      message: 'No README.md found',
    });
  }

  // Check for CHANGELOG
  const changelogExists = await fileExists(join(basePath, 'CHANGELOG.md'));
  checks.push({
    name: 'Changelog',
    status: changelogExists ? 'pass' : 'warn',
    message: changelogExists
      ? 'CHANGELOG.md exists'
      : 'No CHANGELOG.md found (recommended)',
  });

  return checks;
}

/**
 * Run all sanity checks
 */
export async function runFinalSanityCheck(
  options: SanityCheckerOptions
): Promise<FinalSanityResult> {
  const { basePath, skipTests = false, skipGuardrails = false } = options;
  const startTime = Date.now();

  // Run all check categories
  const [
    fileChecks,
    structureChecks,
    depChecks,
    taskChecks,
    qualityChecks,
    docChecks,
  ] = await Promise.all([
    checkRequiredFiles(basePath),
    checkSourceStructure(basePath),
    checkDependencies(basePath),
    checkTaskCompletion(basePath),
    checkCodeQuality(basePath, skipGuardrails),
    checkDocumentation(basePath),
  ]);

  const categories: SanityCheckCategory[] = [
    {
      category: 'Required Files',
      checks: fileChecks,
      allPassing: fileChecks.every((c) => c.status === 'pass'),
    },
    {
      category: 'Source Structure',
      checks: structureChecks,
      allPassing: structureChecks.every((c) => c.status === 'pass'),
    },
    {
      category: 'Dependencies',
      checks: depChecks,
      allPassing: depChecks.every((c) => c.status === 'pass'),
    },
    {
      category: 'Task Completion',
      checks: taskChecks,
      allPassing: taskChecks.every((c) => c.status === 'pass'),
    },
    {
      category: 'Code Quality',
      checks: qualityChecks,
      allPassing: qualityChecks.every((c) => c.status === 'pass'),
    },
    {
      category: 'Documentation',
      checks: docChecks,
      allPassing: docChecks.every((c) => c.status === 'pass'),
    },
  ];

  // Calculate summary
  const allChecks = categories.flatMap((c) => c.checks);
  const summary = {
    total: allChecks.length,
    passed: allChecks.filter((c) => c.status === 'pass').length,
    failed: allChecks.filter((c) => c.status === 'fail').length,
    warnings: allChecks.filter((c) => c.status === 'warn').length,
    skipped: allChecks.filter((c) => c.status === 'skip').length,
  };

  // Extract blockers and warnings
  const blockers = allChecks
    .filter((c) => c.status === 'fail')
    .map((c) => c.message);

  const warnings = allChecks
    .filter((c) => c.status === 'warn')
    .map((c) => c.message);

  const duration = Date.now() - startTime;

  return {
    timestamp: new Date().toISOString(),
    duration,
    readyForDeployment: summary.failed === 0,
    blockers,
    warnings,
    categories,
    summary,
  };
}

/**
 * Generate markdown report
 */
export function generateSanityReport(result: FinalSanityResult): string {
  const lines: string[] = [];

  const statusEmoji = result.readyForDeployment ? '✅' : '❌';
  lines.push(`# Final Sanity Check ${statusEmoji}`);
  lines.push('');
  lines.push(`**Timestamp:** ${result.timestamp}`);
  lines.push(`**Duration:** ${result.duration}ms`);
  lines.push(`**Status:** ${result.readyForDeployment ? 'Ready for deployment' : 'Not ready'}`);
  lines.push('');

  lines.push('## Summary');
  lines.push('');
  lines.push(`| Status | Count |`);
  lines.push(`|--------|-------|`);
  lines.push(`| ✅ Passed | ${result.summary.passed} |`);
  lines.push(`| ❌ Failed | ${result.summary.failed} |`);
  lines.push(`| ⚠️ Warnings | ${result.summary.warnings} |`);
  lines.push(`| ⏭️ Skipped | ${result.summary.skipped} |`);
  lines.push('');

  if (result.blockers.length > 0) {
    lines.push('## Blockers (Must Fix)');
    lines.push('');
    for (const blocker of result.blockers) {
      lines.push(`- ❌ ${blocker}`);
    }
    lines.push('');
  }

  if (result.warnings.length > 0) {
    lines.push('## Warnings (Recommended)');
    lines.push('');
    for (const warning of result.warnings) {
      lines.push(`- ⚠️ ${warning}`);
    }
    lines.push('');
  }

  lines.push('## Detailed Results');
  lines.push('');

  for (const category of result.categories) {
    const emoji = category.allPassing ? '✅' : '⚠️';
    lines.push(`### ${emoji} ${category.category}`);
    lines.push('');

    for (const check of category.checks) {
      const statusIcon =
        check.status === 'pass'
          ? '✅'
          : check.status === 'fail'
            ? '❌'
            : check.status === 'warn'
              ? '⚠️'
              : '⏭️';
      lines.push(`- ${statusIcon} **${check.name}**: ${check.message}`);

      if (check.details && check.details.length > 0) {
        for (const detail of check.details) {
          lines.push(`  - ${detail}`);
        }
      }
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('🏁 Generated by KR-Wiggum Final Sanity Checker');

  return lines.join('\n');
}

/**
 * Create sanity checker (factory function)
 */
export function createFinalSanityChecker(basePath: string) {
  return {
    run: (options?: { skipTests?: boolean; skipGuardrails?: boolean }) =>
      runFinalSanityCheck({ basePath, ...options }),
    generateReport: generateSanityReport,
  };
}
