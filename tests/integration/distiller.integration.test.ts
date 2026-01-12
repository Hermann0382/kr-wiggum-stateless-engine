/**
 * Integration tests for distiller service
 * Tests the full flow from brainstorm to PRD generation
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  parseBrainstorm,
  analyzePatterns,
  generatePRD,
  breakdownToAtomicTasks,
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
      const brainstormContent = `
# Project Brainstorm

## Client Requirements
The client needs a dashboard that shows real-time analytics.
They want to see user engagement metrics and conversion rates.
The design should be modern and intuitive.

## Technical Notes
We should use WebSocket for real-time updates.
Consider using React with TypeScript for the frontend.
The backend could be Express or NestJS.

## Random Notes
Had a meeting today about the project timeline.
Coffee break discussion about UI frameworks.
      `;

      const result = parseBrainstorm(brainstormContent);

      expect(result.clientVoice.length).toBeGreaterThan(0);
      expect(result.engineerVoice.length).toBeGreaterThan(0);
      expect(result.noise.length).toBeGreaterThan(0);

      // Client voice should contain requirements
      const clientContent = result.clientVoice.map((s) => s.content).join(' ');
      expect(clientContent.toLowerCase()).toContain('dashboard');

      // Engineer voice should contain technical details
      const engineerContent = result.engineerVoice.map((s) => s.content).join(' ');
      expect(engineerContent.toLowerCase()).toContain('websocket');
    });

    it('should generate a PRD from parsed brainstorm', () => {
      const brainstormContent = `
## Requirements
Users need to login with email and password.
They should be able to view their profile.
Admins can manage all users.

## Technical Approach
Use JWT for authentication.
Store sessions in Redis.
      `;

      const parsed = parseBrainstorm(brainstormContent);
      const prd = generatePRD(parsed, 'Test Project');

      expect(prd.project_name).toBe('Test Project');
      expect(prd.user_stories.length).toBeGreaterThan(0);
      expect(prd.technical_requirements.length).toBeGreaterThan(0);

      // Check user story format
      const userStory = prd.user_stories[0];
      expect(userStory).toBeDefined();
      if (userStory) {
        expect(userStory.id).toMatch(/^US-\d{3}$/);
        expect(userStory.story).toBeTruthy();
        expect(userStory.acceptance_criteria.length).toBeGreaterThan(0);
      }
    });

    it('should breakdown PRD into atomic tasks', () => {
      const brainstormContent = `
## Features
1. User registration with email verification
2. Login with password reset functionality
3. Profile management with avatar upload
      `;

      const parsed = parseBrainstorm(brainstormContent);
      const prd = generatePRD(parsed, 'Auth System');
      const breakdown = breakdownToAtomicTasks(prd);

      expect(breakdown.success).toBe(true);
      expect(breakdown.tasks.length).toBeGreaterThanOrEqual(5);
      expect(breakdown.tasks.length).toBeLessThanOrEqual(10);

      // Check task constraints
      for (const task of breakdown.tasks) {
        expect(task.id).toMatch(/^TASK-\d{3}$/);
        expect(task.estimated_minutes).toBeGreaterThanOrEqual(15);
        expect(task.estimated_minutes).toBeLessThanOrEqual(30);
        expect(task.files_to_modify.length).toBeLessThanOrEqual(5);
      }

      // Check dependency layers
      const layers = [...new Set(breakdown.tasks.map((t) => t.dependency_layer))];
      expect(layers.length).toBeGreaterThanOrEqual(1);

      // Layer 1 tasks should have no dependencies
      const layer1Tasks = breakdown.tasks.filter((t) => t.dependency_layer === 1);
      for (const task of layer1Tasks) {
        expect(task.dependencies.length).toBe(0);
      }
    });
  });

  describe('Pattern Analysis', () => {
    it('should find patterns in source files', async () => {
      // Create test source files
      await writeFile(
        join(testDir, 'src', 'auth.ts'),
        `
// US-001: User authentication
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
// US-002: Profile management
export function getProfile(userId: string): Promise<Profile> {
  // Implementation
}

export function updateProfile(userId: string, data: ProfileData): Promise<Profile> {
  // Implementation
}
      `
      );

      const patterns = await analyzePatterns(testDir, ['US-001', 'US-002', 'function']);

      expect(patterns.searchResults.length).toBeGreaterThan(0);

      // Should find US-001 pattern
      const us001Results = patterns.searchResults.find((r) =>
        r.matches.some((m) => m.content.includes('US-001'))
      );
      expect(us001Results).toBeDefined();
    });

    it('should handle missing patterns gracefully', async () => {
      await writeFile(
        join(testDir, 'src', 'empty.ts'),
        'export const empty = true;'
      );

      const patterns = await analyzePatterns(testDir, ['nonexistent-pattern']);

      expect(patterns.searchResults).toBeDefined();
      // Should return empty or zero-count results
      const hasMatches = patterns.searchResults.some((r) => r.totalCount > 0);
      expect(hasMatches).toBe(false);
    });
  });

  describe('Voice Separation Quality', () => {
    it('should correctly classify technical vs client language', () => {
      const mixedContent = `
The users want a beautiful interface that's easy to use.
We need to implement a REST API with proper error handling.
The client expects the app to load in under 2 seconds.
Consider using Redis for caching frequently accessed data.
They mentioned wanting social media integration.
The database schema should normalize user data properly.
      `;

      const result = parseBrainstorm(mixedContent);

      // Client voice should have user-focused content
      const clientKeywords = ['user', 'beautiful', 'easy', 'expect', 'social'];
      const clientContent = result.clientVoice.map((s) => s.content.toLowerCase()).join(' ');

      // Engineer voice should have technical content
      const engineerKeywords = ['api', 'redis', 'caching', 'database', 'schema'];
      const engineerContent = result.engineerVoice.map((s) => s.content.toLowerCase()).join(' ');

      // At least some technical keywords in engineer voice
      const hasTechnicalContent = engineerKeywords.some((kw) =>
        engineerContent.includes(kw)
      );
      expect(hasTechnicalContent).toBe(true);
    });

    it('should extract meaningful keywords from segments', () => {
      const content = `
Implement a user authentication system with OAuth2 support.
The system should handle JWT tokens and refresh tokens.
Include rate limiting to prevent abuse.
      `;

      const result = parseBrainstorm(content);
      const allKeywords = [
        ...result.clientVoice.flatMap((s) => s.keywords),
        ...result.engineerVoice.flatMap((s) => s.keywords),
      ];

      // Should extract relevant keywords
      const relevantKeywords = ['authentication', 'oauth', 'jwt', 'token', 'rate'];
      const hasRelevantKeywords = relevantKeywords.some((kw) =>
        allKeywords.some((k) => k.toLowerCase().includes(kw))
      );

      expect(hasRelevantKeywords).toBe(true);
    });
  });

  describe('Task Dependency Resolution', () => {
    it('should create proper dependency layers', () => {
      const brainstormContent = `
## Features
1. Database schema setup
2. User model implementation
3. Authentication service
4. Login endpoint
5. Profile page
      `;

      const parsed = parseBrainstorm(brainstormContent);
      const prd = generatePRD(parsed, 'Layered System');
      const breakdown = breakdownToAtomicTasks(prd);

      // Group tasks by layer
      const tasksByLayer: Record<number, typeof breakdown.tasks> = {};
      for (const task of breakdown.tasks) {
        const layer = task.dependency_layer;
        if (!tasksByLayer[layer]) {
          tasksByLayer[layer] = [];
        }
        tasksByLayer[layer].push(task);
      }

      // Verify layer ordering
      const layers = Object.keys(tasksByLayer).map(Number).sort((a, b) => a - b);

      for (const layer of layers) {
        const tasks = tasksByLayer[layer] ?? [];
        for (const task of tasks) {
          // Dependencies should be in lower layers
          for (const depId of task.dependencies) {
            const depTask = breakdown.tasks.find((t) => t.id === depId);
            if (depTask) {
              expect(depTask.dependency_layer).toBeLessThan(task.dependency_layer);
            }
          }
        }
      }
    });
  });
});
