#!/bin/bash
# ============================================================================
# VideoSearcher OpenFaaS — JMeter Load Test Runner
# ============================================================================
#
# Runs the JMeter test plan at multiple concurrency levels (5, 10, 15 users)
# with 20-second think time between requests, simulating realistic user behavior.
#
# Usage:
#   ./run-tests.sh                     # Run all 3 load levels (5, 10, 15 users)
#   ./run-tests.sh 5                   # Run only with 5 users
#   ./run-tests.sh 5 10                # Run with 5 and 10 users
#
# Prerequisites:
#   - JMeter installed (brew install jmeter)
#   - OpenFaaS gateway accessible at http://127.0.0.1:8080
#   - All 7 VideoSearcher functions deployed
#
# Results are saved to: jmeter-tests/results/<users>-users/
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEST_PLAN="${SCRIPT_DIR}/videosearcher-load-test.jmx"
RESULTS_DIR="${SCRIPT_DIR}/results"

# ── Configuration ──────────────────────────────────────────────────────────────
GATEWAY_HOST="${GATEWAY_HOST:-127.0.0.1}"
GATEWAY_PORT="${GATEWAY_PORT:-8080}"
THINK_TIME="${THINK_TIME:-20000}"          # 20 seconds in milliseconds
RAMP_UP="${RAMP_UP:-10}"                   # Ramp-up period in seconds
DURATION="${DURATION:-300}"                # Test duration: 5 minutes per level
USER_LEVELS="${@:-5 10 15}"                # Default: 5, 10, 15 concurrent users

# ── Preflight checks ──────────────────────────────────────────────────────────
check_prerequisites() {
    echo "=== Preflight Checks ==="

    # Check JMeter
    if ! command -v jmeter &>/dev/null; then
        echo "ERROR: JMeter not found. Install with: brew install jmeter"
        exit 1
    fi
    echo "  ✓ JMeter: $(jmeter --version 2>&1 | head -1)"

    # Check test plan exists
    if [ ! -f "$TEST_PLAN" ]; then
        echo "ERROR: Test plan not found: $TEST_PLAN"
        exit 1
    fi
    echo "  ✓ Test plan: $TEST_PLAN"

    # Check OpenFaaS gateway is reachable
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
    local result_file="${run_dir}/results_${timestamp}.jtl"
    local log_file="${run_dir}/jmeter_${timestamp}.log"
    local report_dir="${run_dir}/report_${timestamp}"

    echo "============================================================"
    echo " Load Test: ${users} Concurrent Users"
    echo "============================================================"
    echo "  Think Time:  ${THINK_TIME}ms ($(( THINK_TIME / 1000 ))s)"
    echo "  Ramp-up:     ${RAMP_UP}s"
    echo "  Duration:    ${DURATION}s ($(( DURATION / 60 ))m)"
    echo "  Results:     ${result_file}"
    echo "  Report:      ${report_dir}"
    echo "------------------------------------------------------------"

    # Create output directory
    mkdir -p "$run_dir"

    # Run JMeter in non-GUI (CLI) mode
    echo "  Starting test at $(date '+%H:%M:%S')..."
    jmeter -n \
        -t "$TEST_PLAN" \
        -l "$result_file" \
        -j "$log_file" \
        -Jusers="${users}" \
        -Jrampup="${RAMP_UP}" \
        -Jduration="${DURATION}" \
        -Jthinktime="${THINK_TIME}" \
        -Jhost="${GATEWAY_HOST}" \
        -Jport="${GATEWAY_PORT}" \
        -e -o "$report_dir" \
        2>&1 | tail -20

    echo ""
    echo "  ✓ Test completed at $(date '+%H:%M:%S')"
    echo "  ✓ Raw results:   ${result_file}"
    echo "  ✓ HTML report:   ${report_dir}/index.html"
    echo "  ✓ JMeter log:    ${log_file}"
    echo ""

    # Print quick summary from the .jtl file
    if [ -f "$result_file" ]; then
        echo "  ── Quick Summary ──"
        local total=$(tail -n +2 "$result_file" | wc -l | tr -d ' ')
        local success=$(tail -n +2 "$result_file" | awk -F',' '{print $8}' | grep -c "true" || echo "0")
        local failed=$(( total - success ))
        echo "  Total requests:  ${total}"
        echo "  Successful:      ${success}"
        echo "  Failed:          ${failed}"
        if [ "$total" -gt 0 ]; then
            local avg_time=$(tail -n +2 "$result_file" | awk -F',' '{sum+=$2; n++} END {if(n>0) printf "%.0f", sum/n; else print "N/A"}')
            local min_time=$(tail -n +2 "$result_file" | awk -F',' 'NR==1{min=$2} $2<min{min=$2} END {print min}')
            local max_time=$(tail -n +2 "$result_file" | awk -F',' 'NR==1{max=$2} $2>max{max=$2} END {print max}')
            echo "  Avg response:    ${avg_time}ms"
            echo "  Min response:    ${min_time}ms"
            echo "  Max response:    ${max_time}ms"
        fi
        echo ""
    fi
}

# ── Main ───────────────────────────────────────────────────────────────────────
main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║   VideoSearcher OpenFaaS — JMeter Performance Tests      ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "  Gateway:     http://${GATEWAY_HOST}:${GATEWAY_PORT}"
    echo "  Think Time:  ${THINK_TIME}ms"
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
        local report_dir=$(ls -td "${RESULTS_DIR}/${users}-users/report_"* 2>/dev/null | head -1)
        if [ -n "$report_dir" ]; then
            echo "   ${users} users: open ${report_dir}/index.html"
        fi
    done
    echo ""
}

main
