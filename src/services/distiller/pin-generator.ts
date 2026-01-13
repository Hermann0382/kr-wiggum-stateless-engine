/**
 * Specification Index (PIN) generation
 * Generates specs/index.md with keywords for RipGrep optimization
 */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ensureDirectory } from '../../state/index.js';

import type { PatternAnalysisResult } from './pattern-analyzer.js';

/**
 * PIN entry for a specification
 */
export interface PINEntry {
  id: string;
  title: string;
  path: string;
  type: 'prd' | 'architecture' | 'concepts' | 'technical';
  keywords: string[];
  summary: string;
}

/**
 * PIN generation input
 */
export interface PINInput {
  projectName: string;
  entries: PINEntry[];
  patternAnalysis?: PatternAnalysisResult;
}

/**
 * PIN generation result
 */
export interface PINResult {
  filePath: string;
  content: string;
  entriesCount: number;
  totalKeywords: number;
}

/**
 * Generate keyword index section
 */
function generateKeywordIndex(entries: PINEntry[]): string {
  const keywordMap = new Map<string, string[]>();

  for (const entry of entries) {
    for (const keyword of entry.keywords) {
      const existing = keywordMap.get(keyword) ?? [];
      existing.push(entry.id);
      keywordMap.set(keyword, existing);
    }
  }

  // Sort keywords alphabetically
  const sortedKeywords = Array.from(keywordMap.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  let index = '';
  for (const [keyword, ids] of sortedKeywords) {
    index += `- \`${keyword}\`: ${ids.join(', ')}\n`;
  }

  return index;
}

/**
 * Generate PIN markdown content
 */
function generatePINContent(input: PINInput): string {
  const date = new Date().toISOString().split('T')[0];

  let content = `# Specification Index (PIN)

## Project: ${input.projectName}

**Generated**: ${date}
**Purpose**: Quick reference for RipGrep-optimized specification lookup

---

## Quick Navigation

| ID | Title | Type | Path |
|----|-------|------|------|
`;

  for (const entry of input.entries) {
    content += `| ${entry.id} | ${entry.title} | ${entry.type} | [${entry.path}](${entry.path}) |\n`;
  }

  content += `
---

## Keyword Index

The following keywords are indexed for fast RipGrep lookup:

${generateKeywordIndex(input.entries)}

---

## Specification Details

`;

  for (const entry of input.entries) {
    content += `### ${entry.id}: ${entry.title}

- **Type**: ${entry.type}
- **Path**: \`${entry.path}\`
- **Keywords**: ${entry.keywords.map((k) => `\`${k}\``).join(', ')}

${entry.summary}

---

`;
  }

  // Add codebase patterns if available
  if (input.patternAnalysis !== undefined) {
    content += `## Detected Codebase Patterns

`;
    for (const pattern of input.patternAnalysis.codebasePatterns) {
      content += `### ${pattern.name}

${pattern.description}

**Confidence**: ${Math.round(pattern.confidence * 100)}%

---

`;
    }
  }

  content += `## Usage

### RipGrep Commands

\`\`\`bash
# Search for a keyword
rg "keyword" specs/

# Search with context
rg "keyword" specs/ -C 3

# Search in specific file types
rg "keyword" specs/ -t md
\`\`\`

### Finding Related Specifications

1. Identify keywords from the index above
2. Use \`rg "keyword"\` to find relevant specs
3. Cross-reference with the navigation table

---

*This index is auto-generated and should be regenerated when specifications change.*
`;

  return content;
}

/**
 * Generate PIN (Specification Index) file
 */
export async function generatePIN(input: PINInput, outputPath: string): Promise<PINResult> {
  const content = generatePINContent(input);

  const specsDir = join(outputPath, 'specs');
  await ensureDirectory(specsDir);

  const filePath = join(specsDir, 'index.md');
  await writeFile(filePath, content, 'utf-8');

  const totalKeywords = new Set(input.entries.flatMap((e) => e.keywords)).size;

  return {
    filePath,
    content,
    entriesCount: input.entries.length,
    totalKeywords,
  };
}

/**
 * Create a PIN entry from PRD
 */
export function createPRDEntry(
  projectName: string,
  keywords: string[],
  userStoriesCount: number
): PINEntry {
  return {
    id: 'SPEC-001',
    title: `${projectName} PRD`,
    path: './PRD.md',
    type: 'prd',
    keywords,
    summary: `Product Requirements Document with ${userStoriesCount} user stories.`,
  };
}

/**
 * Create a PIN entry for architecture docs
 */
export function createArchitectureEntry(
  title: string,
  path: string,
  keywords: string[]
): PINEntry {
  return {
    id: `SPEC-${String(Date.now()).slice(-3)}`,
    title,
    path,
    type: 'architecture',
    keywords,
    summary: `Architecture documentation for ${title}.`,
  };
}
