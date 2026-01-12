/**
 * /...digest command implementation
 * Handles unstructured input, proposes 5-10 atomic tasks
 */
import { parseBrainstorm, type VoiceSegment } from '../services/distiller/brainstorm-parser.js';
import {
  breakdownToAtomicTasks,
  TASK_CONSTRAINTS,
  type BreakdownResult,
} from '../services/distiller/atomic-task-breakdown.js';

/**
 * Digest command options
 */
export interface DigestOptions {
  input: string;
  maxTasks?: number;
  minTasks?: number;
}

/**
 * Proposed task from digest
 */
export interface ProposedTask {
  title: string;
  description: string;
  estimatedMinutes: number;
  dependencyLayer: number;
  keywords: string[];
}

/**
 * Digest command result
 */
export interface DigestResult {
  success: boolean;
  proposedTasks?: ProposedTask[];
  inputAnalysis?: {
    clientSegments: number;
    engineerSegments: number;
    noiseFiltered: number;
    keywords: string[];
  };
  error?: string;
}

/**
 * Extract task proposals from voice segments
 */
function extractTaskProposals(
  segments: VoiceSegment[],
  minTasks: number,
  maxTasks: number
): ProposedTask[] {
  const tasks: ProposedTask[] = [];

  // Process client voice segments for user-facing tasks
  for (const segment of segments) {
    if (tasks.length >= maxTasks) break;

    // Look for action-oriented phrases
    const actionPhrases = [
      /(?:need to|want to|should|must|have to)\s+(.+?)(?:\.|$)/gi,
      /(?:implement|create|build|add|fix|update)\s+(.+?)(?:\.|$)/gi,
      /(?:the\s+)?(.+?)\s+(?:feature|functionality|system)/gi,
    ];

    for (const regex of actionPhrases) {
      let match;
      while ((match = regex.exec(segment.content)) !== null) {
        if (tasks.length >= maxTasks) break;

        const action = match[1]?.trim();
        if (action && action.length > 10 && action.length < 100) {
          tasks.push({
            title: capitalizeFirst(action),
            description: `Derived from: "${segment.content.slice(0, 100)}..."`,
            estimatedMinutes: TASK_CONSTRAINTS.MAX_MINUTES,
            dependencyLayer: 2,
            keywords: segment.keywords.slice(0, 5),
          });
        }
      }
    }
  }

  // Ensure minimum tasks
  if (tasks.length < minTasks) {
    // Add generic tasks based on keywords
    const allKeywords = segments.flatMap((s) => s.keywords);
    const uniqueKeywords = [...new Set(allKeywords)].slice(0, minTasks - tasks.length);

    for (const keyword of uniqueKeywords) {
      tasks.push({
        title: `Implement ${keyword} functionality`,
        description: `Based on keyword analysis: ${keyword}`,
        estimatedMinutes: TASK_CONSTRAINTS.MAX_MINUTES,
        dependencyLayer: 2,
        keywords: [keyword],
      });
    }
  }

  return tasks.slice(0, maxTasks);
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Execute digest command
 * Parses unstructured input and proposes atomic tasks
 */
export async function digest(options: DigestOptions): Promise<DigestResult> {
  const { input, maxTasks = 10, minTasks = 5 } = options;

  try {
    if (input.trim().length < 20) {
      return {
        success: false,
        error: 'Input too short. Please provide more context.',
      };
    }

    // Parse the input
    const parseResult = parseBrainstorm(input);

    // Combine client and engineer voices for task extraction
    const allSegments = [...parseResult.clientVoice, ...parseResult.engineerVoice];

    if (allSegments.length === 0) {
      return {
        success: false,
        error: 'Could not extract meaningful content from input.',
      };
    }

    // Extract task proposals
    const proposedTasks = extractTaskProposals(allSegments, minTasks, maxTasks);

    // Collect all keywords
    const allKeywords = allSegments.flatMap((s) => s.keywords);
    const uniqueKeywords = [...new Set(allKeywords)];

    return {
      success: true,
      proposedTasks,
      inputAnalysis: {
        clientSegments: parseResult.clientVoice.length,
        engineerSegments: parseResult.engineerVoice.length,
        noiseFiltered: parseResult.noise.length,
        keywords: uniqueKeywords.slice(0, 20),
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
 * Format digest result for display
 */
export function formatDigestResult(result: DigestResult): string {
  if (!result.success) {
    return `Digest failed: ${result.error}`;
  }

  if (!result.proposedTasks || result.proposedTasks.length === 0) {
    return 'No tasks could be extracted from the input.';
  }

  let output = `
Digest Analysis
===============

Input Analysis:
  - Client segments: ${result.inputAnalysis?.clientSegments ?? 0}
  - Engineer segments: ${result.inputAnalysis?.engineerSegments ?? 0}
  - Noise filtered: ${result.inputAnalysis?.noiseFiltered ?? 0}
  - Keywords: ${result.inputAnalysis?.keywords.slice(0, 10).join(', ')}

Proposed Tasks (${result.proposedTasks.length}):
`;

  for (let i = 0; i < result.proposedTasks.length; i++) {
    const task = result.proposedTasks[i];
    if (task) {
      output += `
${i + 1}. ${task.title}
   Est: ${task.estimatedMinutes} min | Layer: ${task.dependencyLayer}
   Keywords: ${task.keywords.join(', ')}
`;
    }
  }

  output += `
Next Steps:
  1. Review and refine the proposed tasks
  2. Run /...seed with a brainstorm file for full distillation
  3. Or manually create IMPLEMENTATION_PLAN.md

Note: These are preliminary task suggestions. Use /...seed for
proper PRD generation and task breakdown.
`;

  return output.trim();
}
