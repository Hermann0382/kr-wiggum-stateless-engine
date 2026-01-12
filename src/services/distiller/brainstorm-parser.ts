/**
 * Voice separation for brainstorm intake
 * Separates 'Voice of Client' from 'Voice of Engineer', filters noise
 */

/**
 * Voice type classification
 */
export type VoiceType = 'client' | 'engineer' | 'noise';

/**
 * Parsed voice segment
 */
export interface VoiceSegment {
  type: VoiceType;
  content: string;
  confidence: number;
  keywords: string[];
}

/**
 * Brainstorm parse result
 */
export interface BrainstormParseResult {
  clientVoice: VoiceSegment[];
  engineerVoice: VoiceSegment[];
  noise: VoiceSegment[];
  summary: {
    totalSegments: number;
    clientSegments: number;
    engineerSegments: number;
    noiseFiltered: number;
  };
}

/**
 * Client voice indicators
 */
const CLIENT_INDICATORS = [
  'i want',
  'i need',
  'users should',
  'customers will',
  'the business',
  'we need to',
  'our goal',
  'requirement',
  'must have',
  'nice to have',
  'feature',
  'workflow',
  'use case',
  'scenario',
];

/**
 * Engineer voice indicators
 */
const ENGINEER_INDICATORS = [
  'technically',
  'implementation',
  'architecture',
  'database',
  'api',
  'endpoint',
  'function',
  'class',
  'component',
  'module',
  'performance',
  'scalability',
  'security',
  'testing',
  'deploy',
  'infrastructure',
];

/**
 * Noise indicators (to be filtered)
 */
const NOISE_INDICATORS = [
  'um',
  'uh',
  'like',
  'you know',
  'anyway',
  'so yeah',
  'i guess',
  'maybe',
  'kind of',
  'sort of',
];

/**
 * Classify a segment by voice type
 */
function classifySegment(text: string): { type: VoiceType; confidence: number } {
  const lowerText = text.toLowerCase();

  // Check for noise first
  const noiseCount = NOISE_INDICATORS.filter((ind) => lowerText.includes(ind)).length;
  if (noiseCount >= 3 || text.trim().length < 20) {
    return { type: 'noise', confidence: 0.8 };
  }

  // Count indicators
  const clientCount = CLIENT_INDICATORS.filter((ind) => lowerText.includes(ind)).length;
  const engineerCount = ENGINEER_INDICATORS.filter((ind) => lowerText.includes(ind)).length;

  if (clientCount > engineerCount) {
    return { type: 'client', confidence: Math.min(0.5 + clientCount * 0.1, 0.95) };
  }
  if (engineerCount > clientCount) {
    return { type: 'engineer', confidence: Math.min(0.5 + engineerCount * 0.1, 0.95) };
  }

  // Default to client voice with lower confidence
  return { type: 'client', confidence: 0.5 };
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3);

  // Count word frequency
  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) ?? 0) + 1);
  }

  // Return top keywords
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

/**
 * Parse brainstorm content into voice segments
 */
export function parseBrainstorm(content: string): BrainstormParseResult {
  // Split by paragraph or sentence boundaries
  const segments = content
    .split(/\n\n+|\.\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const clientVoice: VoiceSegment[] = [];
  const engineerVoice: VoiceSegment[] = [];
  const noise: VoiceSegment[] = [];

  for (const segment of segments) {
    const { type, confidence } = classifySegment(segment);
    const keywords = extractKeywords(segment);

    const voiceSegment: VoiceSegment = {
      type,
      content: segment,
      confidence,
      keywords,
    };

    switch (type) {
      case 'client':
        clientVoice.push(voiceSegment);
        break;
      case 'engineer':
        engineerVoice.push(voiceSegment);
        break;
      case 'noise':
        noise.push(voiceSegment);
        break;
    }
  }

  return {
    clientVoice,
    engineerVoice,
    noise,
    summary: {
      totalSegments: segments.length,
      clientSegments: clientVoice.length,
      engineerSegments: engineerVoice.length,
      noiseFiltered: noise.length,
    },
  };
}

/**
 * Merge voice segments back into coherent text
 */
export function mergeVoiceSegments(segments: VoiceSegment[]): string {
  return segments.map((s) => s.content).join('\n\n');
}

/**
 * Get all unique keywords from segments
 */
export function extractAllKeywords(result: BrainstormParseResult): string[] {
  const allKeywords = new Set<string>();

  for (const segment of [...result.clientVoice, ...result.engineerVoice]) {
    for (const keyword of segment.keywords) {
      allKeywords.add(keyword);
    }
  }

  return Array.from(allKeywords);
}
