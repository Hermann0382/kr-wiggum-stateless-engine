/**
 * /...plan command implementation
 * Analyzes gap between specs and code, updates IMPLEMENTATION_PLAN.md
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { analyzePatterns } from '../services/distiller/pattern-analyzer.js';
import {
  createImplementationPlanManager,
  type ProgressSummary,
} from '../state/index.js';

/**
 * Plan command options
 */
export interface PlanOptions {
  basePath?: string;
  specsPath?: string;
  analyze?: boolean;
}

/**
 * Plan analysis result
 */
export interface PlanAnalysis {
  specsExist: boolean;
  planExists: boolean;
  progress: ProgressSummary | null;
  gapAnalysis: GapAnalysis | null;
}

/**
 * Gap analysis between specs and implementation
 */
export interface GapAnalysis {
  missingFeatures: string[];
  partiallyImplemented: string[];
  fullyImplemented: string[];
  coveragePercent: number;
}

/**
 * Plan command result
 */
export interface PlanResult {
  success: boolean;
  analysis?: PlanAnalysis;
  error?: string;
}

/**
 * Execute plan command
 * Analyzes gap between specs and code
 */
export async function plan(options: PlanOptions = {}): Promise<PlanResult> {
  const {
    basePath = process.cwd(),
    specsPath = join(basePath, 'specs'),
    analyze = true,
  } = options;

  try {
    // Check if specs exist
    let specsExist = false;
    try {
      await readFile(join(specsPath, 'PRD.md'), 'utf-8');
      specsExist = true;
    } catch {
      specsExist = false;
    }

    // Check implementation plan
    const planManager = createImplementationPlanManager(basePath);
    const planExists = await planManager.exists();
    let progress: ProgressSummary | null = null;

    if (planExists) {
      progress = await planManager.getProgress();
    }

    // Gap analysis
    let gapAnalysis: GapAnalysis | null = null;

    if (analyze && specsExist) {
      gapAnalysis = await analyzeGap(basePath, specsPath);
    }

    return {
      success: true,
      analysis: {
        specsExist,
        planExists,
        progress,
        gapAnalysis,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Analyze gap between specs and implementation
 */
async function analyzeGap(basePath: string, specsPath: string): Promise<GapAnalysis> {
  // Read PRD to extract user stories
  const prdContent = await readFile(join(specsPath, 'PRD.md'), 'utf-8');

  // Extract user story IDs
  const userStoryRegex = /^### (US-\d{3})/gm;
  const userStories: string[] = [];
  let match;
  while ((match = userStoryRegex.exec(prdContent)) !== null) {
    userStories.push(match[1] ?? '');
  }

  // Run pattern analysis to find implementations
  const patterns = await analyzePatterns(basePath, ['implementation', 'feature', 'test']);

  // Simple heuristic: check if story IDs are mentioned in code
  const missingFeatures: string[] = [];
  const partiallyImplemented: string[] = [];
  const fullyImplemented: string[] = [];

  for (const storyId of userStories) {
    const matches = patterns.searchResults.find((r) =>
      r.matches.some((m) => m.content.includes(storyId))
    );

    if (matches === undefined || matches.totalCount === 0) {
      missingFeatures.push(storyId);
    } else if (matches.totalCount < 3) {
      partiallyImplemented.push(storyId);
    } else {
      fullyImplemented.push(storyId);
    }
  }

  const total = userStories.length;
  const implemented = fullyImplemented.length + partiallyImplemented.length * 0.5;
  const coveragePercent = total > 0 ? Math.round((implemented / total) * 100) : 0;

  return {
    missingFeatures,
    partiallyImplemented,
    fullyImplemented,
    coveragePercent,
  };
}

/**
 * Format plan result for display
 */
export function formatPlanResult(result: PlanResult): string {
  if (!result.success) {
    return `Plan analysis failed: ${result.error}`;
  }

  if (!result.analysis) {
    return 'Plan analysis completed but no result returned';
  }

  const { specsExist, planExists, progress, gapAnalysis } = result.analysis;

  let output = `
Plan Analysis
=============

Specs exist: ${specsExist ? 'Yes' : 'No'}
Implementation plan exists: ${planExists ? 'Yes' : 'No'}
`;

  if (progress !== null) {
    output += `
Progress:
  - Total tasks: ${progress.total}
  - Completed: ${progress.completed}
  - Remaining: ${progress.remaining}
  - Progress: ${progress.percentComplete}%
`;
  }

  if (gapAnalysis !== null) {
    output += `
Gap Analysis:
  - Coverage: ${gapAnalysis.coveragePercent}%
  - Fully implemented: ${gapAnalysis.fullyImplemented.length}
  - Partially implemented: ${gapAnalysis.partiallyImplemented.length}
  - Missing: ${gapAnalysis.missingFeatures.length}
`;

    if (gapAnalysis.missingFeatures.length > 0) {
      output += `\nMissing features: ${gapAnalysis.missingFeatures.join(', ')}`;
    }
  }

  if (!specsExist) {
    output += '\n\nNext step: Run /...seed <file> to generate specs from a brainstorm file.';
  } else if (!planExists) {
    output += '\n\nNext step: Implementation plan will be generated from specs.';
  } else if (progress !== null && progress.remaining > 0) {
    output += '\n\nNext step: Run /...loop to start the Ralph Wiggum Loop.';
  } else {
    output += '\n\nAll tasks complete!';
  }

  return output.trim();
}
