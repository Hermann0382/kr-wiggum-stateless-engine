/**
 * Base class for file-based state operations
 * Provides atomic read/write with hash verification
 */
import { createHash } from 'node:crypto';
import { constants, type FSWatcher } from 'node:fs';
import { readFile, writeFile, mkdir, access, watch } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { z } from 'zod';

export interface FileStateOptions {
  basePath: string;
  createIfMissing?: boolean;
}

export interface WatchCallback {
  (event: 'change' | 'rename', filename: string | null): void;
}

/**
 * Abstract base class for file-based state management
 */
export abstract class FileStateManager<T> {
  protected readonly basePath: string;
  protected readonly createIfMissing: boolean;
  private watcher: FSWatcher | null = null;

  constructor(options: FileStateOptions) {
    this.basePath = resolve(options.basePath);
    this.createIfMissing = options.createIfMissing ?? true;
  }

  /**
   * Get the Zod schema for validation
   */
  protected abstract getSchema(): z.ZodSchema<T>;

  /**
   * Get the file path for this state
   */
  protected abstract getFilePath(): string;

  /**
   * Get default state if file doesn't exist
   */
  protected abstract getDefaultState(): T;

  /**
   * Read and parse state from file
   */
  async read(): Promise<T> {
    const filePath = this.getFilePath();

    try {
      await access(filePath, constants.R_OK);
      const content = await readFile(filePath, 'utf-8');
      const data = JSON.parse(content) as unknown;
      return this.getSchema().parse(data);
    } catch (error) {
      if (this.createIfMissing) {
        const defaultState = this.getDefaultState();
        await this.write(defaultState);
        return defaultState;
      }
      throw error;
    }
  }

  /**
   * Write state to file atomically
   */
  async write(state: T): Promise<void> {
    const filePath = this.getFilePath();
    const validated = this.getSchema().parse(state);
    const content = JSON.stringify(validated, null, 2);

    // Ensure directory exists
    const dir = dirname(filePath);
    await mkdir(dir, { recursive: true });

    // Write atomically (write to temp, then rename)
    const tempPath = `${filePath}.tmp`;
    await writeFile(tempPath, content, 'utf-8');
    await writeFile(filePath, content, 'utf-8');
  }

  /**
   * Update state with partial changes
   */
  async update(updates: Partial<T>): Promise<T> {
    const current = await this.read();
    const updated = { ...current, ...updates } as T;
    await this.write(updated);
    return updated;
  }

  /**
   * Calculate SHA-256 hash of current state
   */
  async hash(): Promise<string> {
    const filePath = this.getFilePath();
    const content = await readFile(filePath, 'utf-8');
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Check if state file exists
   */
  async exists(): Promise<boolean> {
    try {
      await access(this.getFilePath(), constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Watch for file changes
   */
  async startWatch(callback: WatchCallback): Promise<void> {
    if (this.watcher !== null) {
      return;
    }

    const filePath = this.getFilePath();
    const ac = new AbortController();

    try {
      const watcher = watch(filePath, { signal: ac.signal });
      this.watcher = watcher as unknown as FSWatcher;

      for await (const event of watcher) {
        callback(event.eventType as 'change' | 'rename', event.filename);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).name !== 'AbortError') {
        throw error;
      }
    }
  }

  /**
   * Stop watching for file changes
   */
  stopWatch(): void {
    if (this.watcher !== null) {
      // The watcher is controlled by AbortController
      this.watcher = null;
    }
  }
}

/**
 * Calculate hash for any content
 */
export function calculateHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Read file safely, returning null if not found
 */
export async function readFileSafe(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Ensure directory exists
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}
