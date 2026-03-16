#!/usr/bin/env python3
"""
S3 Helper for OpenFaaS VideoSearcher functions.

Provides transparent S3 download/upload so original main.py files remain untouched.
When input or output paths start with "s3://", this script handles the transfer
between S3 and the local filesystem. Local (non-S3) paths pass through unchanged.

Usage in entry.sh:
    # 1. Resolve paths — downloads input from S3 if needed
    eval $(python s3_helper.py prepare "$INPUT" "$OUTPUT")
    # Sets LOCAL_INPUT and LOCAL_OUTPUT shell variables

    # 2. Run original main.py with local paths
    python main.py -i "$LOCAL_INPUT" -o "$LOCAL_OUTPUT"

    # 3. Upload output to S3 if needed
    python s3_helper.py upload "$LOCAL_OUTPUT" "$OUTPUT"

Environment variables for AWS credentials (optional on EKS with IRSA):
    AWS_ACCESS_KEY_ID
    AWS_SECRET_ACCESS_KEY
    AWS_DEFAULT_REGION
"""

import sys
import os

# S3 staging directories — use per-invocation dir to avoid race conditions
# when the classic watchdog forks concurrent processes on the same pod.
S3_STAGING = os.environ.get("S3_STAGING", "/tmp/s3data")
S3_INPUT_DIR = os.path.join(S3_STAGING, "input")
S3_OUTPUT_DIR = os.path.join(S3_STAGING, "output")


def is_s3_path(path):
    """Check if a path is an S3 URI."""
    return path.startswith("s3://")


def parse_s3_uri(uri):
    """Parse an S3 URI into (bucket, key)."""
    # s3://bucket/path/to/key -> ("bucket", "path/to/key")
    without_scheme = uri[5:]  # Remove "s3://"
    slash_idx = without_scheme.index("/")
    bucket = without_scheme[:slash_idx]
    key = without_scheme[slash_idx + 1:]
    return bucket, key


def s3_download_file(s3_uri, local_path):
    """Download a single file from S3."""
    import boto3
    bucket, key = parse_s3_uri(s3_uri)
    s3 = boto3.client("s3")

    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    s3.download_file(bucket, key, local_path)
    print("S3_HELPER: Downloaded s3://{}/{} -> {}".format(bucket, key, local_path),
          file=sys.stderr)


def s3_download_prefix(s3_uri, local_dir):
    """Download all files under an S3 prefix (directory) to a local directory."""
    import boto3
    bucket, key = parse_s3_uri(s3_uri)
    s3 = boto3.client("s3")

    prefix = key if key.endswith("/") else key + "/"
    os.makedirs(local_dir, exist_ok=True)

    paginator = s3.get_paginator("list_objects_v2")
    count = 0
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get("Contents", []):
            rel_path = obj["Key"][len(prefix):]
            if not rel_path:
                continue
            local_file = os.path.join(local_dir, rel_path)
            os.makedirs(os.path.dirname(local_file), exist_ok=True)
            s3.download_file(bucket, obj["Key"], local_file)
            count += 1

    print("S3_HELPER: Downloaded {} files from s3://{}/{} -> {}".format(
        count, bucket, prefix, local_dir), file=sys.stderr)


def s3_download(s3_uri, local_path):
    """Download from S3 — auto-detects file vs prefix."""
    import boto3
    bucket, key = parse_s3_uri(s3_uri)
    s3 = boto3.client("s3")

    # Try as a single file first
    try:
        s3.head_object(Bucket=bucket, Key=key)
        s3_download_file(s3_uri, local_path)
        return
    except Exception:
        pass

    # Fall back to prefix (directory) download
    s3_download_prefix(s3_uri, local_path)


def s3_upload_directory(local_dir, s3_uri):
    """Upload all files in a local directory to an S3 prefix."""
    import boto3
    bucket, key = parse_s3_uri(s3_uri)
    s3 = boto3.client("s3")

    # The S3 prefix is the parent directory of the output key
    s3_prefix = key.rstrip("/")
    if "/" in s3_prefix:
        s3_prefix = s3_prefix[:s3_prefix.rfind("/")]
    else:
        s3_prefix = ""

    count = 0
    for root, dirs, files in os.walk(local_dir):
        for f in files:
            local_file = os.path.join(root, f)
            rel_path = os.path.relpath(local_file, local_dir)
            if s3_prefix:
                s3_key = "{}/{}".format(s3_prefix, rel_path)
            else:
                s3_key = rel_path
            s3.upload_file(local_file, bucket, s3_key)
            print("S3_HELPER: Uploaded {} -> s3://{}/{}".format(
                local_file, bucket, s3_key), file=sys.stderr)
            count += 1

    print("S3_HELPER: Uploaded {} file(s) total".format(count), file=sys.stderr)


def prepare(input_path, output_path):
    """
    Resolve S3 paths to local paths.
    Downloads input from S3 if needed. Sets up local output directory.
    Prints shell-compatible variable assignments to stdout for eval.
    """
    local_input = input_path
    local_output = output_path

    # Handle S3 input: download to local staging (preserving key structure)
    if is_s3_path(input_path):
        bucket, key = parse_s3_uri(input_path)
        local_input = os.path.join(S3_INPUT_DIR, key)
        os.makedirs(os.path.dirname(local_input), exist_ok=True)
        s3_download(input_path, local_input)

    # Handle S3 output: map to local staging directory (preserving key structure)
    if is_s3_path(output_path):
        bucket, key = parse_s3_uri(output_path)
        local_output = os.path.join(S3_OUTPUT_DIR, key)
        os.makedirs(os.path.dirname(local_output), exist_ok=True)

    # Output shell variable assignments (consumed by eval in entry.sh)
    print('LOCAL_INPUT="{}"'.format(local_input))
    print('LOCAL_OUTPUT="{}"'.format(local_output))


def upload(local_output, original_output):
    """
    Upload output files to S3 if the original output path was an S3 URI.
    Uploads all files in the local output directory to the S3 prefix.
    """
    if not is_s3_path(original_output):
        print("S3_HELPER: Output is local, skipping upload", file=sys.stderr)
        return

    local_dir = os.path.dirname(local_output)
    if not os.path.isdir(local_dir):
        print("S3_HELPER: Warning — local output dir {} does not exist".format(local_dir),
              file=sys.stderr)
        return

    s3_upload_directory(local_dir, original_output)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: s3_helper.py <prepare|upload> [args...]", file=sys.stderr)
        sys.exit(1)

    command = sys.argv[1]

    if command == "prepare":
        if len(sys.argv) != 4:
            print("Usage: s3_helper.py prepare <input> <output>", file=sys.stderr)
            sys.exit(1)
        prepare(sys.argv[2], sys.argv[3])

    elif command == "upload":
        if len(sys.argv) != 4:
            print("Usage: s3_helper.py upload <local_output> <original_output>", file=sys.stderr)
            sys.exit(1)
        upload(sys.argv[2], sys.argv[3])

    else:
        print("Unknown command: {}".format(command), file=sys.stderr)
        sys.exit(1)
