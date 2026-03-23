#!/bin/sh
# OpenFaaS wrapper: reads JSON from stdin, extracts args, calls original script
# Supports S3 paths (s3://bucket/key) — downloads input, uploads output transparently
JSON=$(cat)
INPUT=$(echo "$JSON" | jq -r '.input')
OUTPUT=$(echo "$JSON" | jq -r '.output')
RUN_ID=$(echo "$JSON" | jq -r '.run_id // empty')
ROOT_PREFIX=$(echo "$JSON" | jq -r '.root_prefix // empty')
cd /home/app/function

if [ -z "$RUN_ID" ]; then
    RUN_ID="run-$$_$(date +%s)"
fi

# Use a unique staging dir per invocation to avoid race conditions
export S3_STAGING="/tmp/s3data_$$"

# Resolve S3 paths to local paths (downloads input from S3 if needed)
eval $(python s3_helper.py prepare "$INPUT" "$OUTPUT")

# Run original main.py with local paths
python main.py -i "$LOCAL_INPUT" -o "$LOCAL_OUTPUT"
EXIT_CODE=$?

# Upload output to S3 if the original output was an S3 path
if [ $EXIT_CODE -eq 0 ]; then
    python s3_helper.py upload "$LOCAL_OUTPUT" "$OUTPUT"
fi

if [ $EXIT_CODE -eq 0 ] && [ -n "$ROOT_PREFIX" ]; then
        python queue_helper.py \
            --current-stage "${CURRENT_STAGE:-ffmpeg-2}" \
            --run-id "$RUN_ID" \
            --root-prefix "$ROOT_PREFIX" \
            --input "$OUTPUT" \
            --next-targets-json "${NEXT_QUEUES_JSON:-[]}"
        EXIT_CODE=$?
fi

# Clean up this invocation's staging area
rm -rf "$S3_STAGING"

exit $EXIT_CODE
