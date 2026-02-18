#!/bin/sh
# OpenFaaS wrapper: reads JSON from stdin, extracts args, calls original script
JSON=$(cat)
INPUT=$(echo "$JSON" | jq -r '.input')
OUTPUT=$(echo "$JSON" | jq -r '.output')
cd /home/app/function
exec python main.py -i "$INPUT" -o "$OUTPUT"
