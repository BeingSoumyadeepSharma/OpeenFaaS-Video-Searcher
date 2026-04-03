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
    if [ "${CURRENT_STAGE:-ffmpeg-3}" = "ffmpeg-3" ]; then
        # ffmpeg-3 produces multiple frames; enqueue one message per frame.
        CURRENT_STAGE_ENV="${CURRENT_STAGE:-ffmpeg-3}" \
        RUN_ID_ENV="$RUN_ID" \
        ROOT_PREFIX_ENV="$ROOT_PREFIX" \
        LOCAL_OUTPUT_ENV="$LOCAL_OUTPUT" \
        NEXT_TARGETS_JSON_ENV="${NEXT_QUEUES_JSON:-[]}" \
        python - <<'PY'
import glob
import json
import os
import sys

import boto3


def join_prefix(root, suffix):
    return root.rstrip("/") + "/" + suffix.lstrip("/")


def load_targets(raw):
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        print(f"QUEUE_HELPER: invalid NEXT_QUEUES_JSON: {exc}", file=sys.stderr)
        return []

    valid = []
    for item in parsed if isinstance(parsed, list) else []:
        if not isinstance(item, dict):
            continue
        queue_url = item.get("queue_url", "")
        stage = item.get("stage") or item.get("target_stage") or ""
        if not queue_url or not stage:
            continue
        valid.append({"queue_url": queue_url, "stage": stage})
    return valid


def stage_dir(stage_name):
    mapping = {
        "ffmpeg-0": "ffmpeg0",
        "librosa": "librosa",
        "ffmpeg-1": "ffmpeg1",
        "ffmpeg-2": "ffmpeg2",
        "ffmpeg-3": "ffmpeg3",
        "deepspeech": "deepspeech",
        "object-detector": "objdetect",
    }
    return mapping.get(stage_name, stage_name)


current_stage = os.environ.get("CURRENT_STAGE_ENV", "ffmpeg-3")
run_id = os.environ.get("RUN_ID_ENV", "")
root_prefix = os.environ.get("ROOT_PREFIX_ENV", "")
local_output = os.environ.get("LOCAL_OUTPUT_ENV", "")
raw_targets = os.environ.get("NEXT_TARGETS_JSON_ENV", "[]")

targets = load_targets(raw_targets)
if not targets:
    print("QUEUE_HELPER: no valid next targets configured", file=sys.stderr)
    sys.exit(0)

output_dir = os.path.dirname(local_output)
output_base = os.path.basename(local_output)
frame_pattern = os.path.join(output_dir, output_base + "-*.jpg")
frame_files = sorted(glob.glob(frame_pattern))

if not frame_files:
    print(f"QUEUE_HELPER: no frames found for pattern {frame_pattern}", file=sys.stderr)
    sys.exit(0)

sqs = boto3.client("sqs", region_name=os.environ.get("AWS_DEFAULT_REGION"))

for frame_path in frame_files:
    frame_name = os.path.basename(frame_path)
    frame_stem, _ = os.path.splitext(frame_name)
    # With the recent queue_helper fix, frames are now correctly placed
    # in the ffmpeg3/ folder instead of the root. Update the SQS payload to match.
    frame_input_uri = join_prefix(root_prefix, f"ffmpeg3/{frame_name}")

    for target in targets:
        target_stage = target["stage"]
        out_dir = stage_dir(target_stage)
        output_uri = join_prefix(root_prefix, f"{out_dir}/{frame_stem}")

        message = {
            "run_id": run_id,
            "source_stage": current_stage,
            "root_prefix": root_prefix,
            "input": frame_input_uri,
            "output": output_uri,
        }

        sqs.send_message(
            QueueUrl=target["queue_url"],
            MessageBody=json.dumps(message),
        )

print(
    f"QUEUE_HELPER: queued {len(frame_files)} frame message(s) from {current_stage}",
    file=sys.stderr,
)
PY
        EXIT_CODE=$?
    else
        python queue_helper.py \
            --current-stage "${CURRENT_STAGE:-ffmpeg-3}" \
            --run-id "$RUN_ID" \
            --root-prefix "$ROOT_PREFIX" \
            --input "$OUTPUT" \
            --next-targets-json "${NEXT_QUEUES_JSON:-[]}"
        EXIT_CODE=$?
    fi
fi

# Clean up this invocation's staging area
rm -rf "$S3_STAGING"

exit $EXIT_CODE
