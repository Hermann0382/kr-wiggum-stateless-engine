/**
 * Command registry
 * Maps command names to handlers, provides help text
 */

// Re-export all commands
export { seed, formatSeedResult, type SeedOptions, type SeedResult } from './seed.js';
export { plan, formatPlanResult, type PlanOptions, type PlanResult } from './plan.js';
export {
  loop,
  stopLoop,
  isLoopRunning,
  getLoopPid,
  formatLoopResult,
  type LoopOptions,
  type LoopResult,
} from './loop.js';
export { status, formatStatusResult, type StatusOptions, type StatusResult } from './status.js';
export { digest, formatDigestResult, type DigestOptions, type DigestResult } from './digest.js';

/**
 * Command definition
 */
export interface CommandDefinition {
  name: string;
  aliases: string[];
  description: string;
  usage: string;
  examples: string[];
}

/**
 * Available commands
 */
export const COMMANDS: CommandDefinition[] = [
  {
    name: 'seed',
    aliases: ['/...seed', '...seed'],
    description: 'Generate specs from a brainstorm file',
    usage: '/...seed <file_path> [--name <project_name>]',
    examples: [
      '/...seed brainstorm.md',
      '/...seed docs/requirements.txt --name "My Project"',
    ],
  },
  {
    name: 'plan',
    aliases: ['/...plan', '...plan'],
    description: 'Analyze gap between specs and implementation',
    usage: '/...plan [--analyze]',
    examples: ['/...plan', '/...plan --analyze'],
  },
  {
    name: 'loop',
    aliases: ['/...loop', '...loop'],
    description: 'Start the Ralph Wiggum Loop orchestrator',
    usage: '/...loop [--foreground] [--max-rotations <n>]',
    examples: ['/...loop', '/...loop --foreground', '/...loop --max-rotations 5'],
  },
  {
    name: 'status',
    aliases: ['/...status', '...status'],
    description: 'Show current project and agent status',
    usage: '/...status [--verbose]',
    examples: ['/...status', '/...status --verbose'],
  },
  {
    name: 'digest',
    aliases: ['/...digest', '...digest'],
    description: 'Parse unstructured input into task proposals',
    usage: '/...digest "<input_text>"',
    examples: [
      '/...digest "I need a login system with email and password"',
      '/...digest "Build a dashboard with charts and real-time updates"',
    ],
  },
];

/**
 * Get command by name or alias
 */
export function getCommand(nameOrAlias: string): CommandDefinition | undefined {
  const normalized = nameOrAlias.toLowerCase().replace(/^\/+/, '');
  return COMMANDS.find(
    (cmd) =>
      cmd.name === normalized ||
      cmd.aliases.some((alias) => alias.toLowerCase().replace(/^\/+/, '') === normalized)
  );
}

/**
 * Get help text for all commands
 */
export function getHelpText(): string {
  let output = `
KR-Wiggum Commands
==================

Available commands:

`;

  for (const cmd of COMMANDS) {
    output += `${cmd.aliases[0]}
  ${cmd.description}
  Usage: ${cmd.usage}

`;
  }

  output += `
For detailed help on a command, use: /...help <command>

Quick Start:
  1. /...seed brainstorm.md   - Generate specs from brainstorm
  2. /...plan                  - Analyze implementation gap
  3. /...loop                  - Start automated development
  4. /...status                - Check current progress
`;

  return output.trim();
}

/**
 * Get help text for a specific command
 */
export function getCommandHelp(commandName: string): string {
  const cmd = getCommand(commandName);

  if (cmd === undefined) {
    return `Unknown command: ${commandName}\n\nUse /...help to see available commands.`;
  }

  let output = `
${cmd.aliases[0]}
${'='.repeat(cmd.aliases[0].length)}

${cmd.description}

Usage: ${cmd.usage}

Aliases: ${cmd.aliases.join(', ')}

Examples:
`;

  for (const example of cmd.examples) {
    output += `  ${example}\n`;
  }

  return output.trim();
}
