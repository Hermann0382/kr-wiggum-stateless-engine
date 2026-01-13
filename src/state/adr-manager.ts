/**
 * Manager for .agent/ADR.md
 * Chronological append, commit linking, keyword formatting for RipGrep
 */
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { ADR } from '../schemas/index.js';

import { ensureDirectory, calculateHash } from './file-state-manager.js';

const ADR_FILE = 'ADR.md';
const AGENT_DIR = '.agent';

/**
 * ADR entry for markdown format
 */
export interface ADREntry {
  id: string;
  title: string;
  decision: string;
  rationale: string;
  keywords: string[];
  status: ADR['status'];
  createdBy: ADR['created_by'];
  commitHash?: string;
}

/**
 * ADR manager for .agent/ADR.md
 */
export class ADRManager {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  private getFilePath(): string {
    return join(this.basePath, AGENT_DIR, ADR_FILE);
  }

  /**
   * Read the ADR file
   */
  async read(): Promise<string> {
    try {
      return await readFile(this.getFilePath(), 'utf-8');
    } catch {
      return '';
    }
  }

  /**
   * Initialize ADR file with header
   */
  async initialize(): Promise<void> {
    const header = `# Architecture Decision Records

This file contains architectural decisions made during project development.
Each ADR is immutable once committed. Keywords are formatted for RipGrep optimization.

---

`;
    await ensureDirectory(join(this.basePath, AGENT_DIR));
    await writeFile(this.getFilePath(), header, 'utf-8');
  }

  /**
   * Append a new ADR entry
   */
  async append(entry: ADREntry): Promise<void> {
    const exists = await this.exists();
    if (!exists) {
      await this.initialize();
    }

    const now = new Date().toISOString();
    const keywordsFormatted = entry.keywords.map((k) => `\`${k}\``).join(', ');
    const commitLine = entry.commitHash !== undefined ? `- **Commit**: \`${entry.commitHash}\`\n` : '';

    const markdown = `
## ${entry.id}: ${entry.title}

- **Status**: ${entry.status}
- **Date**: ${now}
- **Author**: ${entry.createdBy}
${commitLine}- **Keywords**: ${keywordsFormatted}

### Decision

${entry.decision}

### Rationale

${entry.rationale}

---
`;

    await appendFile(this.getFilePath(), markdown, 'utf-8');
  }

  /**
   * Get the last N ADR IDs
   */
  async getLastADRIds(count: number = 5): Promise<string[]> {
    const content = await this.read();
    const adrRegex = /^## (ADR-\d{3}):/gm;
    const ids: string[] = [];

    let match;
    while ((match = adrRegex.exec(content)) !== null) {
      ids.push(match[1] ?? '');
    }

    return ids.slice(-count);
  }

  /**
   * Get the next ADR ID
   */
  async getNextId(): Promise<string> {
    const lastIds = await this.getLastADRIds(1);
    if (lastIds.length === 0) {
      return 'ADR-001';
    }

    const lastId = lastIds[0] ?? 'ADR-000';
    const lastNum = parseInt(lastId.split('-')[1] ?? '0', 10);
    return `ADR-${String(lastNum + 1).padStart(3, '0')}`;
  }

  /**
   * Search ADRs by keyword
   */
  async searchByKeyword(keyword: string): Promise<string[]> {
    const content = await this.read();
    const sections = content.split(/^## /m).slice(1);

    return sections
      .filter((section) => section.toLowerCase().includes(keyword.toLowerCase()))
      .map((section) => {
        const match = section.match(/^(ADR-\d{3}):/);
        return match?.[1] ?? '';
      })
      .filter((id) => id !== '');
  }

  /**
   * Get content hash for change detection
   */
  async getHash(): Promise<string> {
    const content = await this.read();
    return calculateHash(content);
  }

  /**
   * Check if file exists
   */
  async exists(): Promise<boolean> {
    try {
      await readFile(this.getFilePath());
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get total ADR count
   */
  async getCount(): Promise<number> {
    const content = await this.read();
    const matches = content.match(/^## ADR-\d{3}:/gm);
    return matches?.length ?? 0;
  }
}

/**
 * Create an ADR manager instance
 */
export function createADRManager(basePath: string): ADRManager {
  return new ADRManager(basePath);
}
