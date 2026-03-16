#!/bin/sh
# OpenFaaS wrapper: reads JSON from stdin, extracts args, calls original script
# Supports S3 paths (s3://bucket/key) — downloads input, uploads output transparently
JSON=$(cat)
INPUT=$(echo "$JSON" | jq -r '.input')
OUTPUT=$(echo "$JSON" | jq -r '.output')
cd /home/app/function

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

# Clean up this invocation's staging area
rm -rf "$S3_STAGING"

exit $EXIT_CODE
