/**
 * Tests for FileStateManager base class
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile, readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { z } from 'zod';

import { FileStateManager, type FileStateOptions } from '../../src/state/file-state-manager.js';

// Test schema
const TestSchema = z.object({
  id: z.string(),
  name: z.string(),
  count: z.number().min(0),
  active: z.boolean(),
});

type TestState = z.infer<typeof TestSchema>;

// Concrete implementation for testing
class TestStateManager extends FileStateManager<TestState> {
  private readonly filename: string;

  constructor(options: FileStateOptions, filename = 'test-state.json') {
    super(options);
    this.filename = filename;
  }

  protected getSchema(): z.ZodSchema<TestState> {
    return TestSchema;
  }

  protected getFilePath(): string {
    return join(this.basePath, this.filename);
  }

  protected getDefaultState(): TestState {
    return {
      id: 'default',
      name: 'Default State',
      count: 0,
      active: false,
    };
  }

  // Expose for testing
  async deleteFile(): Promise<void> {
    try {
      await unlink(this.getFilePath());
    } catch {
      // Ignore if file doesn't exist
    }
  }
}

describe('FileStateManager', () => {
  let testDir: string;
  let manager: TestStateManager;

  beforeEach(async () => {
    // Create temp directory
    testDir = join(tmpdir(), `kr-wiggum-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    manager = new TestStateManager({ basePath: testDir });
  });

  afterEach(async () => {
    // Cleanup temp directory
    await rm(testDir, { recursive: true, force: true });
  });

  describe('read', () => {
    it('should return default state when file does not exist', async () => {
      const state = await manager.read();
      expect(state).toEqual({
        id: 'default',
        name: 'Default State',
        count: 0,
        active: false,
      });
    });

    it('should read existing state from file', async () => {
      const existingState: TestState = {
        id: 'existing',
        name: 'Existing State',
        count: 5,
        active: true,
      };

      await writeFile(
        join(testDir, 'test-state.json'),
        JSON.stringify(existingState, null, 2)
      );

      const state = await manager.read();
      expect(state).toEqual(existingState);
    });

    it('should throw on invalid JSON when createIfMissing is false', async () => {
      const strictManager = new TestStateManager({ basePath: testDir, createIfMissing: false });
      await writeFile(join(testDir, 'test-state.json'), 'not valid json');

      await expect(strictManager.read()).rejects.toThrow();
    });

    it('should throw on schema validation failure when createIfMissing is false', async () => {
      const strictManager = new TestStateManager({ basePath: testDir, createIfMissing: false });
      const invalidState = {
        id: 'test',
        name: 'Test',
        count: -5, // Invalid: negative count
        active: true,
      };

      await writeFile(
        join(testDir, 'test-state.json'),
        JSON.stringify(invalidState, null, 2)
      );

      await expect(strictManager.read()).rejects.toThrow();
    });

    it('should return default state on invalid data when createIfMissing is true', async () => {
      // Manager with createIfMissing: true (default)
      await writeFile(join(testDir, 'test-state.json'), 'not valid json');

      // Should fallback to default state instead of throwing
      const state = await manager.read();
      expect(state).toEqual({
        id: 'default',
        name: 'Default State',
        count: 0,
        active: false,
      });
    });
  });

  describe('write', () => {
    it('should write state to file', async () => {
      const newState: TestState = {
        id: 'new',
        name: 'New State',
        count: 10,
        active: true,
      };

      await manager.write(newState);

      const content = await readFile(join(testDir, 'test-state.json'), 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed).toEqual(newState);
    });

    it('should validate state before writing', async () => {
      const invalidState = {
        id: 'test',
        name: 'Test',
        count: -5,
        active: true,
      } as TestState;

      await expect(manager.write(invalidState)).rejects.toThrow();
    });

    it('should create directory if it does not exist', async () => {
      const nestedDir = join(testDir, 'nested', 'dir');
      const nestedManager = new TestStateManager({ basePath: nestedDir });

      const state: TestState = {
        id: 'nested',
        name: 'Nested State',
        count: 1,
        active: true,
      };

      await nestedManager.write(state);

      const content = await readFile(join(nestedDir, 'test-state.json'), 'utf-8');
      expect(JSON.parse(content)).toEqual(state);
    });
  });

  describe('update', () => {
    it('should update existing state with partial data', async () => {
      const initialState: TestState = {
        id: 'initial',
        name: 'Initial State',
        count: 0,
        active: false,
      };

      await manager.write(initialState);

      await manager.update({ count: 5, active: true });

      const state = await manager.read();
      expect(state).toEqual({
        id: 'initial',
        name: 'Initial State',
        count: 5,
        active: true,
      });
    });

    it('should create state if none exists', async () => {
      await manager.update({ name: 'Updated Name' });

      const state = await manager.read();
      expect(state.name).toBe('Updated Name');
    });
  });

  describe('exists', () => {
    it('should return false when file does not exist', async () => {
      const exists = await manager.exists();
      expect(exists).toBe(false);
    });

    it('should return true when file exists', async () => {
      await manager.write({
        id: 'test',
        name: 'Test',
        count: 0,
        active: false,
      });

      const exists = await manager.exists();
      expect(exists).toBe(true);
    });
  });

  describe('delete (via deleteFile helper)', () => {
    it('should delete existing file', async () => {
      await manager.write({
        id: 'test',
        name: 'Test',
        count: 0,
        active: false,
      });

      expect(await manager.exists()).toBe(true);

      await manager.deleteFile();

      expect(await manager.exists()).toBe(false);
    });

    it('should not throw when deleting non-existent file', async () => {
      await expect(manager.deleteFile()).resolves.not.toThrow();
    });
  });
});
