/**
 * Telemetry-related TypeScript types
 * For real-time monitoring and zone detection
 */
import type { ContextZone, GuardrailStatus, AgentType } from '../schemas/index.js';

/**
 * Context window configuration
 */
export interface ContextWindowConfig {
  totalTokens: number;
  smartZoneThreshold: number;    // Default: 40%
  degradingZoneThreshold: number; // Default: 60%
  rotationThreshold: number;      // Default: 60% for Manager
}

/**
 * Real-time telemetry state for dashboard
 */
export interface TelemetryState {
  agentType: AgentType;
  contextFillPercent: number;
  zone: ContextZone;
  guardrailStatus: GuardrailStatus;
  currentTaskId: string | null;
  tokensUsed: number;
  tokensRemaining: number;
  lastHeartbeat: Date;
}

/**
 * Zone transition event
 */
export interface ZoneTransitionEvent {
  previousZone: ContextZone;
  newZone: ContextZone;
  contextFillPercent: number;
  timestamp: Date;
  action: 'continue' | 'warn' | 'rotate';
}

/**
 * Heartbeat message from agent
 */
export interface HeartbeatMessage {
  sessionId: string;
  agentType: AgentType;
  tokensUsed: number;
  currentTaskId: string | null;
  guardrailStatus: GuardrailStatus;
  timestamp: string;
}

/**
 * Dashboard telemetry update
 */
export interface DashboardTelemetryUpdate {
  sessionId: string;
  agentType: AgentType;
  contextFillPercent: number;
  zone: ContextZone;
  guardrailStatus: GuardrailStatus;
  currentTaskId: string | null;
  progressPercent: number;
  tasksCompleted: number;
  totalTasks: number;
}

/**
 * Zone color mapping for UI
 */
export const ZONE_COLORS: Record<ContextZone, string> = {
  smart: '#00d2ff',     // Cyan
  degrading: '#f9826c', // Orange
  dumb: '#ff4b2b',      // Red
};

/**
 * Zone thresholds
 */
export const ZONE_THRESHOLDS = {
  SMART_MAX: 40,
  DEGRADING_MAX: 60,
  DUM_MIN: 60,
} as const;
