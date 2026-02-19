#!/bin/bash
# ============================================================================
# Compare JMeter results across different load levels
# ============================================================================
#
# Reads the .jtl result files and prints a comparison table.
#
# Usage:
#   ./compare-results.sh                        # Auto-detect results
#   ./compare-results.sh results/5-users/results_*.jtl results/10-users/results_*.jtl
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RESULTS_DIR="${SCRIPT_DIR}/results"

# ── Analyze a single .jtl file ─────────────────────────────────────────────────
analyze_jtl() {
    local file=$1
    local label=$2

    if [ ! -f "$file" ]; then
        echo "  File not found: $file"
        return
    fi

    # Skip header line; columns: timeStamp,elapsed,label,responseCode,responseMessage,
    #   threadName,dataType,success,failureMessage,bytes,sentBytes,grpThreads,allThreads,
    #   URL,Latency,IdleTime,Connect
    local total=$(tail -n +2 "$file" | wc -l | tr -d ' ')

    if [ "$total" -eq 0 ]; then
        echo "  No data in: $file"
        return
    fi

    local success=$(tail -n +2 "$file" | awk -F',' '{print $8}' | grep -c "true" || echo "0")
    local failed=$(( total - success ))
    local error_pct=$(echo "scale=1; $failed * 100 / $total" | bc 2>/dev/null || echo "N/A")

    # Response times (column 2 = elapsed time in ms)
    local stats=$(tail -n +2 "$file" | awk -F',' '
    {
        sum += $2
        sumsq += ($2 * $2)
        n++
        if (NR == 1 || $2 < min) min = $2
        if (NR == 1 || $2 > max) max = $2
        times[NR] = $2
    }
    END {
        avg = sum / n
        # Standard deviation
        variance = (sumsq / n) - (avg * avg)
        if (variance < 0) variance = 0
        stddev = sqrt(variance)

        # Sort for percentiles
        asort(times)
        p50 = times[int(n * 0.50)]
        p90 = times[int(n * 0.90)]
        p95 = times[int(n * 0.95)]
        p99 = times[int(n * 0.99)]

        # Throughput (requests/sec) based on time window
        printf "%.0f|%.0f|%.0f|%.0f|%.0f|%.0f|%.0f|%.0f", avg, min, max, stddev, p50, p90, p95, p99
    }')

    local avg=$(echo "$stats" | cut -d'|' -f1)
    local min=$(echo "$stats" | cut -d'|' -f2)
    local max=$(echo "$stats" | cut -d'|' -f3)
    local stddev=$(echo "$stats" | cut -d'|' -f4)
    local p50=$(echo "$stats" | cut -d'|' -f5)
    local p90=$(echo "$stats" | cut -d'|' -f6)
    local p95=$(echo "$stats" | cut -d'|' -f7)
    local p99=$(echo "$stats" | cut -d'|' -f8)

    # Calculate throughput from timestamps
    local throughput=$(tail -n +2 "$file" | awk -F',' '
    NR==1 {first=$1}
    {last=$1}
    END {
        duration_sec = (last - first) / 1000
        if (duration_sec > 0)
            printf "%.2f", NR / duration_sec
        else
            print "N/A"
    }')

    printf "│ %-12s │ %6s │ %6s │ %6s │ %7s │ %7s │ %7s │ %7s │ %7s │ %8s │ %6s │ %10s │\n" \
        "$label" "$total" "$success" "$failed" "${avg}ms" "${min}ms" "${max}ms" "${p50}ms" "${p90}ms" "${p95}ms" "${error_pct}%" "${throughput}/s"
}

# ── Per-function breakdown ─────────────────────────────────────────────────────
analyze_per_function() {
    local file=$1

    if [ ! -f "$file" ]; then
        return
    fi

    echo ""
    echo "  Per-Function Breakdown:"
    echo "  ┌──────────────────────────────────┬────────┬──────────┬──────────┬──────────┬──────────┐"
    echo "  │ Function                         │ Count  │ Avg (ms) │ Min (ms) │ Max (ms) │ Error %  │"
    echo "  ├──────────────────────────────────┼────────┼──────────┼──────────┼──────────┼──────────┤"

    tail -n +2 "$file" | awk -F',' '
    {
        label = $3
        elapsed = $2
        success = $8

        count[label]++
        sum[label] += elapsed
        if (!(label in min_val) || elapsed < min_val[label]) min_val[label] = elapsed
        if (!(label in max_val) || elapsed > max_val[label]) max_val[label] = elapsed
        if (success != "true") errors[label]++
    }
    END {
        for (label in count) {
            avg = sum[label] / count[label]
            err = (errors[label]+0) * 100 / count[label]
            printf "  │ %-32s │ %6d │ %8.0f │ %8d │ %8d │ %7.1f%% │\n",
                label, count[label], avg, min_val[label], max_val[label], err
        }
    }' | sort

    echo "  └──────────────────────────────────┴────────┴──────────┴──────────┴──────────┴──────────┘"
}

# ── Main ───────────────────────────────────────────────────────────────────────
main() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗"
    echo "║   VideoSearcher Load Test — Results Comparison                                                                     ║"
    echo "╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝"
    echo ""

    # Auto-detect result files OR use provided arguments
    if [ $# -gt 0 ]; then
        files=("$@")
    else
        files=()
        for level in 5 10 15; do
            local dir="${RESULTS_DIR}/${level}-users"
            if [ -d "$dir" ]; then
                local latest=$(ls -t "$dir"/results_*.jtl 2>/dev/null | head -1)
                if [ -n "$latest" ]; then
                    files+=("$latest")
                fi
            fi
        done
    fi

    if [ ${#files[@]} -eq 0 ]; then
        echo "  No result files found."
        echo "  Run the tests first: ./run-tests.sh"
        exit 1
    fi

    echo "┌──────────────┬────────┬────────┬────────┬─────────┬─────────┬─────────┬─────────┬─────────┬──────────┬────────┬────────────┐"
    echo "│ Test Level   │ Total  │  Pass  │  Fail  │   Avg   │   Min   │   Max   │   P50   │   P90   │   P95    │ Err %  │ Throughput │"
    echo "├──────────────┼────────┼────────┼────────┼─────────┼─────────┼─────────┼─────────┼─────────┼──────────┼────────┼────────────┤"

    for file in "${files[@]}"; do
        # Extract label from directory name (e.g., "5-users")
        local label=$(basename "$(dirname "$file")")
        analyze_jtl "$file" "$label"
    done

    echo "└──────────────┴────────┴────────┴────────┴─────────┴─────────┴─────────┴─────────┴─────────┴──────────┴────────┴────────────┘"

    # Per-function breakdown for each level
    for file in "${files[@]}"; do
        local label=$(basename "$(dirname "$file")")
        echo ""
        echo "═══ ${label} ═══"
        analyze_per_function "$file"
    done

    echo ""
    echo "  HTML reports available at:"
    for file in "${files[@]}"; do
        local dir=$(dirname "$file")
        local report=$(ls -td "${dir}"/report_* 2>/dev/null | head -1)
        if [ -n "$report" ]; then
            echo "    → ${report}/index.html"
        fi
    done
    echo ""
}

main "$@"
