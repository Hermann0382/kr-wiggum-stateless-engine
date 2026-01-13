/**
 * ForensicAnalyzer - TASK-049
 * Post-crisis recovery analysis: what went wrong and what to fix
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, basename } from 'node:path';

import { createCompilerErrorManager, createTelemetryManager } from '../../state/index.js';

/**
 * Crisis event types
 */
export type CrisisType =
  | 'infinite_loop'
  | 'compilation_failure'
  | 'test_failure'
  | 'context_overflow'
  | 'process_crash'
  | 'unknown';

/**
 * Forensic finding severity
 */
export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * Individual forensic finding
 */
export interface ForensicFinding {
  id: string;
  severity: FindingSeverity;
  category: string;
  description: string;
  evidence: string[];
  recommendation: string;
}

/**
 * Forensic analysis result
 */
export interface ForensicAnalysis {
  crisisType: CrisisType;
  timestamp: string;
  duration: string;
  rootCause: string;
  findings: ForensicFinding[];
  recoverySteps: string[];
  preventionMeasures: string[];
  affectedFiles: string[];
  affectedTasks: string[];
}

/**
 * Forensic analyzer options
 */
export interface ForensicAnalyzerOptions {
  basePath: string;
  lookbackMinutes?: number;
}

/**
 * Analyze git status for uncommitted changes
 */
async function analyzeGitStatus(basePath: string): Promise<string[]> {
  const { exec } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const execAsync = promisify(exec);

  try {
    const { stdout } = await execAsync('git status --porcelain', {
      cwd: basePath,
    });

    return stdout
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) => line.trim());
  } catch {
    return [];
  }
}

/**
 * Analyze recent compiler errors
 */
async function analyzeCompilerErrors(
  basePath: string
): Promise<ForensicFinding[]> {
  const findings: ForensicFinding[] = [];

  try {
    const errorManager = createCompilerErrorManager(basePath);
    const errorLog = await errorManager.read();

    if (errorLog !== null && errorLog.message.length > 0) {
      findings.push({
        id: `compile-error-${errorLog.errorType}`,
        severity: 'high',
        category: 'compilation',
        description: `${errorLog.errorType} error detected: ${errorLog.message}`,
        evidence: [
          `Error type: ${errorLog.errorType}`,
          `Timestamp: ${errorLog.timestamp}`,
          errorLog.isTruncated ? 'Output was truncated' : 'Full output captured',
        ],
        recommendation: `Review and fix ${errorLog.errorType} errors`,
      });
    }
  } catch {
    // No compiler errors logged
  }

  return findings;
}

/**
 * Analyze telemetry for context issues
 */
async function analyzeTelemetry(basePath: string): Promise<ForensicFinding[]> {
  const findings: ForensicFinding[] = [];

  try {
    const telemetryManager = createTelemetryManager(basePath);
    const telemetry = await telemetryManager.read();

    // Check for context overflow
    if (telemetry.context_fill_percent >= 90) {
      findings.push({
        id: 'context-overflow',
        severity: 'critical',
        category: 'context',
        description: `Context fill at ${telemetry.context_fill_percent}% - likely caused agent confusion`,
        evidence: [
          `Zone: ${telemetry.zone}`,
          `Tokens used: ${telemetry.tokens_used}`,
        ],
        recommendation: 'Reduce task complexity or split into smaller tasks',
      });
    }

    // Check for degraded zone
    if (telemetry.zone === 'dumb') {
      findings.push({
        id: 'dumb-zone-operation',
        severity: 'high',
        category: 'context',
        description: 'Agent was operating in "dumb" zone with degraded reasoning',
        evidence: [`Context fill: ${telemetry.context_fill_percent}%`],
        recommendation: 'Implement earlier rotation triggers',
      });
    }
  } catch {
    // No telemetry available
  }

  return findings;
}

/**
 * Analyze recent file modifications
 */
async function analyzeRecentFiles(
  basePath: string,
  lookbackMinutes: number
): Promise<string[]> {
  const affectedFiles: string[] = [];
  const cutoffTime = Date.now() - lookbackMinutes * 60 * 1000;

  async function walkDir(dir: string): Promise<void> {
    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        // Skip node_modules and hidden directories
        if (
          entry.name.startsWith('.') ||
          entry.name === 'node_modules' ||
          entry.name === 'dist'
        ) {
          continue;
        }

        if (entry.isDirectory()) {
          await walkDir(fullPath);
        } else if (entry.isFile()) {
          const stats = await stat(fullPath);
          if (stats.mtimeMs >= cutoffTime) {
            affectedFiles.push(fullPath.replace(basePath + '/', ''));
          }
        }
      }
    } catch {
      // Directory not readable
    }
  }

  await walkDir(basePath);
  return affectedFiles;
}

/**
 * Determine crisis type from findings
 */
function determineCrisisType(findings: ForensicFinding[]): CrisisType {
  const categories = findings.map((f) => f.category);

  if (findings.some((f) => f.id === 'context-overflow')) {
    return 'context_overflow';
  }

  if (categories.includes('compilation')) {
    return 'compilation_failure';
  }

  if (categories.includes('test')) {
    return 'test_failure';
  }

  if (findings.some((f) => f.description.includes('loop'))) {
    return 'infinite_loop';
  }

  return 'unknown';
}

/**
 * Generate recovery steps based on findings
 */
