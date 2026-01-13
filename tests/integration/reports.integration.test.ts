/**
 * Integration tests for reports service
 * Tests shift reports, forensic analysis, sanity checks, and client docs
 */
import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';


import {
  generateShiftReport,
  runForensicAnalysis,
  generateForensicReport,
  runFinalSanityCheck,
  generateSanityReport,
  generateClientDoc,
} from '../../src/services/reports/index.js';
import type { ManagerSession } from '../../src/types/index.js';

describe('Reports Integration', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `kr-wiggum-reports-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    await mkdir(join(testDir, 'src'), { recursive: true });
    await mkdir(join(testDir, '.agent'), { recursive: true });
    await mkdir(join(testDir, '.ralph'), { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('ShiftReportGenerator', () => {
    it('should generate a shift report from session data', async () => {
      const session: ManagerSession = {
        sessionId: randomUUID(),
        projectId: randomUUID(),
        startedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
        contextFillAtStart: 10,
        currentContextFill: 45,
        tasksAssigned: ['ST-001', 'ST-002', 'ST-003'],
        tasksCompleted: ['ST-001', 'ST-002'],
        adrsCreated: ['ADR-001'],
        handoffFile: null,
      };

      const result = await generateShiftReport({
        basePath: testDir,
        session,
        costUsd: 5.25,
      });

      expect(result.report).toBeDefined();
      expect(result.report.tasks_completed).toEqual(['ST-001', 'ST-002']);
      expect(result.report.duration_minutes).toBeGreaterThanOrEqual(29);
      expect(result.report.cost_usd).toBe(5.25);
      expect(result.report.executive_summary.length).toBeGreaterThan(50);

      // Check file was written
      const fileContent = await readFile(result.filePath, 'utf-8');
      expect(fileContent).toContain('# Shift Report');
      expect(fileContent).toContain('ST-001');
    });

    it('should handle session with no completed tasks', async () => {
      const session: ManagerSession = {
        sessionId: randomUUID(),
        projectId: randomUUID(),
        startedAt: new Date(),
        contextFillAtStart: 5,
        currentContextFill: 5,
        tasksAssigned: [],
        tasksCompleted: [],
        adrsCreated: [],
        handoffFile: null,
      };

      const result = await generateShiftReport({
        basePath: testDir,
        session,
      });

      expect(result.report.tasks_completed).toEqual([]);
      expect(result.report.executive_summary).toContain('No tasks');
    });
  });

  describe('ForensicAnalyzer', () => {
    it('should analyze project for issues', async () => {
      // Create some test files
      await writeFile(
        join(testDir, 'src', 'index.ts'),
        'export const hello = "world";'
      );

      // Create telemetry file
      await writeFile(
        join(testDir, '.ralph', 'telemetry.json'),
        JSON.stringify({
          id: randomUUID(),
          project_id: randomUUID(),
          session_id: randomUUID(),
          agent_type: 'manager',
          context_fill_percent: 50,
          zone: 'degrading',
          guardrail_status: 'all_passing',
          tokens_used: 100000,
          tokens_remaining: 100000,
          heartbeat_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      );

      const analysis = await runForensicAnalysis({
        basePath: testDir,
        lookbackMinutes: 60,
      });

      expect(analysis).toBeDefined();
      expect(analysis.timestamp).toBeDefined();
      expect(analysis.crisisType).toBeDefined();
      expect(Array.isArray(analysis.findings)).toBe(true);
      expect(Array.isArray(analysis.recoverySteps)).toBe(true);
      expect(Array.isArray(analysis.preventionMeasures)).toBe(true);
    });

    it('should generate markdown report from analysis', async () => {
      const analysis = await runForensicAnalysis({
        basePath: testDir,
        lookbackMinutes: 5,
      });

      const report = generateForensicReport(analysis);

      expect(report).toContain('# Post-Crisis Forensic Analysis');
      expect(report).toContain('## Root Cause');
      expect(report).toContain('## Recovery Steps');
    });
  });

  describe('FinalSanityChecker', () => {
    it('should check project readiness', async () => {
      // Create minimal project structure
      await writeFile(
        join(testDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          dependencies: {
            zod: '^3.0.0',
          },
          devDependencies: {
            typescript: '^5.0.0',
            vitest: '^1.0.0',
          },
          scripts: {
            build: 'tsc',
            test: 'vitest run',
          },
        })
      );

      await writeFile(
        join(testDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            target: 'ES2022',
            strict: true,
          },
        })
      );

      await writeFile(
        join(testDir, 'src', 'index.ts'),
        'export const main = () => console.log("Hello");'
      );

      const result = await runFinalSanityCheck({
        basePath: testDir,
        skipGuardrails: true, // Skip for test speed
      });

      expect(result).toBeDefined();
      expect(result.summary.total).toBeGreaterThan(0);
      expect(Array.isArray(result.categories)).toBe(true);

      // Should pass basic file checks
      const fileCategory = result.categories.find(
        (c) => c.category === 'Required Files'
      );
      expect(fileCategory).toBeDefined();
    });

    it('should generate markdown report', async () => {
      await writeFile(
        join(testDir, 'package.json'),
        JSON.stringify({ name: 'test', version: '1.0.0' })
      );

      const result = await runFinalSanityCheck({
        basePath: testDir,
        skipGuardrails: true,
      });

      const report = generateSanityReport(result);

      expect(report).toContain('# Final Sanity Check');
      expect(report).toContain('## Summary');
      expect(report).toContain('## Detailed Results');
    });
  });

  describe('ClientDocGenerator', () => {
    it('should generate README_CLIENT.md', async () => {
      await writeFile(
        join(testDir, 'package.json'),
        JSON.stringify({
          name: 'my-awesome-project',
          version: '2.1.0',
          description: 'An awesome project for testing',
          author: 'Test Author',
          license: 'MIT',
          repository: 'https://github.com/test/repo',
        })
      );

      const result = await generateClientDoc({
        basePath: testDir,
        features: [
          {
            name: 'Authentication',
            description: 'User authentication with JWT tokens',
            usage: 'import { auth } from "./auth";',
          },
        ],
      });

      expect(result.filePath).toContain('README_CLIENT.md');
      expect(result.content).toContain('# my-awesome-project');
      expect(result.content).toContain('An awesome project for testing');
      expect(result.content).toContain('## Installation');
      expect(result.content).toContain('## Features');
      expect(result.content).toContain('Authentication');
      expect(result.content).toContain('MIT License');

      // Verify file was written
      const fileContent = await readFile(result.filePath, 'utf-8');
      expect(fileContent).toBe(result.content);
    });

    it('should handle missing package.json gracefully', async () => {
      const result = await generateClientDoc({
        basePath: testDir,
        metadata: {
          name: 'Custom Project',
          version: '1.0.0',
        },
      });

      expect(result.content).toContain('# Custom Project');
      expect(result.content).toContain('1.0.0');
    });

    it('should include custom sections', async () => {
      await writeFile(
        join(testDir, 'package.json'),
        JSON.stringify({ name: 'test', version: '1.0.0' })
      );

      const result = await generateClientDoc({
        basePath: testDir,
        customSections: [
          {
            title: 'Custom Section',
            content: 'This is custom content for the client.',
          },
        ],
      });

      expect(result.content).toContain('## Custom Section');
      expect(result.content).toContain('This is custom content');
    });
  });
});
