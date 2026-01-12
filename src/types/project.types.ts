/**
 * Project-related TypeScript types
 * Inferred from Zod schemas and additional utility types
 */
import type { Project, PRD, Task, ImplementationPlan, Specification } from '../schemas/index.js';

/**
 * Project state including all related entities
 */
export interface ProjectState {
  project: Project;
  prd: PRD | null;
  specifications: Specification[];
  implementationPlan: ImplementationPlan | null;
  tasks: Task[];
}

/**
 * Project creation input (without auto-generated fields)
 */
export interface CreateProjectInput {
  name: string;
  owner_email: string;
  version?: string;
}

/**
 * Project update input (partial)
 */
export interface UpdateProjectInput {
  name?: string;
  status?: Project['status'];
  version?: string;
}

/**
 * Task progress summary
 */
export interface TaskProgressSummary {
  total: number;
  completed: number;
  inProgress: number;
  blocked: number;
  pending: number;
  percentComplete: number;
}

/**
 * File paths for project state files
 */
export interface ProjectFilePaths {
  projectJson: string;
  prdMd: string;
  implementationPlanMd: string;
  adrMd: string;
  telemetryJson: string;
  shiftHandoffMd: string;
  lastCompilerErrorLog: string;
}

/**
 * Cost calculation result
 */
export interface CostCalculation {
  totalCostUsd: number;
  sessionCostUsd: number;
  hoursWorked: number;
  hourlyRate: number;
}
