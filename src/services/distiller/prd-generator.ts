/**
 * PRD.md generation
 * Generates specs/PRD.md with User Stories, Business Logic, Success Criteria
 */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ensureDirectory } from '../../state/index.js';

import type { VoiceSegment } from './brainstorm-parser.js';

/**
 * User story from client voice
 */
export interface UserStory {
  id: string;
  asA: string;
  iWant: string;
  soThat: string;
  acceptanceCriteria: string[];
}

/**
 * Business rule from requirements
 */
export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  constraints: string[];
}

/**
 * PRD generation input
 */
export interface PRDInput {
  projectName: string;
  projectDescription: string;
  clientSegments: VoiceSegment[];
  keywords: string[];
  version?: string;
}

/**
 * PRD generation result
 */
export interface PRDResult {
  filePath: string;
  content: string;
  userStoriesCount: number;
  businessRulesCount: number;
}

/**
 * Extract user stories from client voice segments
 */
function extractUserStories(segments: VoiceSegment[]): UserStory[] {
  const stories: UserStory[] = [];
  let storyId = 1;

  for (const segment of segments) {
    // Look for "I want" or "users should" patterns
    const wantMatch = segment.content.match(/(?:i want|users? should|we need)\s+(.+?)(?:\.|$)/i);
    if (wantMatch !== null) {
      const iWant = wantMatch[1]?.trim() ?? '';

      // Try to extract "so that" benefit
      const benefitMatch = segment.content.match(/(?:so that|in order to|to)\s+(.+?)(?:\.|$)/i);
      const soThat = benefitMatch?.[1]?.trim() ?? 'achieve the desired outcome';

      stories.push({
        id: `US-${String(storyId).padStart(3, '0')}`,
        asA: 'user',
        iWant,
        soThat,
        acceptanceCriteria: [
          `The feature ${iWant.toLowerCase()} is implemented`,
          'The feature is tested and working',
          'Documentation is updated',
        ],
      });
      storyId++;
    }
  }

  // Ensure at least one story
  if (stories.length === 0) {
    stories.push({
      id: 'US-001',
      asA: 'user',
      iWant: 'use the system effectively',
      soThat: 'I can accomplish my goals',
      acceptanceCriteria: ['System is functional', 'Documentation exists'],
    });
  }

  return stories;
}

/**
 * Extract business rules from segments
 */
function extractBusinessRules(segments: VoiceSegment[]): BusinessRule[] {
  const rules: BusinessRule[] = [];
  let ruleId = 1;

  for (const segment of segments) {
    // Look for "must" or "should" or "requirement" patterns
    const ruleMatch = segment.content.match(/(?:must|should|requirement|constraint)\s+(.+?)(?:\.|$)/i);
    if (ruleMatch !== null) {
      rules.push({
        id: `BR-${String(ruleId).padStart(3, '0')}`,
        name: `Business Rule ${ruleId}`,
        description: ruleMatch[1]?.trim() ?? '',
        constraints: [],
      });
      ruleId++;
    }
  }

  return rules;
}

/**
 * Generate PRD markdown content
 */
function generatePRDContent(input: PRDInput, stories: UserStory[], rules: BusinessRule[]): string {
  const version = input.version ?? '1.0.0';
  const date = new Date().toISOString().split('T')[0];

  let content = `# Product Requirements Document (PRD)

## Project: ${input.projectName}

**Version**: ${version}
**Date**: ${date}
**Status**: Draft

---

## 1. Overview

${input.projectDescription}

---

## 2. Keywords

The following keywords are optimized for RipGrep search:

${input.keywords.map((k) => `\`${k}\``).join(', ')}

---

## 3. User Stories

`;

  for (const story of stories) {
    content += `### ${story.id}

**As a** ${story.asA}
**I want** ${story.iWant}
**So that** ${story.soThat}

**Acceptance Criteria:**
${story.acceptanceCriteria.map((ac) => `- [ ] ${ac}`).join('\n')}

---

`;
  }

  content += `## 4. Business Rules

`;

  if (rules.length > 0) {
    for (const rule of rules) {
      content += `### ${rule.id}: ${rule.name}

${rule.description}

`;
    }
  } else {
    content += `*No specific business rules identified.*

`;
  }

  content += `---

## 5. Success Criteria

- [ ] All user stories implemented and tested
- [ ] Code coverage > 80%
- [ ] Zero TypeScript errors
- [ ] Documentation complete
- [ ] Performance benchmarks met

---

## 6. Out of Scope

*Items explicitly not included in this release.*

---

## 7. Dependencies

*External dependencies and integrations.*

---

## 8. Appendix

### A. Glossary

*Terms and definitions.*

### B. References

*Related documents and resources.*
`;

  return content;
}

/**
 * Generate PRD.md file
 */
export async function generatePRD(input: PRDInput, outputPath: string): Promise<PRDResult> {
  const stories = extractUserStories(input.clientSegments);
  const rules = extractBusinessRules(input.clientSegments);
  const content = generatePRDContent(input, stories, rules);

  const specsDir = join(outputPath, 'specs');
  await ensureDirectory(specsDir);

  const filePath = join(specsDir, 'PRD.md');
  await writeFile(filePath, content, 'utf-8');

  return {
    filePath,
    content,
    userStoriesCount: stories.length,
    businessRulesCount: rules.length,
  };
}

/**
 * Update existing PRD with new content
 */
export async function updatePRD(
  existingPath: string,
  updates: Partial<PRDInput>
): Promise<PRDResult> {
  // For now, regenerate - in future, merge updates
  throw new Error('PRD update not implemented - PRDs should be immutable');
}
