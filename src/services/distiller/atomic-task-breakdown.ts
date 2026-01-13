/**
 * Task breakdown logic
 * Creates tasks: 15-30 min, 3-5 files, <150 LOC, ordered by dependency
 */
import { randomUUID } from 'node:crypto';

import type { Task } from '../../schemas/index.js';

import type { UserStory } from './prd-generator.js';

/**
 * Task breakdown constraints
 */
export const TASK_CONSTRAINTS = {
  MIN_MINUTES: 15,
  MAX_MINUTES: 30,
  MIN_FILES: 1,
  MAX_FILES: 5,
  MAX_LOC: 150,
} as const;

/**
 * Task template for breakdown
 */
export interface TaskTemplate {
  title: string;
  description: string;
  estimatedMinutes: number;
  maxFiles: number;
  maxLoc: number;
  dependsOn: string[];
  keywords: string[];
}

/**
 * Breakdown input
 */
export interface BreakdownInput {
  implementationPlanId: string;
  userStories: UserStory[];
  existingTasks?: Task[];
}

/**
 * Breakdown result
 */
export interface BreakdownResult {
  tasks: Task[];
  dependencyLayers: Map<number, Task[]>;
  totalEstimatedMinutes: number;
  warnings: string[];
}

/**
 * Generate task ID
 */
function generateTaskId(index: number): string {
  return `ST-${String(index + 1).padStart(3, '0')}`;
}

/**
 * Determine dependency layer based on task type
 */
function determineDependencyLayer(title: string): number {
  const lowerTitle = title.toLowerCase();

  // Layer 0: Infrastructure and setup
  if (
    lowerTitle.includes('setup') ||
    lowerTitle.includes('config') ||
    lowerTitle.includes('schema') ||
    lowerTitle.includes('type')
  ) {
    return 0;
  }

  // Layer 1: Core services and utilities
  if (
    lowerTitle.includes('service') ||
    lowerTitle.includes('util') ||
    lowerTitle.includes('helper')
  ) {
    return 1;
  }

  // Layer 2: Features and components
  if (
    lowerTitle.includes('feature') ||
    lowerTitle.includes('component') ||
    lowerTitle.includes('implement')
  ) {
    return 2;
  }

  // Layer 3: Integration and API
  if (
    lowerTitle.includes('api') ||
    lowerTitle.includes('endpoint') ||
    lowerTitle.includes('integration')
  ) {
    return 3;
  }

  // Layer 4: Tests and documentation
  if (
    lowerTitle.includes('test') ||
    lowerTitle.includes('doc') ||
    lowerTitle.includes('readme')
  ) {
    return 4;
  }

  // Default to layer 2
  return 2;
}

/**
 * Break down a user story into atomic tasks
 */
function breakdownUserStory(story: UserStory, startIndex: number): TaskTemplate[] {
  const templates: TaskTemplate[] = [];
  const baseId = `US-${story.id}`;

  // Schema/Type definition task
  templates.push({
    title: `Define types for ${story.iWant}`,
    description: `Create TypeScript types and Zod schemas for ${story.id}`,
    estimatedMinutes: 20,
    maxFiles: 2,
    maxLoc: 100,
    dependsOn: [],
    keywords: ['type', 'schema', 'zod'],
  });

  // Service implementation task
  templates.push({
    title: `Implement service for ${story.iWant}`,
    description: `Create service layer with business logic for ${story.id}`,
    estimatedMinutes: 30,
    maxFiles: 3,
    maxLoc: 150,
    dependsOn: [generateTaskId(startIndex)],
    keywords: ['service', 'business-logic'],
  });

  // Test task
  templates.push({
    title: `Write tests for ${story.iWant}`,
    description: `Create unit tests for ${story.id} service`,
    estimatedMinutes: 25,
    maxFiles: 2,
    maxLoc: 100,
    dependsOn: [generateTaskId(startIndex + 1)],
    keywords: ['test', 'vitest', 'coverage'],
  });

  return templates;
}

/**
 * Create a Task from a template
 */
