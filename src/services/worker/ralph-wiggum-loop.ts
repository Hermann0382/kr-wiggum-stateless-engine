/**
 * Edit-Build-Test-Fix cycle
 * Iterates until tests pass (exit 0), max 5 retry attempts
 */
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

import { createCompilerErrorManager } from '../../state/index.js';
import type { RalphWiggumLoopState } from '../../types/index.js';

const execAsync = promisify(exec);

/**
 * Loop configuration
 */
export interface LoopConfig {
  basePath: string;
  maxIterations?: number;
  buildCommand?: string;
  testCommand?: string;
  lintCommand?: string;
}

/**
 * Loop iteration result
 */
export interface LoopIterationResult {
  iteration: number;
  buildPassed: boolean;
  testsPassed: boolean;
  lintPassed: boolean;
  errors: string[];
  duration: number;
}

/**
 * Loop final result
 */
export interface LoopResult {
  success: boolean;
  iterations: number;
  finalState: RalphWiggumLoopState;
  reason: string;
}

/**
 * Execute a command and capture result
 */
async function executeCommand(
  command: string,
  cwd: string
): Promise<{ success: boolean; output: string; duration: number }> {
  const start = Date.now();

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout: 120000, // 2 minute timeout
      maxBuffer: 10 * 1024 * 1024,
    });
    return {
      success: true,
      output: stdout + stderr,
      duration: Date.now() - start,
    };
  } catch (error) {
    const execError = error as { stdout?: string; stderr?: string; code?: number };
    return {
      success: false,
      output: (execError.stdout ?? '') + (execError.stderr ?? ''),
      duration: Date.now() - start,
    };
  }
}

/**
 * Run the Ralph Wiggum Loop
 */
export async function runRalphWiggumLoop(config: LoopConfig): Promise<LoopResult> {
  const {
    basePath,
    maxIterations = 5,
    buildCommand = 'npm run build',
    testCommand = 'npm test',
    lintCommand = 'npm run lint',
  } = config;

  const errorManager = createCompilerErrorManager(basePath);

  const state: RalphWiggumLoopState = {
    iteration: 0,
    maxIterations,
    lastError: null,
    testsPass: false,
    compilerPass: false,
    filesModified: [],
  };

  for (let i = 0; i < maxIterations; i++) {
    state.iteration = i + 1;

    // Step 1: Build (TypeScript compilation)
    const buildResult = await executeCommand(buildCommand, basePath);
    state.compilerPass = buildResult.success;

    if (!buildResult.success) {
      state.lastError = buildResult.output;
      await errorManager.writeTypeScriptError(buildResult.output);
      continue;
    }

    // Step 2: Lint
    const lintResult = await executeCommand(lintCommand, basePath);
    if (!lintResult.success) {
      state.lastError = lintResult.output;
      await errorManager.writeLintError(lintResult.output);
      // Lint failures are warnings, continue to tests
    }

    // Step 3: Test
    const testResult = await executeCommand(testCommand, basePath);
    state.testsPass = testResult.success;

    if (testResult.success) {
      // All checks passed!
      await errorManager.clear();
      return {
        success: true,
        iterations: state.iteration,
        finalState: state,
        reason: `All checks passed after ${state.iteration} iteration(s)`,
      };
    }

    // Tests failed
    state.lastError = testResult.output;
    await errorManager.writeTestError(testResult.output);
  }

  // Max iterations reached
  return {
    success: false,
    iterations: state.iteration,
    finalState: state,
    reason: `Max iterations (${maxIterations}) reached without all checks passing`,
  };
}

/**
 * Run a single iteration of the loop
 */
export async function runSingleIteration(
  config: LoopConfig
): Promise<LoopIterationResult> {
  const {
    basePath,
    buildCommand = 'npm run build',
    testCommand = 'npm test',
    lintCommand = 'npm run lint',
  } = config;

  const errors: string[] = [];
  const start = Date.now();

  // Build
  const buildResult = await executeCommand(buildCommand, basePath);
  if (!buildResult.success) {
    errors.push(`Build failed: ${buildResult.output.slice(0, 500)}`);
  }

  // Lint
  const lintResult = await executeCommand(lintCommand, basePath);
  if (!lintResult.success) {
    errors.push(`Lint failed: ${lintResult.output.slice(0, 500)}`);
  }

  // Test
  const testResult = await executeCommand(testCommand, basePath);
  if (!testResult.success) {
    errors.push(`Tests failed: ${testResult.output.slice(0, 500)}`);
  }

  return {
    iteration: 1,
    buildPassed: buildResult.success,
    testsPassed: testResult.success,
    lintPassed: lintResult.success,
    errors,
    duration: Date.now() - start,
  };
}

/**
 * Check if the loop should continue
 */
export function shouldContinueLoop(state: RalphWiggumLoopState): boolean {
  // Stop if all tests pass
  if (state.testsPass && state.compilerPass) {
    return false;
  }

  // Stop if max iterations reached
  if (state.iteration >= state.maxIterations) {
    return false;
  }

  return true;
}

/**
 * Get loop status summary
 */
export function getLoopStatusSummary(state: RalphWiggumLoopState): string {
  const status = [];

  status.push(`Iteration: ${state.iteration}/${state.maxIterations}`);
  status.push(`Compiler: ${state.compilerPass ? 'PASS' : 'FAIL'}`);
  status.push(`Tests: ${state.testsPass ? 'PASS' : 'FAIL'}`);

  if (state.lastError !== null) {
    status.push(`Last Error: ${state.lastError.slice(0, 100)}...`);
  }

  return status.join('\n');
}
