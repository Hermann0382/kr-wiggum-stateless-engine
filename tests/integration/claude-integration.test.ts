/**
 * Integration tests for Claude Code CLI integration
 * Tests prompt generation, CLI detection, and spawning utilities
 */
import { describe, it, expect } from 'vitest';

import {
  generateWorkerPrompt,
  generateMinimalWorkerPrompt,
  generateManagerPrompt,
  generateMinimalManagerPrompt,
} from '../../src/prompts/index.js';
import {
  detectClaudeCli,
  isClaudeCliAvailable,
} from '../../src/services/orchestrator/cli-detector.js';

describe('Claude Code CLI Integration', () => {
  describe('CLI Detection', () => {
    it('should detect if Claude CLI is available', async () => {
      const info = await detectClaudeCli();

      // The result should be a valid ClaudeCliInfo object
      expect(info).toHaveProperty('available');
      expect(info).toHaveProperty('version');
      expect(info).toHaveProperty('path');
      expect(info).toHaveProperty('error');

      // Either available with version/path, or not available with error
      if (info.available) {
        expect(info.version).not.toBeNull();
        expect(info.path).not.toBeNull();
        expect(info.error).toBeNull();
      } else {
        expect(info.error).not.toBeNull();
      }
    });

    it('should provide boolean availability check', async () => {
      const available = await isClaudeCliAvailable();
      expect(typeof available).toBe('boolean');
    });
  });

  describe('Worker Prompt Generation', () => {
    const baseConfig = {
      taskId: 'TASK-001',
      prdPath: '/project/.agent/PRD.md',
      taskPath: '/project/.agent/tasks/TASK-001.json',
      basePath: '/project',
      projectId: 'test-project',
    };

    it('should generate a complete worker prompt', () => {
      const prompt = generateWorkerPrompt(baseConfig);

      // Should contain task ID
      expect(prompt).toContain('TASK-001');

      // Should contain file paths
      expect(prompt).toContain('/project/.agent/PRD.md');
      expect(prompt).toContain('/project/.agent/tasks/TASK-001.json');

      // Should contain Ralph Wiggum Loop instructions
      expect(prompt).toContain('EDIT');
      expect(prompt).toContain('BUILD');
      expect(prompt).toContain('TEST');

      // Should contain build commands
      expect(prompt).toContain('npm run build');
      expect(prompt).toContain('npm test');

      // Should contain exit code instructions
      expect(prompt).toContain('exit 0');
      expect(prompt).toContain('exit 1');

      // Should contain retry limit
      expect(prompt).toContain('5');
    });

    it('should respect custom maxRetries', () => {
      const prompt = generateWorkerPrompt({
        ...baseConfig,
        maxRetries: 3,
      });

      expect(prompt).toContain('3');
    });

    it('should generate a minimal worker prompt', () => {
      const prompt = generateMinimalWorkerPrompt(baseConfig);

      // Should be shorter than full prompt
      const fullPrompt = generateWorkerPrompt(baseConfig);
      expect(prompt.length).toBeLessThan(fullPrompt.length);

      // Should still contain essential info
      expect(prompt).toContain('TASK-001');
      expect(prompt).toContain('PRD');
      expect(prompt).toContain('npm run build');
      expect(prompt).toContain('npm test');
    });
  });

  describe('Manager Prompt Generation', () => {
    const baseConfig = {
      basePath: '/project',
      projectId: 'test-project',
    };

    it('should generate a complete manager prompt', () => {
      const prompt = generateManagerPrompt(baseConfig);

      // Should contain project info
      expect(prompt).toContain('test-project');
      expect(prompt).toContain('/project');

      // Should contain implementation plan reference
      expect(prompt).toContain('IMPLEMENTATION_PLAN.md');

      // Should contain task management instructions
      expect(prompt).toContain('pending');
      expect(prompt).toContain('[ ]');
      expect(prompt).toContain('[x]');

      // Should contain exit code instructions (case-insensitive check)
      expect(prompt.toLowerCase()).toContain('exit 0');
      expect(prompt.toLowerCase()).toContain('exit 10');
      expect(prompt.toLowerCase()).toContain('exit 20');

      // Should contain handoff instructions
      expect(prompt).toContain('SHIFT_HANDOFF.md');
    });

    it('should include handoff context when provided', () => {
      const prompt = generateManagerPrompt({
        ...baseConfig,
        handoffPath: '/project/.agent/SHIFT_HANDOFF.md',
      });

      expect(prompt).toContain('/project/.agent/SHIFT_HANDOFF.md');
      expect(prompt).toContain('Handoff');
      expect(prompt).toContain('previous');
    });

    it('should indicate fresh start when no handoff', () => {
      const prompt = generateManagerPrompt(baseConfig);

      expect(prompt).toContain('Fresh Start');
    });

    it('should respect custom maxTasksBeforeRotation', () => {
      const prompt = generateManagerPrompt({
        ...baseConfig,
        maxTasksBeforeRotation: 10,
      });

      expect(prompt).toContain('10');
    });

    it('should generate a minimal manager prompt', () => {
      const prompt = generateMinimalManagerPrompt(baseConfig);

      // Should be shorter than full prompt
      const fullPrompt = generateManagerPrompt(baseConfig);
      expect(prompt.length).toBeLessThan(fullPrompt.length);

      // Should still contain essential info
      expect(prompt).toContain('IMPLEMENTATION_PLAN.md');
      expect(prompt.toLowerCase()).toContain('exit 0');
      expect(prompt.toLowerCase()).toContain('exit 10');
    });
  });

  describe('Prompt Content Quality', () => {
    it('should have clear task boundaries in worker prompt', () => {
      const prompt = generateWorkerPrompt({
        taskId: 'TASK-042',
        prdPath: 'PRD.md',
        taskPath: 'task.json',
        basePath: '/app',
      });

      // Should emphasize single task focus
      expect(prompt.toLowerCase()).toContain('one');
      expect(prompt.toLowerCase()).toContain('focus');
    });

    it('should have rotation instructions in manager prompt', () => {
      const prompt = generateManagerPrompt({
        basePath: '/app',
      });

      // Should explain when to rotate
      expect(prompt.toLowerCase()).toContain('rotation');
      expect(prompt).toContain('10');
    });

    it('should not have hardcoded paths (uses config)', () => {
      const prompt = generateWorkerPrompt({
        taskId: 'TEST-999',
        prdPath: '/custom/path/to/prd.md',
        taskPath: '/custom/path/to/task.json',
        basePath: '/custom/base',
      });

      expect(prompt).toContain('/custom/path/to/prd.md');
      expect(prompt).toContain('/custom/path/to/task.json');
      expect(prompt).toContain('/custom/base');
    });
  });
});