function createTaskFromTemplate(
  template: TaskTemplate,
  index: number,
  implementationPlanId: string
): Task {
  const now = new Date().toISOString();
  const layer = determineDependencyLayer(template.title);

  return {
    id: generateTaskId(index),
    implementation_plan_id: implementationPlanId,
    title: template.title,
    description: template.description,
    status: 'pending',
    checkbox_state: false,
    dependency_layer: layer,
    dependencies: template.dependsOn,
    estimated_minutes: Math.min(
      Math.max(template.estimatedMinutes, TASK_CONSTRAINTS.MIN_MINUTES),
      TASK_CONSTRAINTS.MAX_MINUTES
    ),
    max_files: Math.min(template.maxFiles, TASK_CONSTRAINTS.MAX_FILES),
    max_loc: Math.min(template.maxLoc, TASK_CONSTRAINTS.MAX_LOC),
    created_at: now,
  };
}

/**
 * Break down user stories into atomic tasks
 */
export function breakdownToAtomicTasks(input: BreakdownInput): BreakdownResult {
  const warnings: string[] = [];
  const tasks: Task[] = [];
  let taskIndex = 0;

  // Process each user story
  for (const story of input.userStories) {
    const templates = breakdownUserStory(story, taskIndex);

    for (const template of templates) {
      // Validate constraints
      if (template.estimatedMinutes > TASK_CONSTRAINTS.MAX_MINUTES) {
        warnings.push(
          `Task "${template.title}" exceeds max time (${template.estimatedMinutes} > ${TASK_CONSTRAINTS.MAX_MINUTES})`
        );
      }

      const task = createTaskFromTemplate(template, taskIndex, input.implementationPlanId);
      tasks.push(task);
      taskIndex++;
    }
  }

  // Group tasks by dependency layer
  const dependencyLayers = new Map<number, Task[]>();
  for (const task of tasks) {
    const layer = task.dependency_layer;
    const existing = dependencyLayers.get(layer) ?? [];
    existing.push(task);
    dependencyLayers.set(layer, existing);
  }

  // Calculate total time
  const totalEstimatedMinutes = tasks.reduce((sum, t) => sum + t.estimated_minutes, 0);

  return {
    tasks,
    dependencyLayers,
    totalEstimatedMinutes,
    warnings,
  };
}

/**
 * Generate implementation plan markdown from tasks
 */
export function generateImplementationPlanMarkdown(tasks: Task[]): string {
  // Group by layer
  const layerMap = new Map<number, Task[]>();
  for (const task of tasks) {
    const layer = task.dependency_layer;
    const existing = layerMap.get(layer) ?? [];
    existing.push(task);
    layerMap.set(layer, existing);
  }

  let content = `# Implementation Plan

## Overview

Total tasks: ${tasks.length}
Estimated time: ${Math.round(tasks.reduce((sum, t) => sum + t.estimated_minutes, 0) / 60)} hours

---

`;

  // Sort layers
  const sortedLayers = Array.from(layerMap.entries()).sort((a, b) => a[0] - b[0]);

  for (const [layer, layerTasks] of sortedLayers) {
    const layerNames = ['Infrastructure', 'Core Services', 'Features', 'Integration', 'Testing'];
    const layerName = layerNames[layer] ?? `Layer ${layer}`;

    content += `## Layer ${layer}: ${layerName}

`;

    for (const task of layerTasks) {
      const deps = task.dependencies.length > 0 ? ` (depends on: ${task.dependencies.join(', ')})` : '';
      content += `- [ ] ${task.id}: ${task.title}${deps}\n`;
      if (task.description !== undefined) {
        content += `  - ${task.description}\n`;
      }
      content += `  - Est: ${task.estimated_minutes} min | Max files: ${task.max_files} | Max LOC: ${task.max_loc}\n\n`;
    }
  }

  return content;
}

/**
 * Validate task atomicity
 */
export function validateTaskAtomicity(task: Task): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (task.estimated_minutes < TASK_CONSTRAINTS.MIN_MINUTES) {
    issues.push(`Task too small (${task.estimated_minutes} min < ${TASK_CONSTRAINTS.MIN_MINUTES} min)`);
  }

  if (task.estimated_minutes > TASK_CONSTRAINTS.MAX_MINUTES) {
    issues.push(`Task too large (${task.estimated_minutes} min > ${TASK_CONSTRAINTS.MAX_MINUTES} min)`);
  }

  if (task.max_files > TASK_CONSTRAINTS.MAX_FILES) {
    issues.push(`Too many files (${task.max_files} > ${TASK_CONSTRAINTS.MAX_FILES})`);
  }

  if (task.max_loc > TASK_CONSTRAINTS.MAX_LOC) {
    issues.push(`Too much code (${task.max_loc} LOC > ${TASK_CONSTRAINTS.MAX_LOC} LOC)`);
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
