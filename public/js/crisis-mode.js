/**
 * Crisis Mode implementation
 * Crisis button handler, sends pkill commands, git reset
 */

/**
 * Initialize crisis mode handlers
 */
function initializeCrisisMode() {
  const crisisButton = document.getElementById('crisis-button');
  const crisisModal = document.getElementById('crisis-modal');
  const crisisKill = document.getElementById('crisis-kill');
  const crisisPause = document.getElementById('crisis-pause');
  const crisisCancel = document.getElementById('crisis-cancel');

  if (crisisButton) {
    crisisButton.addEventListener('click', openCrisisModal);
  }

  if (crisisKill) {
    crisisKill.addEventListener('click', () => handleCrisisAction('kill'));
  }

  if (crisisPause) {
    crisisPause.addEventListener('click', () => handleCrisisAction('pause'));
  }

  if (crisisCancel) {
    crisisCancel.addEventListener('click', closeCrisisModal);
  }

  // Close modal on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && crisisModal && crisisModal.classList.contains('active')) {
      closeCrisisModal();
    }
  });

  // Close modal on backdrop click
  if (crisisModal) {
    crisisModal.addEventListener('click', (e) => {
      if (e.target === crisisModal) {
        closeCrisisModal();
      }
    });
  }
}

/**
 * Open crisis modal
 */
function openCrisisModal() {
  const modal = document.getElementById('crisis-modal');
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

/**
 * Close crisis modal
 */
function closeCrisisModal() {
  const modal = document.getElementById('crisis-modal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

/**
 * Handle crisis action
 */
async function handleCrisisAction(action) {
  closeCrisisModal();

  const reason = prompt('Enter reason for crisis mode activation:');
  if (!reason) {
    addActivity('Crisis mode cancelled', 'warning');
    return;
  }

  try {
    // Send to server
    const response = await fetch('/api/crisis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, reason }),
    });

    const data = await response.json();

    if (data.success) {
      addActivity(`CRISIS MODE: ${action} - ${reason}`, 'error');

      // Trigger via socket for real-time notification
      if (typeof triggerCrisis === 'function') {
        triggerCrisis(action, reason);
      }

      // Show confirmation
      showCrisisConfirmation(action, reason);
    } else {
      addActivity(`Crisis mode failed: ${data.error}`, 'error');
    }
  } catch (error) {
    console.error('Crisis mode error:', error);
    addActivity(`Crisis mode error: ${error.message}`, 'error');
  }
}

/**
 * Show crisis confirmation
 */
function showCrisisConfirmation(action, reason) {
  const actionTexts = {
    kill: 'All processes have been terminated.',
    pause: 'Operations have been paused.',
    reset: 'Git reset has been performed.',
  };

  const message = `
CRISIS MODE ACTIVATED

Action: ${action.toUpperCase()}
Reason: ${reason}

${actionTexts[action] || 'Action completed.'}

Please review the situation and take appropriate action.
  `.trim();

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'crisis-overlay';
  overlay.innerHTML = `
    <div class="crisis-confirmation">
      <h2>CRISIS MODE</h2>
      <pre>${message}</pre>
      <button onclick="this.parentElement.parentElement.remove()">Acknowledge</button>
    </div>
  `;

  // Add styles
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(248, 81, 73, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    animation: crisis-flash 0.5s ease-in-out;
  `;

  const confirmation = overlay.querySelector('.crisis-confirmation');
  if (confirmation) {
    confirmation.style.cssText = `
      background: var(--color-surface);
      padding: 2rem;
      border-radius: 1rem;
      text-align: center;
      max-width: 500px;
      border: 3px solid var(--color-error);
      box-shadow: 0 0 50px rgba(248, 81, 73, 0.5);
    `;
  }

  const h2 = overlay.querySelector('h2');
  if (h2) {
    h2.style.cssText = `
      color: var(--color-error);
      font-size: 2rem;
      margin-bottom: 1rem;
      animation: pulse 1s ease-in-out infinite;
    `;
  }

  const pre = overlay.querySelector('pre');
  if (pre) {
    pre.style.cssText = `
      text-align: left;
      background: rgba(0, 0, 0, 0.3);
      padding: 1rem;
      border-radius: 0.5rem;
      margin-bottom: 1rem;
      white-space: pre-wrap;
      font-family: var(--font-mono);
    `;
  }

  const button = overlay.querySelector('button');
  if (button) {
    button.style.cssText = `
      background: var(--color-error);
      color: white;
      border: none;
      padding: 1rem 2rem;
      font-size: 1rem;
      font-weight: 600;
      border-radius: 0.5rem;
      cursor: pointer;
    `;
  }

  document.body.appendChild(overlay);

  // Add flash animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes crisis-flash {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.8; }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Emergency kill all processes
 */
async function emergencyKill() {
  if (!confirm('This will kill all running processes. Are you sure?')) {
    return;
  }

  await handleCrisisAction('kill');
}

/**
 * Pause all operations
 */
async function pauseOperations() {
  await handleCrisisAction('pause');
}

/**
 * Git reset (dangerous!)
 */
async function gitReset() {
  if (!confirm('This will perform a git reset. Uncommitted changes will be lost. Are you absolutely sure?')) {
    return;
  }

  await handleCrisisAction('reset');
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  initializeCrisisMode();
});
