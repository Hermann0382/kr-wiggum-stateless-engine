/**
 * ClientDocGenerator - TASK-051
 * Generates README_CLIENT.md for end-user handoff
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createProjectStateManager, createImplementationPlanManager } from '../../state/index.js';

/**
 * Project metadata for client doc
 */
export interface ProjectMetadata {
  name: string;
  version: string;
  description?: string;
  repository?: string;
  author?: string;
  license?: string;
}

/**
 * Feature documentation
 */
export interface FeatureDoc {
  name: string;
  description: string;
  usage?: string;
  apiEndpoint?: string;
}

/**
 * Client documentation options
 */
export interface ClientDocOptions {
  basePath: string;
  metadata?: Partial<ProjectMetadata>;
  features?: FeatureDoc[];
  customSections?: Array<{ title: string; content: string }>;
}

/**
 * Client documentation result
 */
export interface ClientDocResult {
  filePath: string;
  content: string;
  generatedAt: string;
}

/**
 * Extract metadata from package.json
 */
async function extractPackageMetadata(
  basePath: string
): Promise<ProjectMetadata> {
  try {
    const packagePath = join(basePath, 'package.json');
    const packageJson = JSON.parse(await readFile(packagePath, 'utf-8'));

    return {
      name: packageJson.name ?? 'Unnamed Project',
      version: packageJson.version ?? '0.0.0',
      description: packageJson.description,
      repository:
        typeof packageJson.repository === 'string'
          ? packageJson.repository
          : packageJson.repository?.url,
      author:
        typeof packageJson.author === 'string'
          ? packageJson.author
          : packageJson.author?.name,
      license: packageJson.license,
    };
  } catch {
    return {
      name: 'Unnamed Project',
      version: '0.0.0',
    };
  }
}

/**
 * Generate installation section
 */
function generateInstallSection(metadata: ProjectMetadata): string {
  const lines: string[] = [];

  lines.push('## Installation');
  lines.push('');
  lines.push('```bash');
  lines.push('# Clone the repository');

  if (metadata.repository !== undefined) {
    const repoUrl = metadata.repository.replace('git+', '').replace('.git', '');
    lines.push(`git clone ${repoUrl}`);
  } else {
    lines.push('git clone <repository-url>');
  }

  lines.push(`cd ${metadata.name}`);
  lines.push('');
  lines.push('# Install dependencies');
  lines.push('npm install');
  lines.push('');
  lines.push('# Build the project');
  lines.push('npm run build');
  lines.push('```');

  return lines.join('\n');
}

/**
 * Generate usage section
 */
function generateUsageSection(): string {
  const lines: string[] = [];

  lines.push('## Usage');
  lines.push('');
  lines.push('### Quick Start');
  lines.push('');
  lines.push('```bash');
  lines.push('# Start the development server');
  lines.push('npm run dev');
  lines.push('');
  lines.push('# Or start in production mode');
  lines.push('npm start');
  lines.push('```');
  lines.push('');
  lines.push('### Available Commands');
  lines.push('');
  lines.push('| Command | Description |');
  lines.push('|---------|-------------|');
  lines.push('| `npm run dev` | Start development server |');
  lines.push('| `npm run build` | Build for production |');
  lines.push('| `npm start` | Start production server |');
  lines.push('| `npm test` | Run test suite |');
  lines.push('| `npm run lint` | Run linter |');

  return lines.join('\n');
}

/**
 * Generate features section
 */
