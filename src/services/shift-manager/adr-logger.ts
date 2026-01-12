/**
 * ADR management from Worker outputs
 * Reads Status Fragments, distills into ADR entries
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { StatusFragment, ADR } from '../../schemas/index.js';
import { createADRManager, type ADREntry } from '../../state/index.js';

/**
 * ADR generation input from status fragment
 */
export interface ADRFromFragmentInput {
  statusFragment: StatusFragment;
  commitHash?: string;
}

/**
 * ADR logger for distilling Worker outputs into ADRs
 */
export class ADRLogger {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  /**
   * Read status fragment from Worker output
   */
  async readStatusFragment(): Promise<StatusFragment | null> {
    try {
      const fragmentPath = join(this.basePath, '.ralph', 'status-fragment.json');
      const content = await readFile(fragmentPath, 'utf-8');
      return JSON.parse(content) as StatusFragment;
    } catch {
      return null;
    }
  }

  /**
   * Determine if status fragment warrants an ADR
   */
  shouldCreateADR(fragment: StatusFragment): boolean {
    // Create ADR if:
    // 1. New patterns were used
    // 2. Multiple files were changed
    // 3. Significant code changes
    const hasNewPatterns = fragment.patterns_used.length > 0;
    const multipleFiles = fragment.what_changed.length > 2;
    const significantChanges = fragment.what_changed.reduce(
      (sum, change) => sum + change.lines_added + change.lines_removed,
      0
    ) > 50;

    return hasNewPatterns || multipleFiles || significantChanges;
  }

  /**
   * Generate ADR from status fragment
   */
  async generateADRFromFragment(input: ADRFromFragmentInput): Promise<void> {
    const { statusFragment, commitHash } = input;
    const adrManager = createADRManager(this.basePath);

    // Get next ADR ID
    const nextId = await adrManager.getNextId();

    // Extract keywords from what changed and patterns
    const keywords = [
      ...statusFragment.patterns_used,
      ...statusFragment.what_changed.map((c) => c.file_path.split('/').pop() ?? ''),
    ].filter((k) => k.length > 2);

    // Generate title from task
    const title = `Task ${statusFragment.task_id} Implementation`;

    // Generate decision from what was fixed
    const decision = statusFragment.what_fixed;

    // Generate rationale from changes
    const changes = statusFragment.what_changed
      .map((c) => `- ${c.change_type}: ${c.file_path} (+${c.lines_added}/-${c.lines_removed})`)
      .join('\n');

    const rationale = `## Changes Made

${changes}

## Patterns Used

${statusFragment.patterns_used.length > 0 ? statusFragment.patterns_used.map((p) => `- ${p}`).join('\n') : 'No new patterns introduced.'}

## Test Status

- Tests: ${statusFragment.tests_passed ? 'PASSING' : 'FAILING'}
- Compiler: ${statusFragment.compiler_passed ? 'PASSING' : 'FAILING'}
- Retry Count: ${statusFragment.retry_count}
`;

    const entry: ADREntry = {
      id: nextId,
      title,
      decision,
      rationale,
      keywords: keywords.length > 0 ? keywords : ['implementation'],
      status: 'accepted',
      createdBy: 'worker',
      commitHash,
    };

    await adrManager.append(entry);
  }

  /**
   * Process pending status fragment
   */
  async processPendingFragment(commitHash?: string): Promise<boolean> {
    const fragment = await this.readStatusFragment();
    if (fragment === null) {
      return false;
    }

    if (this.shouldCreateADR(fragment)) {
      await this.generateADRFromFragment({ statusFragment: fragment, commitHash });
      return true;
    }

    return false;
  }

  /**
   * Log a manual ADR entry
   */
  async logManualADR(input: {
    title: string;
    decision: string;
    rationale: string;
    keywords: string[];
    commitHash?: string;
  }): Promise<string> {
    const adrManager = createADRManager(this.basePath);
    const nextId = await adrManager.getNextId();

    const entry: ADREntry = {
      id: nextId,
      title: input.title,
      decision: input.decision,
      rationale: input.rationale,
      keywords: input.keywords,
      status: 'accepted',
      createdBy: 'manager',
      commitHash: input.commitHash,
    };

    await adrManager.append(entry);
    return nextId;
  }

  /**
   * Get recent ADR summaries
   */
  async getRecentADRs(count: number = 5): Promise<string[]> {
    const adrManager = createADRManager(this.basePath);
    return adrManager.getLastADRIds(count);
  }

  /**
   * Search ADRs by keyword
   */
  async searchADRs(keyword: string): Promise<string[]> {
    const adrManager = createADRManager(this.basePath);
    return adrManager.searchByKeyword(keyword);
  }
}

/**
 * Create an ADR logger instance
 */
export function createADRLogger(basePath: string): ADRLogger {
  return new ADRLogger(basePath);
}
