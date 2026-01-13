/**
 * Manager for LAST_COMPILER_ERROR.log
 * Error capture, truncation to 1000 tokens, clearing on success
 */
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';

import type { ErrorType } from '../schemas/index.js';

import { ensureDirectory } from './file-state-manager.js';

const ERROR_FILE = 'LAST_COMPILER_ERROR.log';

/**
 * Maximum tokens (~4000 chars for 1000 tokens)
 */
const MAX_CHARS = 4000;

/**
 * Compiler error entry
 */
export interface CompilerErrorEntry {
  errorType: ErrorType;
  filePath?: string;
  lineNumber?: number;
  columnNumber?: number;
  errorCode?: string;
  message: string;
  fullOutput: string;
}

/**
 * Parsed error from log file
 */
export interface ParsedCompilerError {
  errorType: ErrorType;
  timestamp: string;
  message: string;
  truncatedOutput: string;
  isTruncated: boolean;
}

/**
 * Compiler error manager for LAST_COMPILER_ERROR.log
 */
export class CompilerErrorManager {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  private getFilePath(): string {
    return join(this.basePath, ERROR_FILE);
  }

  /**
   * Truncate output to max tokens
   */
  private truncate(output: string): { truncated: string; isTruncated: boolean } {
    if (output.length <= MAX_CHARS) {
      return { truncated: output, isTruncated: false };
    }

    // Keep first portion and add truncation notice
    const truncated = output.slice(0, MAX_CHARS - 100) + '\n\n... [TRUNCATED - see full log] ...';
    return { truncated, isTruncated: true };
  }

  /**
   * Write a new compiler error
   */
  async write(entry: CompilerErrorEntry): Promise<void> {
    await ensureDirectory(this.basePath);

    const { truncated, isTruncated } = this.truncate(entry.fullOutput);
    const timestamp = new Date().toISOString();

    const content = `# LAST COMPILER ERROR
# Generated: ${timestamp}
# Type: ${entry.errorType}
# File: ${entry.filePath ?? 'N/A'}
# Line: ${entry.lineNumber ?? 'N/A'}
# Column: ${entry.columnNumber ?? 'N/A'}
# Code: ${entry.errorCode ?? 'N/A'}
# Truncated: ${isTruncated}

## Message
${entry.message}

## Output
${truncated}
`;

    await writeFile(this.getFilePath(), content, 'utf-8');
  }

  /**
   * Read and parse the error log
   */
  async read(): Promise<ParsedCompilerError | null> {
    try {
      const content = await readFile(this.getFilePath(), 'utf-8');

      const typeMatch = content.match(/^# Type: (.+)$/m);
      const timestampMatch = content.match(/^# Generated: (.+)$/m);
      const truncatedMatch = content.match(/^# Truncated: (.+)$/m);
      const messageMatch = content.match(/## Message\n([\s\S]*?)(?=\n## Output)/);
      const outputMatch = content.match(/## Output\n([\s\S]*?)$/);

      return {
        errorType: (typeMatch?.[1] ?? 'unknown') as ErrorType,
        timestamp: timestampMatch?.[1] ?? new Date().toISOString(),
        message: messageMatch?.[1]?.trim() ?? '',
        truncatedOutput: outputMatch?.[1]?.trim() ?? '',
        isTruncated: truncatedMatch?.[1] === 'true',
      };
    } catch {
      return null;
    }
  }

  /**
   * Clear the error log (on success)
   */
  async clear(): Promise<void> {
    try {
      await unlink(this.getFilePath());
    } catch {
      // File doesn't exist, that's fine
    }
  }

  /**
   * Check if error log exists
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
   * Write TypeScript error
   */
  async writeTypeScriptError(output: string, errorCode?: string): Promise<void> {
    const firstLine = output.split('\n')[0] ?? 'TypeScript compilation failed';

    await this.write({
      errorType: 'typescript',
      errorCode,
      message: firstLine,
      fullOutput: output,
    });
  }

  /**
   * Write test error
   */
  async writeTestError(output: string): Promise<void> {
    const failMatch = output.match(/FAIL\s+(.+)/);
    const message = failMatch?.[1] ?? 'Tests failed';

    await this.write({
      errorType: 'test',
      message,
      fullOutput: output,
    });
  }

  /**
   * Write ESLint error
   */
  async writeLintError(output: string): Promise<void> {
    const errorCount = output.match(/(\d+)\s+error/)?.[1] ?? '0';
    const message = `ESLint: ${errorCount} errors found`;

    await this.write({
      errorType: 'eslint',
      message,
      fullOutput: output,
    });
  }

  /**
   * Write runtime error
   */
  async writeRuntimeError(error: Error, output?: string): Promise<void> {
    await this.write({
      errorType: 'runtime',
      message: error.message,
      fullOutput: output ?? error.stack ?? error.message,
    });
  }
}

/**
 * Create a compiler error manager instance
 */
export function createCompilerErrorManager(basePath: string): CompilerErrorManager {
  return new CompilerErrorManager(basePath);
}
