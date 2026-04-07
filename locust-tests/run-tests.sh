#!/bin/bash
# ============================================================================
# VideoSearcher OpenFaaS — Locust Stage-1 Trigger Load Test Runner
# ============================================================================
#
# Runs the Locust test plan at multiple concurrency levels (5, 10, 15 users)
# with exponential think time between requests (default mean 20s).
#
# Important:
#   This plan triggers ONLY the first stage (ffmpeg-0).
#   Remaining stages are chained asynchronously via SQS by OpenFaaS functions.
#
# Usage:
#   ./run-tests.sh                     # Run all 3 load levels (5, 10, 15 users)
#   ./run-tests.sh 5                   # Run only with 5 users
#   ./run-tests.sh 5 10                # Run with 5 and 10 users
#
# Prerequisites:
#   - Locust installed (pip install locust)
#   - OpenFaaS gateway accessible at http://127.0.0.1:8080
#   - OpenFaaS functions deployed (at minimum ffmpeg-0)
#
# Results are saved to: locust-tests/results/<users>-users/
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOCUST_FILE="${SCRIPT_DIR}/locustfile.py"
RESULTS_DIR="${SCRIPT_DIR}/results"

# ── Configuration ──────────────────────────────────────────────────────────────
GATEWAY_HOST="${GATEWAY_HOST:-a86db78a1498941edbb5952f01041129-854708034.us-east-1.elb.amazonaws.com}"
GATEWAY_PORT="${GATEWAY_PORT:-8080}"
export THINK_TIME_S="${THINK_TIME_S:-20.0}" # Think time mean in seconds
RAMP_UP="${RAMP_UP:-10}"                   # Ramp-up period in seconds
DURATION="${DURATION:-300}"                # Test duration per level in seconds
USER_LEVELS="${@:-5 10 15}"                # Default: 5, 10, 15 concurrent users

# ── Preflight checks ──────────────────────────────────────────────────────────
check_prerequisites() {
    echo "=== Preflight Checks ==="

    if ! command -v locust &>/dev/null; then
        echo "ERROR: Locust not found. Install with: pip3 install locust"
        exit 1
    fi
    echo "  ✓ Locust: $(locust -V)"

    if [ ! -f "$LOCUST_FILE" ]; then
        echo "ERROR: Locust test plan not found: $LOCUST_FILE"
        exit 1
    fi
    echo "  ✓ Test plan: $LOCUST_FILE"

    if curl -s --connect-timeout 5 "http://${GATEWAY_HOST}:${GATEWAY_PORT}/healthz" &>/dev/null; then
        echo "  ✓ OpenFaaS gateway: http://${GATEWAY_HOST}:${GATEWAY_PORT}"
    else
        echo "  ⚠ WARNING: OpenFaaS gateway not reachable at http://${GATEWAY_HOST}:${GATEWAY_PORT}"
        echo "    Tests will still run but requests will fail."
        read -p "    Continue anyway? [y/N] " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi

    echo ""
}

# ── Run a single test at a given concurrency level ─────────────────────────────
run_test() {
    local users=$1
    local run_dir="${RESULTS_DIR}/${users}-users"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local csv_prefix="${run_dir}/results_${timestamp}"
    local log_file="${run_dir}/locust_${timestamp}.log"
    local report_file="${run_dir}/report_${timestamp}.html"

    # Calculate spawn rate: users / RAMP_UP
    local spawn_rate=$(awk "BEGIN {print $users / $RAMP_UP}")
    if (( $(echo "$spawn_rate <= 0" | awk '{print ($1 <= 0) ? 1 : 0}') )); then
        spawn_rate=1
    fi

    echo "============================================================"
    echo " Load Test: ${users} Concurrent Users (Stage-1 Trigger Only)"
    echo "============================================================"
    echo "  Think Time:  ${THINK_TIME_S}s (Mean)"
    echo "  Spawn Rate:  ${spawn_rate} users/s (Ramp-up: ${RAMP_UP}s)"
    echo "  Duration:    ${DURATION}s ($(( DURATION / 60 ))m)"
    echo "  Results:     ${csv_prefix}_stats.csv"
    echo "  HTML Report: ${report_file}"
    echo "------------------------------------------------------------"

    # Create output directory
    mkdir -p "$run_dir"

    # Run Locust in headless mode
    echo "  Starting test at $(date '+%H:%M:%S')..."
    locust -f "$LOCUST_FILE" \
        --headless \
        -u "$users" \
        -r "$spawn_rate" \
        -t "${DURATION}s" \
        --host "http://${GATEWAY_HOST}:${GATEWAY_PORT}" \
        --csv "$csv_prefix" \
        --html "$report_file" \
        --logfile "$log_file" \
        --loglevel INFO 2>&1 | tail -20

    echo ""
    echo "  ✓ Test completed at $(date '+%H:%M:%S')"
    echo "  ✓ CSV stats:     ${csv_prefix}_stats.csv"
    echo "  ✓ HTML report:   ${report_file}"
    echo "  ✓ Locust log:    ${log_file}"
    echo ""
    
    if [ -f "${csv_prefix}_stats.csv" ]; then
        echo "  ── Quick Summary ──"
        # Print summary line of aggregated data
        grep "Aggregated" "${csv_prefix}_stats.csv" | awk -F',' '{print "  Total requests:  " $3 "\n  Failures:        " $4}'
        echo ""
    fi
}

# ── Main ───────────────────────────────────────────────────────────────────────
main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║ VideoSearcher OpenFaaS — Stage-1 Trigger Locust Test      ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "  Gateway:     http://${GATEWAY_HOST}:${GATEWAY_PORT}"
    echo "  Mode:        Locust -> ffmpeg-0 only (SQS handles next stages)"
    echo "  Think Time:  ${THINK_TIME_S}s (Mean)"
    echo "  Duration:    ${DURATION}s per level"
    echo "  User Levels: ${USER_LEVELS}"
    echo ""

    check_prerequisites

    for users in $USER_LEVELS; do
        run_test "$users"

        # Brief pause between test levels to let system stabilize
        if [ "$users" != "$(echo $USER_LEVELS | awk '{print $NF}')" ]; then
            echo "  ⏳ Waiting 30s before next test level..."
            sleep 30
        fi
    done

    echo "============================================================"
    echo " ALL TESTS COMPLETE"
    echo "============================================================"
    echo ""
    echo " Results directory: ${RESULTS_DIR}/"
    echo ""
    echo " To view HTML reports, open in a browser:"
    for users in $USER_LEVELS; do
        local report_file=$(ls -t "${RESULTS_DIR}/${users}-users/report_"*.html 2>/dev/null | head -1)
        if [ -n "$report_file" ]; then
            echo "   ${users} users: open ${report_file}"
        fi
    done
    echo ""
}

main
