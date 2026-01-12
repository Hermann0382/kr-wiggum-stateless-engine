/**
 * /...status command implementation
 * Renders terminal-friendly progress, context, ADR summary
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  createProjectStateManager,
  createTelemetryManager,
  createImplementationPlanManager,
  createADRManager,
} from '../state/index.js';
import { isLoopRunning, getLoopPid } from './loop.js';

/**
 * Status command options
 */
export interface StatusOptions {
  basePath?: string;
  verbose?: boolean;
}

/**
 * Status summary
 */
export interface StatusSummary {
  project: {
    name: string;
    status: string;
    version: string;
  } | null;
  telemetry: {
    agentType: string;
    zone: string;
    contextFillPercent: number;
    guardrailStatus: string;
    currentTaskId: string | null;
  } | null;
  progress: {
    total: number;
    completed: number;
    remaining: number;
    percentComplete: number;
  } | null;
  adrs: {
    count: number;
    recent: string[];
  };
  loop: {
    running: boolean;
    pid: number | null;
  };
}

/**
 * Status command result
 */
export interface StatusResult {
  success: boolean;
  summary?: StatusSummary;
  error?: string;
}

/**
 * Execute status command
 */
export async function status(options: StatusOptions = {}): Promise<StatusResult> {
  const { basePath = process.cwd() } = options;

  try {
    // Project state
    let project: StatusSummary['project'] = null;
    try {
      const projectManager = createProjectStateManager(basePath);
      const projectState = await projectManager.read();
      project = {
        name: projectState.name,
        status: projectState.status,
        version: projectState.version,
      };
    } catch {
      // No project state
    }

    // Telemetry state
    let telemetry: StatusSummary['telemetry'] = null;
    try {
      const telemetryManager = createTelemetryManager(basePath);
      const telemetryState = await telemetryManager.read();
      telemetry = {
        agentType: telemetryState.agent_type,
        zone: telemetryState.zone,
        contextFillPercent: telemetryState.context_fill_percent,
        guardrailStatus: telemetryState.guardrail_status,
        currentTaskId: telemetryState.current_task_id ?? null,
      };
    } catch {
      // No telemetry
    }

    // Progress
    let progress: StatusSummary['progress'] = null;
    try {
      const planManager = createImplementationPlanManager(basePath);
      const progressState = await planManager.getProgress();
      progress = progressState;
    } catch {
      // No plan
    }

    // ADRs
    const adrs: StatusSummary['adrs'] = { count: 0, recent: [] };
    try {
      const adrManager = createADRManager(basePath);
      adrs.count = await adrManager.getCount();
      adrs.recent = await adrManager.getLastADRIds(5);
    } catch {
      // No ADRs
    }

    // Loop status
    const loop = {
      running: isLoopRunning(),
      pid: getLoopPid(),
    };

    return {
      success: true,
      summary: {
        project,
        telemetry,
        progress,
        adrs,
        loop,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get zone color for terminal
 */
function getZoneColor(zone: string): string {
  switch (zone) {
    case 'smart':
      return '\x1b[36m'; // Cyan
    case 'degrading':
      return '\x1b[33m'; // Yellow
    case 'dumb':
      return '\x1b[31m'; // Red
    default:
      return '\x1b[0m';
  }
}

/**
 * Create progress bar
 */
function createProgressBar(percent: number, width: number = 30): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return `[${'='.repeat(filled)}${'-'.repeat(empty)}]`;
}

/**
 * Format status result for display
 */
export function formatStatusResult(result: StatusResult): string {
  if (!result.success) {
    return `Status check failed: ${result.error}`;
  }

  if (!result.summary) {
    return 'No status data available';
  }

  const { project, telemetry, progress, adrs, loop } = result.summary;
  const reset = '\x1b[0m';

  let output = `
================================================================================
                        KR-WIGGUM STATUS
================================================================================

`;

  // Project info
  if (project !== null) {
    output += `PROJECT: ${project.name} v${project.version} [${project.status.toUpperCase()}]\n\n`;
  } else {
    output += `PROJECT: Not initialized\n\n`;
  }

  // Loop status
  if (loop.running) {
    output += `LOOP: \x1b[32mRUNNING\x1b[0m (PID: ${loop.pid})\n`;
  } else {
    output += `LOOP: \x1b[33mSTOPPED\x1b[0m\n`;
  }

  // Context/Telemetry
  if (telemetry !== null) {
    const zoneColor = getZoneColor(telemetry.zone);
    output += `
CONTEXT:
  Agent: ${telemetry.agentType.toUpperCase()}
  Zone:  ${zoneColor}${telemetry.zone.toUpperCase()}${reset}
  Fill:  ${createProgressBar(telemetry.contextFillPercent)} ${telemetry.contextFillPercent}%
  Guardrails: ${telemetry.guardrailStatus === 'all_passing' ? '\x1b[32mPASSING\x1b[0m' : '\x1b[31mFAILING\x1b[0m'}
  Current Task: ${telemetry.currentTaskId ?? 'None'}
`;
  } else {
    output += `\nCONTEXT: No telemetry data\n`;
  }

  // Progress
  if (progress !== null) {
    output += `
PROGRESS:
  Tasks: ${progress.completed}/${progress.total} (${progress.remaining} remaining)
  ${createProgressBar(progress.percentComplete)} ${progress.percentComplete}%
`;
  } else {
    output += `\nPROGRESS: No implementation plan\n`;
  }

  // ADRs
  output += `
ADRs: ${adrs.count} total`;
  if (adrs.recent.length > 0) {
    output += `\n  Recent: ${adrs.recent.join(', ')}`;
  }

  output += `

================================================================================
Commands: /...seed | /...plan | /...loop | /...status | /...digest
================================================================================
`;

  return output;
}
