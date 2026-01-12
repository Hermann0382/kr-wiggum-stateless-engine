/**
 * Status fragment generation
 * Documents what_fixed, what_changed, patterns_used (<500 tokens)
 */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

import type { StatusFragment } from '../../schemas/index.js';
import { ensureDirectory } from '../../state/index.js';

/**
 * File change record
 */
export interface FileChange {
  filePath: string;
  changeType: 'created' | 'modified' | 'deleted';
  linesAdded: number;
  linesRemoved: number;
}

/**
 * Status fragment input
 */
export interface StatusFragmentInput {
  projectId: string;
  sessionId: string;
  taskId: string;
  whatFixed: string;
  whatChanged: FileChange[];
  patternsUsed?: string[];
  testsPassed: boolean;
  compilerPassed: boolean;
  retryCount: number;
}

/**
 * Status fragment result
 */
export interface StatusFragmentResult {
  filePath: string;
  fragment: StatusFragment;
  tokenCount: number;
}

/**
 * Estimate token count from text
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Truncate text to max tokens
 */
function truncateToTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) {
    return text;
  }
  return text.slice(0, maxChars - 3) + '...';
}

/**
 * Write a status fragment
 */
export async function writeStatusFragment(
  basePath: string,
  input: StatusFragmentInput
): Promise<StatusFragmentResult> {
  const {
    projectId,
    sessionId,
    taskId,
    whatFixed,
    whatChanged,
    patternsUsed = [],
    testsPassed,
    compilerPassed,
    retryCount,
  } = input;

  // Truncate whatFixed to fit within token limit
  const truncatedWhatFixed = truncateToTokens(whatFixed, 200);

  const fragment: StatusFragment = {
    id: randomUUID(),
    project_id: projectId,
    session_id: sessionId,
    task_id: taskId,
    what_fixed: truncatedWhatFixed,
    what_changed: whatChanged.map((change) => ({
      file_path: change.filePath,
      change_type: change.changeType,
      lines_added: change.linesAdded,
      lines_removed: change.linesRemoved,
    })),
    patterns_used: patternsUsed,
    token_count: 0, // Will be calculated
    tests_passed: testsPassed,
    compiler_passed: compilerPassed,
    retry_count: retryCount,
    created_at: new Date().toISOString(),
  };

  // Calculate token count
  const fragmentJson = JSON.stringify(fragment);
  fragment.token_count = Math.min(estimateTokens(fragmentJson), 500);

  // Write to file
  const ralphDir = join(basePath, '.ralph');
  await ensureDirectory(ralphDir);

  const filePath = join(ralphDir, 'status-fragment.json');
  await writeFile(filePath, JSON.stringify(fragment, null, 2), 'utf-8');

  // Also write a human-readable markdown version
  const markdownPath = join(ralphDir, 'status-fragment.md');
  const markdown = generateFragmentMarkdown(fragment);
  await writeFile(markdownPath, markdown, 'utf-8');

  return {
    filePath,
    fragment,
    tokenCount: fragment.token_count,
  };
}

/**
 * Generate markdown from status fragment
 */
function generateFragmentMarkdown(fragment: StatusFragment): string {
  const changes = fragment.what_changed
    .map(
      (c) =>
        `- ${c.change_type.toUpperCase()}: \`${c.file_path}\` (+${c.lines_added}/-${c.lines_removed})`
    )
    .join('\n');

  const patterns =
    fragment.patterns_used.length > 0
      ? fragment.patterns_used.map((p) => `- ${p}`).join('\n')
      : '*No new patterns used*';

  return `# Status Fragment

**Task**: ${fragment.task_id}
**Session**: ${fragment.session_id.slice(0, 8)}...
**Created**: ${fragment.created_at}

---

## What Was Fixed

${fragment.what_fixed}

---

## Files Changed

${changes}

---

## Patterns Used

${patterns}

---

## Status

- **Tests**: ${fragment.tests_passed ? 'PASSING' : 'FAILING'}
- **Compiler**: ${fragment.compiler_passed ? 'PASSING' : 'FAILING'}
- **Retry Count**: ${fragment.retry_count}
- **Token Count**: ${fragment.token_count}

---

*This fragment was generated automatically by the Worker.*
`;
}

/**
 * Create a minimal status fragment for blocked tasks
 */
export async function writeBlockedFragment(
  basePath: string,
  input: {
    projectId: string;
    sessionId: string;
    taskId: string;
    blockerDescription: string;
    retryCount: number;
  }
): Promise<StatusFragmentResult> {
  return writeStatusFragment(basePath, {
    projectId: input.projectId,
    sessionId: input.sessionId,
    taskId: input.taskId,
    whatFixed: `BLOCKED: ${input.blockerDescription}`,
    whatChanged: [],
    patternsUsed: [],
    testsPassed: false,
    compilerPassed: false,
    retryCount: input.retryCount,
  });
}

/**
 * Read existing status fragment
 */
export async function readStatusFragment(basePath: string): Promise<StatusFragment | null> {
  try {
    const { readFile } = await import('node:fs/promises');
    const filePath = join(basePath, '.ralph', 'status-fragment.json');
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content) as StatusFragment;
  } catch {
    return null;
  }
}
