#!/bin/bash

# KR-Wiggum Orchestrator
# Manages Manager/Worker lifecycles with exit code handling
# Exit codes:
#   0  - Success (all tasks complete)
#   1  - Task failed
#   10 - Manager rotation needed
#   20 - Human intervention required (crisis mode)
#   99 - Crash

set -e

# Configuration
MAX_MANAGER_ROTATIONS=${MAX_MANAGER_ROTATIONS:-10}
MAX_CONSECUTIVE_FAILURES=${MAX_CONSECUTIVE_FAILURES:-3}
RETRY_SLEEP=${RETRY_SLEEP:-5}
PROJECT_PATH=${PROJECT_PATH:-$(pwd)}

# State
manager_rotations=0
consecutive_failures=0
crisis_mode=false
crisis_reason=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging
log_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_manager() {
    echo -e "${BLUE}[MANAGER]${NC} $1"
}

# Crisis mode handler
enter_crisis_mode() {
    crisis_mode=true
    crisis_reason="$1"
    log_error "CRISIS MODE ACTIVATED: $crisis_reason"
    log_error "Human intervention required!"

    # Write crisis file
    echo "{\"crisis\": true, \"reason\": \"$crisis_reason\", \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" > "$PROJECT_PATH/.ralph/crisis.json"

    exit 20
}

# Handle Manager exit code
handle_manager_exit() {
    local exit_code=$1

    case $exit_code in
        0)
            log_success "Manager completed successfully - all tasks done"
            consecutive_failures=0
            return 0
            ;;
        10)
            log_manager "Manager rotation requested (context full)"
            consecutive_failures=0
            manager_rotations=$((manager_rotations + 1))
            return 10
            ;;
        20)
            enter_crisis_mode "Manager requested human intervention"
            ;;
        1)
            log_warning "Manager task failed"
            consecutive_failures=$((consecutive_failures + 1))

            if [ $consecutive_failures -ge $MAX_CONSECUTIVE_FAILURES ]; then
                enter_crisis_mode "$MAX_CONSECUTIVE_FAILURES consecutive failures"
            fi

            log_info "Retrying in ${RETRY_SLEEP}s... (failure $consecutive_failures/$MAX_CONSECUTIVE_FAILURES)"
            sleep $RETRY_SLEEP
            return 1
            ;;
        *)
            log_error "Manager crashed with exit code $exit_code"
            consecutive_failures=$((consecutive_failures + 1))

            if [ $consecutive_failures -ge $MAX_CONSECUTIVE_FAILURES ]; then
                enter_crisis_mode "$MAX_CONSECUTIVE_FAILURES consecutive crashes"
            fi

            log_info "Retrying in $((RETRY_SLEEP * 2))s..."
            sleep $((RETRY_SLEEP * 2))
            return 99
            ;;
    esac
}

# Run Manager process
run_manager() {
    local handoff_file=""

    if [ $manager_rotations -gt 0 ]; then
        handoff_file="$PROJECT_PATH/.agent/SHIFT_HANDOFF.md"
        log_manager "Starting Manager rotation #$manager_rotations with handoff"
    else
        log_manager "Starting initial Manager"
    fi

    # Export environment
    export NODE_ENV=production
    export MANAGER_MODE=true
    export PROJECT_PATH="$PROJECT_PATH"

    if [ -n "$handoff_file" ]; then
        export HANDOFF_FILE="$handoff_file"
    fi

    # Run the Manager
    # In production, this would invoke Claude Code
    # For now, run the TypeScript entry point
    cd "$PROJECT_PATH"

    local exit_code=0
    node --experimental-specifier-resolution=node dist/manager-entry.js || exit_code=$?

    return $exit_code
}

# Main orchestration loop
main() {
    log_info "KR-Wiggum Orchestrator starting..."
    log_info "Project: $PROJECT_PATH"
    log_info "Max rotations: $MAX_MANAGER_ROTATIONS"
    log_info "Max failures: $MAX_CONSECUTIVE_FAILURES"

    # Ensure directories exist
    mkdir -p "$PROJECT_PATH/.agent"
    mkdir -p "$PROJECT_PATH/.ralph"

    while true; do
        # Check rotation limit
        if [ $manager_rotations -ge $MAX_MANAGER_ROTATIONS ]; then
            log_warning "Max Manager rotations ($MAX_MANAGER_ROTATIONS) reached"
            enter_crisis_mode "Max rotations exceeded"
        fi

        # Check crisis mode
        if [ "$crisis_mode" = true ]; then
            exit 20
        fi

        # Run Manager
        run_manager
        local exit_code=$?

        # Handle exit code
        handle_manager_exit $exit_code
        local handler_result=$?

        # Check if we should continue
        case $handler_result in
            0)
                # Success - exit loop
                log_success "Orchestration complete!"
                exit 0
                ;;
            10)
                # Rotation - continue loop
                continue
                ;;
            *)
                # Retry - continue loop
                continue
                ;;
        esac
    done
}

# Signal handlers
trap 'log_warning "Interrupted - stopping..."; exit 130' INT TERM

# Run main
main "$@"
