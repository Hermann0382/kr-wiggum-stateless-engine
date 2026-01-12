/**
 * Manager for .agent/project.json
 * CRUD operations for project state with ProjectSchema validation
 */
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { ProjectSchema, type Project } from '../schemas/index.js';
import { FileStateManager, type FileStateOptions } from './file-state-manager.js';

const PROJECT_FILE = 'project.json';
const AGENT_DIR = '.agent';

/**
 * Project state manager for .agent/project.json
 */
export class ProjectStateManager extends FileStateManager<Project> {
  constructor(options: FileStateOptions) {
    super(options);
  }

  protected getSchema(): z.ZodType<Project> {
    return ProjectSchema as z.ZodType<Project>;
  }

  protected getFilePath(): string {
    return join(this.basePath, AGENT_DIR, PROJECT_FILE);
  }

  protected getDefaultState(): Project {
    const now = new Date().toISOString();
    return {
      id: randomUUID(),
      name: 'New Project',
      owner_email: 'unknown@example.com',
      version: '0.0.1',
      status: 'planning',
      created_at: now,
      updated_at: now,
      cost_tracking: {
        total_cost_usd: 0,
        hourly_rate_usd: 10.42,
        total_hours: 0,
      },
    };
  }

  /**
   * Create a new project
   */
  async create(input: {
    name: string;
    owner_email: string;
    version?: string;
  }): Promise<Project> {
    const now = new Date().toISOString();
    const project: Project = {
      id: randomUUID(),
      name: input.name,
      owner_email: input.owner_email,
      version: input.version ?? '0.0.1',
      status: 'planning',
      created_at: now,
      updated_at: now,
      cost_tracking: {
        total_cost_usd: 0,
        hourly_rate_usd: 10.42,
        total_hours: 0,
      },
    };

    await this.write(project);
    return project;
  }

  /**
   * Update project status
   */
  async updateStatus(status: Project['status']): Promise<Project> {
    return this.update({
      status,
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Add cost to project
   */
  async addCost(hoursWorked: number): Promise<Project> {
    const current = await this.read();
    const sessionCost = hoursWorked * current.cost_tracking.hourly_rate_usd;

    return this.update({
      cost_tracking: {
        ...current.cost_tracking,
        total_cost_usd: current.cost_tracking.total_cost_usd + sessionCost,
        total_hours: current.cost_tracking.total_hours + hoursWorked,
        last_session_cost_usd: sessionCost,
      },
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Set specs path
   */
  async setSpecsPath(specsPath: string): Promise<Project> {
    return this.update({
      specs_path: specsPath,
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Set implementation plan path
   */
  async setImplementationPlanPath(planPath: string): Promise<Project> {
    return this.update({
      implementation_plan_path: planPath,
      updated_at: new Date().toISOString(),
    });
  }
}

/**
 * Create a project state manager instance
 */
export function createProjectStateManager(basePath: string): ProjectStateManager {
  return new ProjectStateManager({ basePath, createIfMissing: true });
}
