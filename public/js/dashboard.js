/**
 * Dashboard UI logic
 * Updates progress bars, zone colors, task display
 */

// Activity feed max items
const MAX_ACTIVITY_ITEMS = 50;

// Update interval for clock
const CLOCK_INTERVAL = 1000;

// Start time for uptime calculation
const startTime = Date.now();

/**
 * Initialize dashboard
 */
function initializeDashboard() {
  // Start clock
  updateClock();
  setInterval(updateClock, CLOCK_INTERVAL);

  // Start uptime counter
  setInterval(updateUptime, CLOCK_INTERVAL);

  // Initial fetch
  fetchInitialStatus();
}

/**
 * Fetch initial status from API
 */
async function fetchInitialStatus() {
  try {
    const response = await fetch('/api/status');
    const data = await response.json();

    if (data.telemetry) {
      updateContextBar(
        data.telemetry.context_fill_percent,
        data.telemetry.zone
      );
      updateContextStats(data.telemetry);
    }

    if (data.progress) {
      updateProgress(data.progress);
    }

    addActivity('Dashboard initialized', 'success');
  } catch (error) {
    console.error('Failed to fetch initial status:', error);
    addActivity('Failed to fetch initial status', 'error');
  }
}

/**
 * Update the clock display
 */
function updateClock() {
  const element = document.getElementById('current-time');
  if (element) {
    const now = new Date();
    element.textContent = now.toLocaleTimeString('en-US', { hour12: false });
  }
}

/**
 * Update uptime display
 */
function updateUptime() {
  const element = document.getElementById('uptime');
  if (element) {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    element.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
}

/**
 * Update context bar
 */
function updateContextBar(percent, zone) {
  const fill = document.getElementById('context-fill');
  const percentDisplay = document.getElementById('context-percent');
  const zoneBadge = document.getElementById('current-zone');

  if (fill) {
    fill.style.width = `${percent}%`;

    // Update fill class based on zone
    fill.classList.remove('degrading', 'dumb');
    if (zone === 'degrading') {
      fill.classList.add('degrading');
    } else if (zone === 'dumb') {
      fill.classList.add('dumb');
    }
  }

  if (percentDisplay) {
    percentDisplay.textContent = `${Math.round(percent)}%`;
  }

  if (zoneBadge) {
    zoneBadge.textContent = zone.toUpperCase();
    zoneBadge.classList.remove('smart', 'degrading', 'dumb');
    zoneBadge.classList.add(zone);
  }
}

/**
 * Update context stats
 */
function updateContextStats(telemetry) {
  const agentType = document.getElementById('agent-type');
  const currentTaskId = document.getElementById('current-task-id');

  if (agentType) {
    agentType.textContent = telemetry.agent_type
      ? telemetry.agent_type.toUpperCase()
      : '--';
  }

  if (currentTaskId) {
    currentTaskId.textContent = telemetry.current_task_id || '--';
  }
}

/**
 * Update progress display
 */
function updateProgress(progress) {
  const { total, completed, remaining, percentComplete } = progress;

  // Update stats
  const completedEl = document.getElementById('tasks-completed');
  const remainingEl = document.getElementById('tasks-remaining');
  const totalEl = document.getElementById('tasks-total');
  const percentEl = document.getElementById('progress-percent');

  if (completedEl) completedEl.textContent = completed;
  if (remainingEl) remainingEl.textContent = remaining;
  if (totalEl) totalEl.textContent = total;
  if (percentEl) percentEl.textContent = `${percentComplete}%`;

  // Update progress circle
  const progressArc = document.getElementById('progress-arc');
  if (progressArc) {
    // Circumference = 2 * PI * 45 = ~283
    const circumference = 283;
    const offset = circumference - (percentComplete / 100) * circumference;
    progressArc.style.strokeDashoffset = offset;
  }
}

/**
 * Update guardrails display
 */
function updateGuardrails(data) {
  const { typescript, tests, lint, krStandards, status } = data;

  // Update individual guardrails
  updateGuardrailItem('guardrail-typescript', typescript);
  updateGuardrailItem('guardrail-tests', tests);
  updateGuardrailItem('guardrail-lint', lint);
  updateGuardrailItem('guardrail-kr', krStandards);

  // Update status displays
  document.getElementById('ts-status').textContent = typescript?.passed ? 'PASS' : 'FAIL';
  document.getElementById('tests-status').textContent = tests?.passed ? 'PASS' : 'FAIL';
  document.getElementById('lint-status').textContent = lint?.passed ? 'PASS' : 'FAIL';
  document.getElementById('kr-status').textContent = krStandards?.passed ? 'PASS' : 'FAIL';

  // Update summary
  const summary = document.getElementById('guardrail-summary');
  if (summary) {
    summary.textContent = status === 'all_passing'
      ? 'All guardrails passing'
      : `Status: ${status.replace(/_/g, ' ')}`;
    summary.classList.toggle('status-passing', status === 'all_passing');
    summary.classList.toggle('status-failing', status !== 'all_passing');
  }
}

/**
 * Update individual guardrail item
 */
function updateGuardrailItem(elementId, data) {
  const element = document.getElementById(elementId);
  if (element && data) {
    element.classList.toggle('passing', data.passed);
    element.classList.toggle('failing', !data.passed);
  }
}

/**
 * Update last heartbeat
 */
function updateLastHeartbeat() {
  const element = document.getElementById('last-heartbeat');
  if (element) {
    element.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
  }
}

/**
 * Add activity to feed
 */
function addActivity(message, type = 'info') {
  const feed = document.getElementById('activity-feed');
  if (!feed) return;

  // Remove empty state
  const empty = feed.querySelector('.activity-empty');
  if (empty) {
    empty.remove();
  }

  // Create activity item
  const item = document.createElement('div');
  item.className = `activity-item ${type}`;

  const time = document.createElement('span');
  time.className = 'activity-time';
  time.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });

  const msg = document.createElement('span');
  msg.className = 'activity-message';
  msg.textContent = message;

  item.appendChild(time);
  item.appendChild(document.createTextNode(' '));
  item.appendChild(msg);

  // Add to top of feed
  feed.insertBefore(item, feed.firstChild);

  // Limit items
  while (feed.children.length > MAX_ACTIVITY_ITEMS) {
    feed.removeChild(feed.lastChild);
  }
}

/**
 * Update manager rotations
 */
function updateManagerRotations(count) {
  const element = document.getElementById('manager-rotations');
  if (element) {
    element.textContent = count;
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  initializeDashboard();
});