function generateFeaturesSection(features: FeatureDoc[]): string {
  if (features.length === 0) {
    return '';
  }

  const lines: string[] = [];

  lines.push('## Features');
  lines.push('');

  for (const feature of features) {
    lines.push(`### ${feature.name}`);
    lines.push('');
    lines.push(feature.description);

    if (feature.usage !== undefined) {
      lines.push('');
      lines.push('**Usage:**');
      lines.push('');
      lines.push('```typescript');
      lines.push(feature.usage);
      lines.push('```');
    }

    if (feature.apiEndpoint !== undefined) {
      lines.push('');
      lines.push(`**API Endpoint:** \`${feature.apiEndpoint}\``);
    }

    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate API section if applicable
 */
function generateAPISection(): string {
  const lines: string[] = [];

  lines.push('## API Reference');
  lines.push('');
  lines.push('For detailed API documentation, please refer to:');
  lines.push('');
  lines.push('- `/docs/api` - OpenAPI specification (if available)');
  lines.push('- `/src/types` - TypeScript type definitions');
  lines.push('- `/src/schemas` - Zod validation schemas');

  return lines.join('\n');
}

/**
 * Generate configuration section
 */
function generateConfigSection(): string {
  const lines: string[] = [];

  lines.push('## Configuration');
  lines.push('');
  lines.push('### Environment Variables');
  lines.push('');
  lines.push('Create a `.env` file in the project root:');
  lines.push('');
  lines.push('```env');
  lines.push('# Server Configuration');
  lines.push('PORT=3000');
  lines.push('NODE_ENV=development');
  lines.push('');
  lines.push('# Add your environment-specific variables here');
  lines.push('```');
  lines.push('');
  lines.push('> **Note:** Never commit `.env` files with sensitive data to version control.');

  return lines.join('\n');
}

/**
 * Generate support section
 */
function generateSupportSection(metadata: ProjectMetadata): string {
  const lines: string[] = [];

  lines.push('## Support');
  lines.push('');
  lines.push('If you encounter any issues:');
  lines.push('');
  lines.push('1. Check the [documentation](./docs) for common solutions');

  if (metadata.repository !== undefined) {
    const issuesUrl = metadata.repository
      .replace('git+', '')
      .replace('.git', '') + '/issues';
    lines.push(`2. Search [existing issues](${issuesUrl})`);
    lines.push(`3. [Open a new issue](${issuesUrl}/new) with detailed reproduction steps`);
  } else {
    lines.push('2. Search existing issues in the repository');
    lines.push('3. Open a new issue with detailed reproduction steps');
  }

  return lines.join('\n');
}

/**
 * Generate license section
 */
function generateLicenseSection(metadata: ProjectMetadata): string {
  const lines: string[] = [];

  lines.push('## License');
  lines.push('');

  if (metadata.license !== undefined) {
    lines.push(`This project is licensed under the ${metadata.license} License.`);
    lines.push('');
    lines.push('See [LICENSE](./LICENSE) for details.');
  } else {
    lines.push('See [LICENSE](./LICENSE) for license information.');
  }

  return lines.join('\n');
}

/**
 * Generate the complete client documentation
 */
export async function generateClientDoc(
  options: ClientDocOptions
): Promise<ClientDocResult> {
  const {
    basePath,
    metadata: customMetadata = {},
    features = [],
    customSections = [],
  } = options;

  // Get project metadata
  const packageMetadata = await extractPackageMetadata(basePath);
  const metadata: ProjectMetadata = {
    ...packageMetadata,
    ...customMetadata,
  };

  // Build the document
  const sections: string[] = [];

  // Header
  sections.push(`# ${metadata.name}`);
  sections.push('');

  if (metadata.description !== undefined) {
    sections.push(`> ${metadata.description}`);
    sections.push('');
  }

  sections.push(`**Version:** ${metadata.version}`);

  if (metadata.author !== undefined) {
    sections.push(`**Author:** ${metadata.author}`);
  }

  sections.push('');

  // Table of contents
  sections.push('## Table of Contents');
  sections.push('');
  sections.push('- [Installation](#installation)');
  sections.push('- [Usage](#usage)');
  if (features.length > 0) {
    sections.push('- [Features](#features)');
  }
  sections.push('- [API Reference](#api-reference)');
  sections.push('- [Configuration](#configuration)');
  sections.push('- [Support](#support)');
  sections.push('- [License](#license)');
  sections.push('');

  // Main sections
  sections.push(generateInstallSection(metadata));
  sections.push('');
  sections.push(generateUsageSection());
  sections.push('');

  if (features.length > 0) {
    sections.push(generateFeaturesSection(features));
  }

  sections.push(generateAPISection());
  sections.push('');
  sections.push(generateConfigSection());
  sections.push('');

  // Custom sections
  for (const section of customSections) {
    sections.push(`## ${section.title}`);
    sections.push('');
    sections.push(section.content);
    sections.push('');
  }

  sections.push(generateSupportSection(metadata));
  sections.push('');
  sections.push(generateLicenseSection(metadata));
  sections.push('');

  // Footer
  sections.push('---');
  sections.push('');
  sections.push(`*This documentation was generated on ${new Date().toISOString().split('T')[0]}*`);
  sections.push('');
  sections.push('*Built with ❤️ using KR-Wiggum Stateless Engine*');

  const content = sections.join('\n');
  const filePath = join(basePath, 'README_CLIENT.md');

  // Write the file
  await writeFile(filePath, content, 'utf-8');

  return {
    filePath,
    content,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Create client doc generator (factory function)
 */
export function createClientDocGenerator(basePath: string) {
  return {
    generate: (options?: {
      metadata?: Partial<ProjectMetadata>;
      features?: FeatureDoc[];
      customSections?: Array<{ title: string; content: string }>;
    }) =>
      generateClientDoc({
        basePath,
        ...options,
      }),
  };
}
