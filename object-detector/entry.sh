#!/bin/sh
# OpenFaaS wrapper: reads JSON from stdin, extracts args, calls original script
# Supports optional --onnx_file argument (defaults to onnx/yolov4.onnx)
JSON=$(cat)
INPUT=$(echo "$JSON" | jq -r '.input')
OUTPUT=$(echo "$JSON" | jq -r '.output')
ONNX_FILE=$(echo "$JSON" | jq -r '.onnx_file // "onnx/yolov4.onnx"')
cd /home/app/function
exec python main.py -i "$INPUT" -o "$OUTPUT" -y "$ONNX_FILE"
