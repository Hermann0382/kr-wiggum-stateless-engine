#!/usr/bin/env node
/**
 * KR-Wiggum CLI
 * Command-line interface for the stateless AI orchestration engine
 *
 * Usage:
 *   kr-wiggum seed <file> [--name <project>]  - Distill brainstorm into PRD and tasks
 *   kr-wiggum loop [--max-rotations <n>]       - Start the orchestration loop
 *   kr-wiggum run <file> [--name <project>]    - End-to-end: seed + loop
 *   kr-wiggum status                           - Show current project status
 */
import process from 'node:process';

import { seed, formatSeedResult } from './commands/seed.js';
import { loop, formatLoopResult } from './commands/loop.js';
import { status, formatStatusResult } from './commands/status.js';

/**
 * Print usage information
 */
function printUsage(): void {
  console.error(`
KR-Wiggum Stateless Engine CLI

Usage:
  kr-wiggum seed <file> [options]    Distill a brainstorm file into PRD and tasks
  kr-wiggum loop [options]           Start the Manager/Worker orchestration loop
  kr-wiggum run <file> [options]     Full pipeline: seed + loop (end-to-end)
  kr-wiggum status                   Show current project status

Commands:
  seed <file>
    Process a brainstorm/interview file and generate:
    - specs/PRD.md (Product Requirements)
    - specs/index.md (Specification Index)
    - IMPLEMENTATION_PLAN.md (Task checklist)

    Options:
      --name <project>    Project name (default: "Project")
      --no-analysis       Skip codebase pattern analysis

  loop
    Start the orchestration loop. Spawns Manager agents that:
    - Read IMPLEMENTATION_PLAN.md
    - Select and execute tasks via Worker agents
    - Rotate when context reaches 60%

    Options:
      --max-rotations <n>   Max Manager rotations (default: 10)
      --foreground          Run in foreground (default: background)

  run <file>
    End-to-end execution: seed the project, then start the loop.
    Combines 'seed' and 'loop' commands.

    Options:
      --name <project>      Project name
      --max-rotations <n>   Max Manager rotations

  status
    Show current project status including:
    - Task completion progress
    - Manager rotation count
    - Active Workers

Examples:
  kr-wiggum seed brainstorm.md --name "My App"
  kr-wiggum loop --max-rotations 5
  kr-wiggum run interview.txt --name "New Feature"
  kr-wiggum status
`);
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): {
  command: string;
  file?: string;
  options: Record<string, string | boolean>;
} {
  const command = args[0] ?? 'help';
  let file: string | undefined;
  const options: Record<string, string | boolean> = {};

  let i = 1;
  while (i < args.length) {
    const arg = args[i];

    if (arg?.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];

      if (key === 'no-analysis') {
        options['noAnalysis'] = true;
        i++;
      } else if (key === 'foreground') {
        options['foreground'] = true;
        i++;
      } else if (nextArg !== undefined && !nextArg.startsWith('--')) {
        options[key] = nextArg;
        i += 2;
      } else {
        options[key] = true;
        i++;
      }
    } else if (file === undefined && arg !== undefined) {
      file = arg;
      i++;
    } else {
      i++;
    }
  }

  return { command, file, options };
}

/**
 * Run the seed command
 */
async function runSeed(file: string, options: Record<string, string | boolean>): Promise<boolean> {
  console.error(`\n[SEED] Processing: ${file}`);

  const result = await seed({
    filePath: file,
    projectName: typeof options['name'] === 'string' ? options['name'] : 'Project',
    basePath: process.cwd(),
    runPatternAnalysis: options['noAnalysis'] !== true,
  });

  console.error(formatSeedResult(result));

  return result.success;
}

/**
 * Run the loop command
 */
async function runLoop(options: Record<string, string | boolean>): Promise<boolean> {
  console.error('\n[LOOP] Starting orchestration...');

  const maxRotations = typeof options['max-rotations'] === 'string'
    ? parseInt(options['max-rotations'], 10)
    : 10;

  const result = await loop({
    basePath: process.cwd(),
    maxRotations,
    background: options['foreground'] !== true,
  });

  console.error(formatLoopResult(result));

  return result.success;
}

/**
 * Run the status command
 */
async function runStatus(): Promise<boolean> {
  const result = await status({ basePath: process.cwd() });
  console.error(formatStatusResult(result));
  return result.success;
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printUsage();
    process.exit(1);
  }

  const { command, file, options } = parseArgs(args);

  try {
    switch (command) {
      case 'seed': {
        if (file === undefined) {
          console.error('Error: seed command requires a file argument');
          console.error('Usage: kr-wiggum seed <file> [--name <project>]');
          process.exit(1);
        }
        const success = await runSeed(file, options);
        process.exit(success ? 0 : 1);
        break;
      }

      case 'loop': {
        const success = await runLoop(options);
        process.exit(success ? 0 : 1);
        break;
      }

      case 'run': {
        if (file === undefined) {
          console.error('Error: run command requires a file argument');
          console.error('Usage: kr-wiggum run <file> [--name <project>]');
          process.exit(1);
        }

        console.error('='.repeat(60));
        console.error('KR-Wiggum End-to-End Pipeline');
        console.error('='.repeat(60));

        // Step 1: Seed
        const seedSuccess = await runSeed(file, options);
        if (!seedSuccess) {
          console.error('\n[ERROR] Seed failed, aborting.');
          process.exit(1);
        }

        // Step 2: Loop
        console.error('\n' + '-'.repeat(60));
        const loopSuccess = await runLoop(options);
        process.exit(loopSuccess ? 0 : 1);
        break;
      }

      case 'status': {
        const success = await runStatus();
        process.exit(success ? 0 : 1);
        break;
      }

      case 'help':
      case '--help':
      case '-h': {
        printUsage();
        process.exit(0);
        break;
      }

      default: {
        console.error(`Unknown command: ${command}`);
        printUsage();
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('Fatal error:', error instanceof Error ? error.message : error);
    process.exit(99);
  }
}

// Run
void main();
