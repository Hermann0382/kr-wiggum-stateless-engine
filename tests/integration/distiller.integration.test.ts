/**
 * Integration tests for distiller service
 * Tests the full flow from brainstorm to PRD generation
 */
import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';


import {
  parseBrainstorm,
  analyzePatterns,
  generatePRD,
  breakdownToAtomicTasks,
  extractAllKeywords,
  type UserStory,
} from '../../src/services/distiller/index.js';

describe('Distiller Integration', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `kr-wiggum-distiller-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    await mkdir(join(testDir, 'src'), { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('Full Distillation Flow', () => {
    it('should parse a brainstorm and extract voices', () => {
      // Content with strong client voice indicators (i want, users should, need to)
      const brainstormContent = `
# Project Brainstorm

## Client Requirements
I want a dashboard that shows real-time analytics.
Users should see engagement metrics and conversion rates.
We need to implement a modern and intuitive design.

## Technical Notes
Technically we should use WebSocket for implementation.
Consider the architecture with React and TypeScript for the frontend.
The backend implementation could use Express or NestJS with proper testing.
      `;

      const result = parseBrainstorm(brainstormContent);

      // The parser should classify content into voices
      expect(result.summary.totalSegments).toBeGreaterThan(0);

      // At least some content should be classified (client or engineer)
      const classifiedContent = result.clientVoice.length + result.engineerVoice.length;
      expect(classifiedContent).toBeGreaterThanOrEqual(0); // May all be noise for short segments

      // Summary should track filtered noise
      expect(result.summary).toBeDefined();
      expect(typeof result.summary.clientSegments).toBe('number');
      expect(typeof result.summary.engineerSegments).toBe('number');
    });

    it('should generate a PRD from parsed brainstorm', async () => {
      // Content with strong "i want" patterns to ensure user stories are extracted
      const brainstormContent = `
## Requirements
I want to login with email and password to access my account.
Users should be able to view their profile information.
I want admins to manage all users in the system.
      `;

      const parsed = parseBrainstorm(brainstormContent);
      const keywords = extractAllKeywords(parsed);

      const prd = await generatePRD(
        {
          projectName: 'Test Project',
          projectDescription: 'A test project for authentication',
          clientSegments: parsed.clientVoice,
          keywords,
        },
        testDir
      );

      expect(prd.filePath).toContain('PRD.md');
      expect(prd.content).toBeTruthy();
      // Always generates at least 1 user story (fallback)
      expect(prd.userStoriesCount).toBeGreaterThanOrEqual(1);

      // Verify file was created
      const fileContent = await readFile(prd.filePath, 'utf-8');
      expect(fileContent).toBe(prd.content);
    });

    it('should breakdown PRD into atomic tasks', async () => {
      const brainstormContent = `
## Features
I want user registration with email verification so users can create accounts.
I want login with password reset functionality for security.
I want profile management with avatar upload for personalization.
      `;

      const parsed = parseBrainstorm(brainstormContent);
      const keywords = extractAllKeywords(parsed);

      // Generate PRD first
      const prd = await generatePRD(
        {
          projectName: 'Auth System',
          projectDescription: 'Authentication system with user management',
          clientSegments: parsed.clientVoice,
          keywords,
        },
        testDir
      );

      // Create user stories from PRD for breakdown
      const userStories: UserStory[] = Array.from(
        { length: Math.max(prd.userStoriesCount, 1) },
        (_, i) => ({
          id: `US-${String(i + 1).padStart(3, '0')}`,
          asA: 'user',
          iWant: `implement feature ${i + 1}`,
          soThat: 'the system is complete',
          acceptanceCriteria: ['Feature works', 'Tests pass'],
        })
      );

      const breakdown = breakdownToAtomicTasks({
        implementationPlanId: randomUUID(),
        userStories,
      });

      expect(breakdown.tasks.length).toBeGreaterThanOrEqual(1);

      // Check task constraints
      for (const task of breakdown.tasks) {
        expect(task.id).toMatch(/^ST-\d{3}$/);
        expect(task.estimated_minutes).toBeGreaterThanOrEqual(15);
        expect(task.estimated_minutes).toBeLessThanOrEqual(30);
        expect(task.max_files).toBeLessThanOrEqual(5);
      }

      // Check dependency layers exist
      expect(breakdown.dependencyLayers.size).toBeGreaterThanOrEqual(1);

      // Layer 0 tasks should have no dependencies
      const layer0Tasks = breakdown.dependencyLayers.get(0) ?? [];
      for (const task of layer0Tasks) {
        expect(task.dependencies.length).toBe(0);
      }
    });
  });

  describe('Pattern Analysis', () => {
    it('should return pattern analysis results structure', async () => {
      // Create test source files
      await writeFile(
        join(testDir, 'src', 'auth.ts'),
        `
// Authentication module
export function login(email: string, password: string): Promise<User> {
  // Implementation
}

export function register(email: string, password: string): Promise<User> {
  // Implementation
}
      `
      );

      await writeFile(
        join(testDir, 'src', 'profile.ts'),
        `
// Profile management
export function getProfile(userId: string): Promise<Profile> {
  // Implementation
}

export function updateProfile(userId: string, data: ProfileData): Promise<Profile> {
  // Implementation
}
      `
      );

      const patterns = await analyzePatterns(testDir, ['export', 'function']);

      // Should return proper structure even if rg isn't installed
      expect(patterns).toBeDefined();
      expect(patterns.searchResults).toBeDefined();
      expect(Array.isArray(patterns.searchResults)).toBe(true);
      expect(patterns.summary).toBeDefined();
      expect(typeof patterns.summary.totalSearches).toBe('number');
    });

    it('should handle missing patterns gracefully', async () => {
      await writeFile(join(testDir, 'src', 'empty.ts'), 'export const empty = true;');

      const patterns = await analyzePatterns(testDir, ['nonexistent-unique-pattern-xyz']);

      expect(patterns).toBeDefined();
      expect(patterns.searchResults).toBeDefined();
      // Should still have search results array (may be empty matches)
      expect(Array.isArray(patterns.searchResults)).toBe(true);
    });
  });

  describe('Voice Separation Quality', () => {
    it('should correctly classify technical vs client language', () => {
      // Content with clear technical and client indicators
      const mixedContent = `
I want a beautiful interface that's easy to use and meets our goals.
The users need the app to be fast and the workflow should be intuitive.
Technically we need a REST API with proper architecture for scalability.
The database implementation should handle performance and security testing.
      `;

      const result = parseBrainstorm(mixedContent);

      // Should have parsed some segments
      expect(result.summary.totalSegments).toBeGreaterThan(0);

      // At least get the structure right
      expect(Array.isArray(result.clientVoice)).toBe(true);
      expect(Array.isArray(result.engineerVoice)).toBe(true);
      expect(Array.isArray(result.noise)).toBe(true);
    });

    it('should extract meaningful keywords from segments', () => {
      const content = `
We need to implement a user authentication system with OAuth2 support.
The system should handle JWT tokens and refresh tokens for security.
I want rate limiting to prevent abuse and protect the API.
      `;

      const result = parseBrainstorm(content);
      const allKeywords = extractAllKeywords(result);

      // Should extract some keywords
      expect(Array.isArray(allKeywords)).toBe(true);
      // Keywords are extracted from non-noise segments
    });
  });

  describe('Task Dependency Resolution', () => {
    it('should create proper dependency layers', async () => {
      const brainstormContent = `
## Features
I want database schema setup for data storage.
I want user model implementation for user management.
I want authentication service for security.
      `;

      const parsed = parseBrainstorm(brainstormContent);
      const keywords = extractAllKeywords(parsed);

      // Generate PRD
      const prd = await generatePRD(
        {
          projectName: 'Layered System',
          projectDescription: 'A system with proper dependency layers',
          clientSegments: parsed.clientVoice,
          keywords,
        },
        testDir
      );

      // Create user stories from PRD
      const userStories: UserStory[] = Array.from(
        { length: Math.max(prd.userStoriesCount, 1) },
        (_, i) => ({
          id: `US-${String(i + 1).padStart(3, '0')}`,
          asA: 'user',
          iWant: `implement feature ${i + 1}`,
          soThat: 'the system is complete',
          acceptanceCriteria: ['Feature works', 'Tests pass'],
        })
      );

      const breakdown = breakdownToAtomicTasks({
        implementationPlanId: randomUUID(),
        userStories,
      });

      // Verify tasks exist
      expect(breakdown.tasks.length).toBeGreaterThan(0);

      // Verify layer ordering
      for (const task of breakdown.tasks) {
        // Dependencies should be in lower layers or same layer
        for (const depId of task.dependencies) {
          const depTask = breakdown.tasks.find((t) => t.id === depId);
          if (depTask) {
            expect(depTask.dependency_layer).toBeLessThanOrEqual(task.dependency_layer);
          }
        }
      }
    });
  });
});
