/**
 * /...seed command implementation
 * Triggers Distiller with linked file, generates specs
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { distill, type DistillationResult } from '../services/distiller/index.js';

/**
 * Seed command options
 */
export interface SeedOptions {
  filePath: string;
  projectName?: string;
  basePath?: string;
  runPatternAnalysis?: boolean;
}

/**
 * Seed command result
 */
export interface SeedResult {
  success: boolean;
  result?: DistillationResult;
  error?: string;
}

/**
 * Execute seed command
 * Runs the distiller on a brainstorm/input file
 */
export async function seed(options: SeedOptions): Promise<SeedResult> {
  const {
    filePath,
    projectName = 'Project',
    basePath = process.cwd(),
    runPatternAnalysis = true,
  } = options;

  try {
    // Read input file
    const resolvedPath = resolve(basePath, filePath);
    const content = await readFile(resolvedPath, 'utf-8');

    if (content.trim().length < 50) {
      return {
        success: false,
        error: 'Input file too short (minimum 50 characters)',
      };
    }

    // Run distillation
    const result = await distill({
      projectName,
      projectDescription: `Generated from ${filePath}`,
      brainstormContent: content,
      basePath,
      runPatternAnalysis,
    });

    return {
      success: true,
      result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Format seed result for display
 */
export function formatSeedResult(result: SeedResult): string {
  if (!result.success) {
    return `Seed failed: ${result.error}`;
  }

  if (!result.result) {
    return 'Seed completed but no result returned';
  }

  const { summary, prd, pin, implementationPlanPath } = result.result;

  return `
Seed completed successfully!

Summary:
  - Client segments: ${summary.clientSegments}
  - Engineer segments: ${summary.engineerSegments}
  - Noise filtered: ${summary.noiseFiltered}
  - User stories: ${summary.userStories}
  - Total tasks: ${summary.totalTasks}
  - Estimated hours: ${summary.estimatedHours}

Generated files:
  - PRD: ${prd.filePath}
  - PIN: ${pin.filePath}
  - Implementation Plan: ${implementationPlanPath}

Keywords: ${summary.keywords.slice(0, 10).join(', ')}${summary.keywords.length > 10 ? '...' : ''}

Next step: Run /...plan to analyze and update the implementation plan.
`.trim();
}
