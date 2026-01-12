/**
 * Socket.io client connection
 * Connects to watcher, receives telemetry and roadmap events
 */

// Socket.io connection
let socket = null;
let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

/**
 * Initialize socket connection
 */
function initializeSocket() {
  // Connect to Socket.io server
  socket = io({
    reconnection: true,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  // Connection events
  socket.on('connect', () => {
    isConnected = true;
    reconnectAttempts = 0;
    updateConnectionStatus(true);
    addActivity('Connected to server', 'success');
    console.log('[Socket] Connected');
  });

  socket.on('disconnect', (reason) => {
    isConnected = false;
    updateConnectionStatus(false);
    addActivity(`Disconnected: ${reason}`, 'warning');
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    reconnectAttempts++;
    addActivity(`Connection error (attempt ${reconnectAttempts})`, 'error');
    console.error('[Socket] Connection error:', error.message);
  });

  // Welcome message
  socket.on('connected', (data) => {
    console.log('[Socket] Server welcome:', data);
    updateSessionId(data.clientId);
  });

  // Telemetry events
  socket.on('telemetry:update', (event) => {
    handleTelemetryUpdate(event);
  });

  socket.on('telemetry:zone-change', (event) => {
    handleZoneChange(event);
  });

  // Roadmap events
  socket.on('roadmap:update', (event) => {
    handleRoadmapUpdate(event);
  });

  socket.on('roadmap:task-completed', (event) => {
    handleTaskCompleted(event);
  });

  // Guardrail events
  socket.on('guardrail:update', (event) => {
    handleGuardrailUpdate(event);
  });

  // Crisis events
  socket.on('crisis:activated', (event) => {
    handleCrisisActivated(event);
  });

  // Status response
  socket.on('status:response', (data) => {
    console.log('[Socket] Status:', data);
  });
}

/**
 * Update connection status indicator
 */
function updateConnectionStatus(connected) {
  const indicator = document.getElementById('connection-status');
  const text = document.getElementById('connection-text');

  if (indicator) {
    indicator.classList.toggle('connected', connected);
    indicator.classList.toggle('disconnected', !connected);
  }

  if (text) {
    text.textContent = connected ? 'Connected' : 'Disconnected';
  }
}

/**
 * Update session ID display
 */
function updateSessionId(sessionId) {
  const element = document.getElementById('session-id');
  if (element) {
    element.textContent = sessionId ? sessionId.substring(0, 8) + '...' : '--';
  }
}

/**
 * Handle telemetry update
 */
function handleTelemetryUpdate(event) {
  const telemetry = event.telemetry;

  if (!telemetry) return;

  // Update context bar
  updateContextBar(telemetry.context_fill_percent, telemetry.zone);

  // Update stats
  updateContextStats(telemetry);

  // Update last heartbeat
  updateLastHeartbeat();
}

/**
 * Handle zone change
 */
function handleZoneChange(event) {
  const { from, to, fillPercent } = event;

  addActivity(
    `Zone changed: ${from.toUpperCase()} -> ${to.toUpperCase()} (${fillPercent}%)`,
    to === 'dumb' ? 'error' : to === 'degrading' ? 'warning' : 'success'
  );

  // Flash the zone badge
  const zoneBadge = document.getElementById('current-zone');
  if (zoneBadge) {
    zoneBadge.classList.add('animate-pulse');
    setTimeout(() => zoneBadge.classList.remove('animate-pulse'), 2000);
  }
}

/**
 * Handle roadmap update
 */
function handleRoadmapUpdate(event) {
  const { progress, taskCompleted } = event;

  if (progress) {
    updateProgress(progress);
  }

  if (taskCompleted) {
    addActivity(`Task completed! Progress: ${progress.percentComplete}%`, 'success');
  }
}

/**
 * Handle task completed
 */
function handleTaskCompleted(event) {
  const { newCompleted, total, percentComplete } = event;

  addActivity(
    `Task ${newCompleted}/${total} completed (${percentComplete}%)`,
    'success'
  );

  // Animate progress circle
  const progressCircle = document.getElementById('progress-circle');
  if (progressCircle) {
    progressCircle.classList.add('animate-glow');
    setTimeout(() => progressCircle.classList.remove('animate-glow'), 2000);
  }
}

/**
 * Handle guardrail update
 */
function handleGuardrailUpdate(event) {
  updateGuardrails(event);
}

/**
 * Handle crisis activated
 */
function handleCrisisActivated(event) {
  const { reason, action } = event;

  addActivity(`CRISIS MODE: ${reason} (${action})`, 'error');

  // Show alert
  alert(`CRISIS MODE ACTIVATED\n\nAction: ${action}\nReason: ${reason}`);
}

/**
 * Request status update
 */
function requestStatus() {
  if (socket && isConnected) {
    socket.emit('status:request');
  }
}

/**
 * Trigger crisis mode via socket
 */
function triggerCrisis(action, reason) {
  if (socket && isConnected) {
    socket.emit('crisis:trigger', {
      triggered: true,
      action,
      reason,
    });
  }
}

/**
 * Check if connected
 */
function isSocketConnected() {
  return isConnected;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  initializeSocket();
});
