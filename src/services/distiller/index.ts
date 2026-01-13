/**
 * Distiller orchestrator
 * Orchestrates parser, analyzer, generators for full distillation pipeline
 */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ensureDirectory } from '../../state/index.js';

import {
  breakdownToAtomicTasks,
  generateImplementationPlanMarkdown,
  type BreakdownResult,
} from './atomic-task-breakdown.js';
import {
  parseBrainstorm,
  mergeVoiceSegments,
  extractAllKeywords,
  type BrainstormParseResult,
} from './brainstorm-parser.js';
import { analyzePatterns, type PatternAnalysisResult } from './pattern-analyzer.js';
import { generatePIN, createPRDEntry, type PINResult } from './pin-generator.js';
import { generatePRD, type PRDResult } from './prd-generator.js';

// Re-export all sub-modules
export * from './brainstorm-parser.js';
export * from './pattern-analyzer.js';
export * from './prd-generator.js';
export * from './pin-generator.js';
export * from './atomic-task-breakdown.js';

/**
 * Full distillation input
 */
export interface DistillationInput {
  projectName: string;
  projectDescription: string;
  brainstormContent: string;
  basePath: string;
  runPatternAnalysis?: boolean;
}

/**
 * Full distillation result
 */
export interface DistillationResult {
  brainstormParse: BrainstormParseResult;
  patternAnalysis: PatternAnalysisResult | null;
  prd: PRDResult;
  pin: PINResult;
  taskBreakdown: BreakdownResult;
  implementationPlanPath: string;
  summary: {
    clientSegments: number;
    engineerSegments: number;
    noiseFiltered: number;
    userStories: number;
    totalTasks: number;
    estimatedHours: number;
    keywords: string[];
  };
}

/**
 * Run the full distillation pipeline
 */
export async function distill(input: DistillationInput): Promise<DistillationResult> {
  const {
    projectName,
    projectDescription,
    brainstormContent,
    basePath,
    runPatternAnalysis = true,
  } = input;

  // Step 1: Parse brainstorm into voice segments
  const brainstormParse = parseBrainstorm(brainstormContent);
  const keywords = extractAllKeywords(brainstormParse);

  // Step 2: Run pattern analysis on codebase (optional)
  let patternAnalysis: PatternAnalysisResult | null = null;
  if (runPatternAnalysis) {
    patternAnalysis = await analyzePatterns(basePath, keywords);
  }

  // Step 3: Generate PRD from client voice
  const prd = await generatePRD(
    {
      projectName,
      projectDescription,
      clientSegments: brainstormParse.clientVoice,
      keywords,
    },
    basePath
  );

  // Step 4: Generate PIN (specification index)
  const pin = await generatePIN(
    {
      projectName,
      entries: [createPRDEntry(projectName, keywords, prd.userStoriesCount)],
      patternAnalysis: patternAnalysis ?? undefined,
    },
    basePath
  );

  // Step 5: Break down into atomic tasks
  // Convert PRD user stories count into mock user stories for breakdown
  const mockUserStories = Array.from({ length: prd.userStoriesCount }, (_, i) => ({
    id: `US-${String(i + 1).padStart(3, '0')}`,
    asA: 'user',
    iWant: `implement feature ${i + 1}`,
    soThat: 'the system is complete',
    acceptanceCriteria: ['Feature works', 'Tests pass'],
  }));

  const taskBreakdown = breakdownToAtomicTasks({
    implementationPlanId: crypto.randomUUID(),
    userStories: mockUserStories,
  });

  // Step 6: Write implementation plan
  const implementationPlanContent = generateImplementationPlanMarkdown(taskBreakdown.tasks);
  const implementationPlanPath = join(basePath, 'IMPLEMENTATION_PLAN.md');
  await ensureDirectory(basePath);
  await writeFile(implementationPlanPath, implementationPlanContent, 'utf-8');

  return {
    brainstormParse,
    patternAnalysis,
    prd,
    pin,
    taskBreakdown,
    implementationPlanPath,
    summary: {
      clientSegments: brainstormParse.summary.clientSegments,
      engineerSegments: brainstormParse.summary.engineerSegments,
      noiseFiltered: brainstormParse.summary.noiseFiltered,
      userStories: prd.userStoriesCount,
      totalTasks: taskBreakdown.tasks.length,
      estimatedHours: Math.round(taskBreakdown.totalEstimatedMinutes / 60),
      keywords,
    },
  };
}

/**
 * Quick distillation for simple inputs
 */
export async function quickDistill(
  brainstormContent: string,
  basePath: string
): Promise<DistillationResult> {
  return distill({
    projectName: 'Quick Project',
    projectDescription: 'Auto-generated project from brainstorm',
    brainstormContent,
    basePath,
    runPatternAnalysis: false,
  });
}

/**
 * Validate distillation input
 */
export function validateDistillationInput(input: DistillationInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (input.projectName.trim().length === 0) {
    errors.push('Project name is required');
  }

  if (input.brainstormContent.trim().length < 50) {
    errors.push('Brainstorm content too short (minimum 50 characters)');
  }

  if (input.basePath.trim().length === 0) {
    errors.push('Base path is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
