/**
 * RipGrep integration for pattern analysis
 * Executes minimum 15 RipGrep searches, returns keyword map
 */
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

/**
 * Search result from ripgrep
 */
export interface SearchResult {
  keyword: string;
  matches: SearchMatch[];
  totalCount: number;
}

/**
 * Individual match from ripgrep
 */
export interface SearchMatch {
  file: string;
  line: number;
  content: string;
}

/**
 * Pattern analysis result
 */
export interface PatternAnalysisResult {
  keywords: string[];
  searchResults: SearchResult[];
  codebasePatterns: CodebasePattern[];
  summary: {
    totalSearches: number;
    totalMatches: number;
    uniqueFiles: number;
  };
}

/**
 * Detected codebase pattern
 */
export interface CodebasePattern {
  name: string;
  description: string;
  files: string[];
  confidence: number;
}

/**
 * Default technical keywords to search
 */
const DEFAULT_KEYWORDS = [
  'export',
  'import',
  'interface',
  'type',
  'function',
  'class',
  'async',
  'await',
  'Promise',
  'Error',
  'try',
  'catch',
  'const',
  'let',
  'return',
];

/**
 * Execute a ripgrep search
 */
async function ripgrepSearch(
  pattern: string,
  basePath: string,
  options: { maxMatches?: number; fileTypes?: string[] } = {}
): Promise<SearchMatch[]> {
  const maxMatches = options.maxMatches ?? 50;
  const fileTypes = options.fileTypes ?? ['ts', 'tsx', 'js', 'jsx'];

  const typeFlags = fileTypes.map((t) => `-t ${t}`).join(' ');
  const command = `rg "${pattern}" ${basePath} ${typeFlags} -n --max-count ${maxMatches} --json 2>/dev/null || true`;

  try {
    const { stdout } = await execAsync(command, { maxBuffer: 10 * 1024 * 1024 });

    const matches: SearchMatch[] = [];
    const lines = stdout.split('\n').filter((line) => line.trim() !== '');

    for (const line of lines) {
      try {
        const json = JSON.parse(line) as {
          type: string;
          data?: {
            path?: { text: string };
            line_number?: number;
            lines?: { text: string };
          };
        };
        if (json.type === 'match' && json.data !== undefined) {
          matches.push({
            file: json.data.path?.text ?? '',
            line: json.data.line_number ?? 0,
            content: json.data.lines?.text?.trim() ?? '',
          });
        }
      } catch {
        // Skip invalid JSON lines
      }
    }

    return matches;
  } catch {
    return [];
  }
}

/**
 * Analyze patterns in a codebase
 */
export async function analyzePatterns(
  basePath: string,
  keywords: string[] = DEFAULT_KEYWORDS
): Promise<PatternAnalysisResult> {
  // Ensure minimum 15 searches
  const searchKeywords = keywords.length < 15
    ? [...keywords, ...DEFAULT_KEYWORDS.slice(0, 15 - keywords.length)]
    : keywords;

  const searchResults: SearchResult[] = [];
  const allFiles = new Set<string>();

  // Execute searches in parallel (batches of 5)
  for (let i = 0; i < searchKeywords.length; i += 5) {
    const batch = searchKeywords.slice(i, i + 5);
    const results = await Promise.all(
      batch.map(async (keyword) => {
        const matches = await ripgrepSearch(keyword, basePath);
        for (const match of matches) {
          allFiles.add(match.file);
        }
        return {
          keyword,
          matches,
          totalCount: matches.length,
        };
      })
    );
    searchResults.push(...results);
  }

  // Detect codebase patterns
  const codebasePatterns = detectPatterns(searchResults);

  return {
    keywords: searchKeywords,
    searchResults,
    codebasePatterns,
    summary: {
      totalSearches: searchResults.length,
      totalMatches: searchResults.reduce((sum, r) => sum + r.totalCount, 0),
      uniqueFiles: allFiles.size,
    },
  };
}

/**
 * Detect common patterns from search results
 */
function detectPatterns(searchResults: SearchResult[]): CodebasePattern[] {
  const patterns: CodebasePattern[] = [];

  // Check for TypeScript usage
  const typeScriptMatches = searchResults.filter(
    (r) => r.keyword === 'interface' || r.keyword === 'type'
  );
  if (typeScriptMatches.some((r) => r.totalCount > 0)) {
    patterns.push({
      name: 'TypeScript',
      description: 'Project uses TypeScript with type definitions',
      files: [...new Set(typeScriptMatches.flatMap((r) => r.matches.map((m) => m.file)))],
      confidence: 0.9,
    });
  }

  // Check for async/await usage
  const asyncMatches = searchResults.find((r) => r.keyword === 'async');
  if (asyncMatches !== undefined && asyncMatches.totalCount > 5) {
    patterns.push({
      name: 'Async/Await',
      description: 'Heavy use of async/await for asynchronous operations',
      files: asyncMatches.matches.map((m) => m.file),
      confidence: 0.85,
    });
  }

  // Check for error handling
  const errorMatches = searchResults.find((r) => r.keyword === 'try');
  if (errorMatches !== undefined && errorMatches.totalCount > 3) {
    patterns.push({
      name: 'Error Handling',
      description: 'Project uses try/catch for error handling',
      files: errorMatches.matches.map((m) => m.file),
      confidence: 0.8,
    });
  }

  // Check for named exports
  const exportMatches = searchResults.find((r) => r.keyword === 'export');
  if (exportMatches !== undefined && exportMatches.totalCount > 10) {
    patterns.push({
      name: 'Named Exports',
      description: 'Project uses named exports (modular design)',
      files: [...new Set(exportMatches.matches.map((m) => m.file))],
      confidence: 0.85,
    });
  }

  return patterns;
}

/**
 * Search for a specific pattern with context
 */
export async function searchWithContext(
  pattern: string,
  basePath: string,
  contextLines: number = 2
): Promise<SearchMatch[]> {
  const command = `rg "${pattern}" ${basePath} -t ts -n -C ${contextLines} --json 2>/dev/null || true`;

  try {
    const { stdout } = await execAsync(command, { maxBuffer: 10 * 1024 * 1024 });
    const matches: SearchMatch[] = [];
    const lines = stdout.split('\n').filter((line) => line.trim() !== '');

    for (const line of lines) {
      try {
        const json = JSON.parse(line) as {
          type: string;
          data?: {
            path?: { text: string };
            line_number?: number;
            lines?: { text: string };
          };
        };
        if (json.type === 'match' && json.data !== undefined) {
          matches.push({
            file: json.data.path?.text ?? '',
            line: json.data.line_number ?? 0,
            content: json.data.lines?.text?.trim() ?? '',
          });
        }
      } catch {
        // Skip invalid JSON
      }
    }

    return matches;
  } catch {
    return [];
  }
}
