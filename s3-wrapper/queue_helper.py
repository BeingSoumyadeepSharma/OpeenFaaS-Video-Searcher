#!/usr/bin/env python3
"""
Queue helper for OpenFaaS stage chaining with AWS SQS.

Each function can publish one or more next-stage messages after successful
processing. Message payloads carry S3 URI pointers and run metadata.
"""

import argparse
import importlib
import json
import os
import sys
import uuid

boto3 = importlib.import_module("boto3")

STAGE_OUTPUT_DIR = {
    "ffmpeg-0": "ffmpeg0",
    "librosa": "librosa",
    "ffmpeg-1": "ffmpeg1",
    "ffmpeg-2": "ffmpeg2",
    "ffmpeg-3": "ffmpeg3",
    "deepspeech": "deepspeech",
    "object-detector": "objdetect",
}

STAGE_PRIMARY_ARTIFACT = {
    "ffmpeg-0": ".tar.gz",
    "librosa": ".tar.gz",
    "ffmpeg-1": "_0.mp4",
    "ffmpeg-2": ".tar.gz",
    "ffmpeg-3": "-1.jpg",
    "deepspeech": ".tar.gz",
    "object-detector": ".jpg",
}


def _join_s3_prefix(root_prefix, suffix):
    return root_prefix.rstrip("/") + "/" + suffix.lstrip("/")


def _stage_output_uri(root_prefix, stage_name):
    if stage_name not in STAGE_OUTPUT_DIR:
        raise ValueError(f"Unknown stage for output mapping: {stage_name}")
    return _join_s3_prefix(root_prefix, STAGE_OUTPUT_DIR[stage_name])


def _produced_artifact_uri(stage_name, output_base_uri):
    suffix = STAGE_PRIMARY_ARTIFACT.get(stage_name, "")
    return output_base_uri + suffix


def _parse_targets(raw_json):
    try:
        targets = json.loads(raw_json)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid NEXT_QUEUES_JSON: {exc}") from exc

    if not isinstance(targets, list):
        raise ValueError("NEXT_QUEUES_JSON must be a list")

    valid = []
    for item in targets:
        if not isinstance(item, dict):
            continue
        queue_url = item.get("queue_url", "")
        stage = item.get("stage", "")
        if not queue_url or not stage:
            continue
        # Skip placeholders intentionally left for user configuration.
        if "<" in queue_url or ">" in queue_url:
            continue
        valid.append({"queue_url": queue_url, "stage": stage})
    return valid


def enqueue_next(current_stage, run_id, root_prefix, output_base_uri, next_targets_json):
    targets = _parse_targets(next_targets_json)
    if not targets:
        print("QUEUE_HELPER: no valid next targets configured", file=sys.stderr)
        return 0

    sqs = boto3.client("sqs", region_name=os.environ.get("AWS_DEFAULT_REGION"))

    produced_input_uri = _produced_artifact_uri(current_stage, output_base_uri)

    for target in targets:
        body = {
            "run_id": run_id,
            "source_stage": current_stage,
            "root_prefix": root_prefix,
            "input": produced_input_uri,
            "output": _stage_output_uri(root_prefix, target["stage"]),
        }
        sqs.send_message(QueueUrl=target["queue_url"], MessageBody=json.dumps(body))
        print(
            "QUEUE_HELPER: queued next stage "
            f"{current_stage} -> {target['stage']} on {target['queue_url']}",
            file=sys.stderr,
        )

    return 0


def main():
    parser = argparse.ArgumentParser(description="Publish next-stage SQS messages")
    parser.add_argument("--current-stage", required=True)
    parser.add_argument("--run-id", default=str(uuid.uuid4()))
    parser.add_argument("--root-prefix", required=True)
    parser.add_argument("--input", required=True)
    parser.add_argument("--next-targets-json", required=True)

    args = parser.parse_args()

    return enqueue_next(
        current_stage=args.current_stage,
        run_id=args.run_id,
        root_prefix=args.root_prefix,
        output_base_uri=args.input,
        next_targets_json=args.next_targets_json,
    )


if __name__ == "__main__":
    sys.exit(main())