function generateRecoverySteps(findings: ForensicFinding[]): string[] {
  const steps: string[] = [];

  // Sort findings by severity
  const critical = findings.filter((f) => f.severity === 'critical');
  const high = findings.filter((f) => f.severity === 'high');

  if (critical.length > 0) {
    steps.push('1. Address critical issues immediately:');
    for (const finding of critical) {
      steps.push(`   - ${finding.recommendation}`);
    }
  }

  if (high.length > 0) {
    steps.push(`${steps.length > 0 ? '2' : '1'}. Fix high-priority issues:`);
    for (const finding of high) {
      steps.push(`   - ${finding.recommendation}`);
    }
  }

  steps.push(`${steps.length > 0 ? steps.length + 1 : 1}. Run full test suite to verify fixes`);
  steps.push(`${steps.length + 1}. Review git diff for unintended changes`);
  steps.push(`${steps.length + 1}. Restart agent loop if issues resolved`);

  return steps;
}

/**
 * Generate prevention measures based on findings
 */
function generatePreventionMeasures(findings: ForensicFinding[]): string[] {
  const measures = new Set<string>();

  for (const finding of findings) {
    switch (finding.category) {
      case 'context':
        measures.add('Lower context rotation threshold from 60% to 50%');
        measures.add('Implement more aggressive task splitting');
        break;
      case 'compilation':
        measures.add('Run type-check after each file modification');
        measures.add('Add pre-commit TypeScript validation hook');
        break;
      case 'test':
        measures.add('Run affected tests after each code change');
        measures.add('Add test coverage requirements to guardrails');
        break;
    }
  }

  return Array.from(measures);
}

/**
 * Run forensic analysis on the project
 */
export async function runForensicAnalysis(
  options: ForensicAnalyzerOptions
): Promise<ForensicAnalysis> {
  const { basePath, lookbackMinutes = 30 } = options;
  const startTime = Date.now();

  // Collect all findings
  const findings: ForensicFinding[] = [];

  // Analyze different aspects
  const [compilerFindings, telemetryFindings, recentFiles, gitStatus] =
    await Promise.all([
      analyzeCompilerErrors(basePath),
      analyzeTelemetry(basePath),
      analyzeRecentFiles(basePath, lookbackMinutes),
      analyzeGitStatus(basePath),
    ]);

  findings.push(...compilerFindings, ...telemetryFindings);

  // Add git status findings
  if (gitStatus.length > 10) {
    findings.push({
      id: 'many-uncommitted-changes',
      severity: 'medium',
      category: 'version-control',
      description: `${gitStatus.length} uncommitted changes detected`,
      evidence: gitStatus.slice(0, 5),
      recommendation: 'Review and commit or discard changes before proceeding',
    });
  }

  // Determine root cause
  const crisisType = determineCrisisType(findings);
  const rootCause = findings.length > 0
    ? findings
        .filter((f) => f.severity === 'critical' || f.severity === 'high')
        .map((f) => f.description)
        .join('; ') || 'Unable to determine specific root cause'
    : 'No obvious issues detected';

  // Generate recovery and prevention
  const recoverySteps = generateRecoverySteps(findings);
  const preventionMeasures = generatePreventionMeasures(findings);

  // Extract affected tasks from telemetry
  const affectedTasks: string[] = [];
  try {
    const telemetryManager = createTelemetryManager(basePath);
    const telemetry = await telemetryManager.read();
    if (telemetry.current_task_id !== undefined) {
      affectedTasks.push(telemetry.current_task_id);
    }
  } catch {
    // No telemetry
  }

  const duration = `${Date.now() - startTime}ms`;

  return {
    crisisType,
    timestamp: new Date().toISOString(),
    duration,
    rootCause,
    findings,
    recoverySteps,
    preventionMeasures,
    affectedFiles: recentFiles,
    affectedTasks,
  };
}

/**
 * Generate markdown report from analysis
 */
export function generateForensicReport(analysis: ForensicAnalysis): string {
  const lines: string[] = [];

  lines.push('# Post-Crisis Forensic Analysis');
  lines.push('');
  lines.push(`**Timestamp:** ${analysis.timestamp}`);
  lines.push(`**Crisis Type:** ${analysis.crisisType}`);
  lines.push(`**Analysis Duration:** ${analysis.duration}`);
  lines.push('');

  lines.push('## Root Cause');
  lines.push('');
  lines.push(analysis.rootCause);
  lines.push('');

  if (analysis.findings.length > 0) {
    lines.push('## Findings');
    lines.push('');

    for (const finding of analysis.findings) {
      lines.push(`### [${finding.severity.toUpperCase()}] ${finding.description}`);
      lines.push('');
      lines.push(`**Category:** ${finding.category}`);
      lines.push('');
      lines.push('**Evidence:**');
      for (const evidence of finding.evidence) {
        lines.push(`- ${evidence}`);
      }
      lines.push('');
      lines.push(`**Recommendation:** ${finding.recommendation}`);
      lines.push('');
    }
  }

  lines.push('## Recovery Steps');
  lines.push('');
  for (const step of analysis.recoverySteps) {
    lines.push(step);
  }
  lines.push('');

  lines.push('## Prevention Measures');
  lines.push('');
  for (const measure of analysis.preventionMeasures) {
    lines.push(`- ${measure}`);
  }
  lines.push('');

  if (analysis.affectedFiles.length > 0) {
    lines.push('## Affected Files');
    lines.push('');
    for (const file of analysis.affectedFiles.slice(0, 20)) {
      lines.push(`- ${file}`);
    }
    if (analysis.affectedFiles.length > 20) {
      lines.push(`- ... and ${analysis.affectedFiles.length - 20} more files`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('🔍 Generated by KR-Wiggum Forensic Analyzer');

  return lines.join('\n');
}

/**
 * Create forensic analyzer (factory function)
 */
export function createForensicAnalyzer(basePath: string) {
  return {
    analyze: (lookbackMinutes?: number) =>
      runForensicAnalysis({ basePath, lookbackMinutes }),
    generateReport: generateForensicReport,
  };
}
