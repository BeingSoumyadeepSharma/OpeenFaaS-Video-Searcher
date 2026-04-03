# VideoSearcher on OpenFaaS

This project deploys the **VideoSearcher** AI-SPRINT video processing pipeline as a set of serverless functions on **OpenFaaS**, running on both a **local Kubernetes cluster (Docker Desktop)** and a **cloud environment (AWS EKS)**. The key design goal was to **keep all original `main.py` files completely untouched** — no code changes to any component.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
  - [Pipeline Stages](#pipeline-stages)
  - [Execution Flow and Output Cardinality](#execution-flow-and-output-cardinality)
  - [Classic Watchdog Pattern](#classic-watchdog-pattern)
- [Design Decisions](#design-decisions)
  - [Why Classic Watchdog (Not of-watchdog)](#why-classic-watchdog-not-of-watchdog)
  - [Why aisprint-stub (No-Op Package)](#why-aisprint-stub-no-op-package)
  - [Why entry.sh Wrappers](#why-entrysh-wrappers)
- [S3 Integration](#s3-integration)
  - [S3 Helper Script](#s3-helper-script)
  - [Subfolder Path Convention](#subfolder-path-convention)
  - [Per-Invocation Staging (Race Condition Fix)](#per-invocation-staging-race-condition-fix)
- [Repository Structure](#repository-structure)
- [Files We Created (Original Code Left Untouched)](#files-we-created-original-code-left-untouched)
  - [aisprint-stub Package](#aisprint-stub-package)
  - [S3 Helper](#s3-helper)
  - [entry.sh Wrappers](#entrysh-wrappers)
  - [Dockerfiles](#dockerfiles)
  - [stack.yml](#stackyml)
  - [build.sh](#buildsh)
- [Prerequisites](#prerequisites)
- [Build & Deploy Instructions](#build--deploy-instructions)
  - [Step 1: Build Docker Images](#step-1-build-docker-images)
  - [Step 2: Tag and Push to Docker Hub](#step-2-tag-and-push-to-docker-hub)
  - [Step 3: Deploy to OpenFaaS](#step-3-deploy-to-openfaas)
  - [Step 4: Verify Deployment](#step-4-verify-deployment)
- [Testing](#testing)
  - [Basic Connectivity Test](#basic-connectivity-test)
  - [Testing Individual Functions](#testing-individual-functions)
  - [End-to-End Pipeline Test](#end-to-end-pipeline-test)
- [Issues Faced and How We Fixed Them](#issues-faced-and-how-we-fixed-them)
  - [1. Watchdog Image Not Found](#1-watchdog-image-not-found)
  - [2. OpenFaaS CE Public Image Restriction](#2-openfaas-ce-public-image-restriction)
  - [3. Docker Hub Push Failures / Layer Retries](#3-docker-hub-push-failures--layer-retries)
  - [4. object-detector Pod Stuck in Pending (Insufficient Memory)](#4-object-detector-pod-stuck-in-pending-insufficient-memory)
  - [5. DeepSpeech No ARM64 Wheel](#5-deepspeech-no-arm64-wheel)
  - [6. aisprint Import Errors](#6-aisprint-import-errors)
  - [7. JMeter Pipeline Stopping at ffmpeg-1](#7-jmeter-pipeline-stopping-at-ffmpeg-1)
  - [8. Concurrent Request Race Condition (/tmp/s3data)](#8-concurrent-request-race-condition-tmps3data)
  - [9. Queue Fan-Out S3 Path Mismatch (ffmpeg-1 -> ffmpeg-2)](#9-queue-fan-out-s3-path-mismatch-ffmpeg-1---ffmpeg-2)
- [Function Details](#function-details)
- [Configuration Reference](#configuration-reference)
- [Performance Testing (JMeter)](#performance-testing-jmeter)
  - [Test Plan Overview](#test-plan-overview)
  - [Load Configuration](#load-configuration)
  - [Installing JMeter](#installing-jmeter)
  - [Running the Tests](#running-the-tests)
  - [Analyzing Results](#analyzing-results)
  - [Test Files Reference](#test-files-reference)
- [OpenFaaS Queue Orchestration (SQS, No Lambda)](#openfaas-queue-orchestration-sqs-no-lambda)
  - [Quick Start (SQS Mode)](#quick-start-sqs-mode)
  - [How Queue Chaining Works](#how-queue-chaining-works)
  - [What We Changed to Make It Work](#what-we-changed-to-make-it-work)
  - [End-to-End Setup Steps (Exact Flow)](#end-to-end-setup-steps-exact-flow)
  - [Queue Message Contract](#queue-message-contract)
  - [Stage Mapping Reference](#stage-mapping-reference)
  - [Troubleshooting Notes from This Setup](#troubleshooting-notes-from-this-setup)
- [Cloud Deployment (AWS EKS)](#cloud-deployment-aws-eks)
  - [Why AWS EKS?](#why-aws-eks)
  - [Cloud Environment Comparison](#cloud-environment-comparison)
  - [AWS Prerequisites](#aws-prerequisites)
  - [Step 1: Create the EKS Cluster](#step-1-create-the-eks-cluster)
  - [Step 2: Install OpenFaaS on EKS](#step-2-install-openfaas-on-eks)
  - [Step 3: Rebuild Images for amd64](#step-3-rebuild-images-for-amd64)
  - [Step 4: Push Images and Deploy](#step-4-push-images-and-deploy)
  - [Step 5: Expose the Gateway Publicly](#step-5-expose-the-gateway-publicly)
  - [Cloud Deployment Verification](#cloud-deployment-verification)
  - [Issues Faced During Cloud Deployment](#issues-faced-during-cloud-deployment)
  - [Cost Estimate](#cost-estimate)
- [Future Improvements](#future-improvements)

---

## Project Overview

VideoSearcher is a multi-stage video processing pipeline originally built for the AI-SPRINT framework. It processes a video through 7 stages:

1. **Split** audio and video tracks
2. **Detect speech** segments using Librosa
3. **Cut** video into clips based on speech timestamps
4. **Downsample** audio and compress video
5. **Extract frames** from clips
6. **Transcribe speech** using DeepSpeech
7. **Detect objects** in frames using YOLOv4

Each stage is an independent Python script (`main.py`) that reads from an input path and writes to an output path, using the CLI pattern `python main.py -i <input> -o <output>`.

All original scripts use `from aisprint.annotations import annotation` as a decorator, and the object-detector additionally uses `from aisprint.onnx_inference import load_and_inference`. The `aisprint` package is not publicly available, so we needed a solution to satisfy these imports without modifying the source code.

---

## Architecture

### Pipeline Stages

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ ffmpeg-0 │───▶│ librosa  │───▶│ ffmpeg-1 │───▶│ ffmpeg-2 │───▶│ ffmpeg-3 │
│ split    │    │ speech   │    │ cut clips│    │ compress │    │ frames   │
│ audio/   │    │ detect   │    │ by time  │    │ audio/   │    │ extract  │
│ video    │    │ stamps   │    │ stamps   │    │ video    │    │ @12fps   │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └────┬─────┘
                                                                     │
                                                         ┌───────────┴───────────┐
                                                         ▼                       ▼
                                                  ┌──────────────┐     ┌────────────────┐
                                                  │ deepspeech   │     │ object-detector│
                                                  │ speech→text  │     │ YOLOv4 ONNX    │
                                                  └──────────────┘     └────────────────┘
```

### Execution Flow and Output Cardinality

The queue-driven execution flow is:

`ffmpeg-0` -> `librosa-fn` -> `ffmpeg-1` -> `ffmpeg-2` -> (`ffmpeg-3` and `deepspeech-fn` in parallel) -> `object-detector` (from `ffmpeg-3` frames)

| Stage | Output per invocation | Multiple outputs in one invocation? |
|------|------------------------|-------------------------------------|
| `ffmpeg-0` | `output.tar.gz` | No |
| `librosa-fn` | `output.tar.gz` | No |
| `ffmpeg-1` | `clip_0.mp4`, `clip_1.mp4`, ... | **Yes** |
| `ffmpeg-2` | `<clip>.tar.gz` | No |
| `ffmpeg-3` | `<base>-1.jpg`, `<base>-2.jpg`, ... | **Yes** |
| `deepspeech-fn` | `<base>.tar.gz` (clip + transcript bundle) | No |
| `object-detector` | `<frame>.jpg` (annotated image) | No |

Important:

- Functions that generate multiple outputs in a single invocation are **`ffmpeg-1`** and **`ffmpeg-3`**.
- `object-detector` produces one output per invocation, but can run many times because `ffmpeg-3` now fans out one queue message per frame.

### Classic Watchdog Pattern

Each function container runs the OpenFaaS **classic watchdog**, which:

1. Listens on port 8080 for HTTP requests
2. Pipes the HTTP request body (JSON) to the `fprocess` command via **stdin**
3. Returns the command's **stdout** as the HTTP response

```
HTTP Request Body (JSON)
        │
        ▼
┌─────────────────┐
│ fwatchdog        │  (Classic Watchdog — port 8080)
│  fprocess=       │
│  entry.sh        │
└────────┬────────┘
         │ stdin (JSON)
         ▼
┌─────────────────┐
│ entry.sh         │  (Wrapper script)
│  - reads JSON    │
│  - extracts args │
│  - calls main.py│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ python main.py   │  (Original, UNTOUCHED)
│  -i <input>      │
│  -o <output>     │
└─────────────────┘
```

---

## Design Decisions

### Why Classic Watchdog (Not of-watchdog)

The original `main.py` scripts are **CLI programs** that accept `-i`/`-o` arguments and exit after processing. They are not HTTP servers. The **classic watchdog** is designed exactly for this: it forks a process per request, pipes stdin, and captures stdout. This required **zero changes** to the original Python code.

### Why aisprint-stub (No-Op Package)

All 7 `main.py` files import from the `aisprint` package:

```python
from aisprint.annotations import annotation
```

And the object-detector also imports:

```python
from aisprint.onnx_inference import load_and_inference
```

The `aisprint` package is proprietary to the AI-SPRINT framework and not available on PyPI. We had two options:

1. **Create a no-op stub package** that satisfies the imports (chosen approach)
2. **Comment out the import lines** in each `main.py` (rejected — requires code changes)

We went with **Option 1** to honor the "no code changes" requirement. The stub:

- **`annotations.py`**: The `@annotation(config)` decorator simply returns the original function unchanged — a true no-op
- **`onnx_inference.py`**: A *functional* implementation that actually loads the ONNX model and runs inference using `onnxruntime`, since the object-detector's `main.py` calls `load_and_inference()` and uses its return values

### Why entry.sh Wrappers

The watchdog's `fprocess` needs to be a single command that reads from stdin. Our `main.py` files expect CLI arguments (`-i` and `-o`), not JSON on stdin. The `entry.sh` shell script bridges this gap:

1. Reads JSON from stdin
2. Uses `jq` to extract `input` and `output` fields
3. Resolves S3 paths to local staging via `s3_helper.py` (downloads input, maps output)
4. Calls `python main.py -i "$LOCAL_INPUT" -o "$LOCAL_OUTPUT"`
5. Uploads output back to S3 if the original path was an S3 URI
6. Cleans up the per-invocation staging directory

This way the original `main.py` receives local file paths exactly as it always expected, while the S3 transport layer is completely invisible to it.

---

## S3 Integration

To enable the pipeline to work end-to-end in a cloud deployment (where functions run on different pods and cannot share a local filesystem), we built a **transparent S3 integration layer**. This allows functions to read inputs from S3 and write outputs to S3 — all without changing any original `main.py` code.

### S3 Helper Script

The `s3-wrapper/s3_helper.py` script is copied into every function's Docker image. It provides two commands:

- **`prepare <input> <output>`**: If input is an S3 URI (`s3://bucket/key`), it downloads the file to a local staging directory. Maps the output to a local staging path. Prints shell variable assignments (`LOCAL_INPUT` and `LOCAL_OUTPUT`) consumed by `eval` in `entry.sh`.
- **`upload <local_output> <original_output>`**: If the original output was an S3 URI, walks the local output directory and uploads all files back to S3.

Local (non-S3) paths pass through unchanged, so the same functions work both locally and in the cloud.

### Subfolder Path Convention

Each pipeline run uses a unique S3 prefix to keep outputs organized:

```
s3://cloud-pipeline-loadtest-sharma/run_<UUID>/
  ├── ffmpeg0/output.tar.gz
  ├── librosa/output.tar.gz
  ├── ffmpeg1/clip_0.mp4, clip_1.mp4, ...
  ├── ffmpeg2/clip_0.tar.gz
  ├── ffmpeg3/frame-1.jpg, frame-2.jpg, ...
  ├── deepspeech/clip_0.tar.gz
  └── objdetect/frame-1.jpg
```

The `s3_helper.py` `prepare()` function preserves the full S3 key structure under the local staging directory (e.g., `s3://bucket/run_abc/ffmpeg0/output.tar.gz` → `/tmp/s3data_<PID>/input/run_abc/ffmpeg0/output.tar.gz`). This was a deliberate change from the original implementation which flattened all keys to just the basename, which would lose subfolder structure and cause collisions.

To support this subfolder convention, all 7 `main.py` files had `os.makedirs(output_dir, exist_ok=True)` added (the only modification to the function scripts — ensuring the output directory tree exists before writing).

### Per-Invocation Staging (Race Condition Fix)

The OpenFaaS **classic watchdog** forks a new process for every incoming HTTP request. When multiple requests hit the same pod concurrently, they all share the pod's filesystem. Originally, all invocations used a shared `/tmp/s3data` staging directory. This caused a **critical race condition**:

1. Request A starts processing, downloads input to `/tmp/s3data/input/...`
2. Request B starts processing on the same pod
3. Request A finishes and runs `rm -rf /tmp/s3data` — **wiping Request B's in-flight data**
4. Request B fails with missing files

**Fix**: Each invocation now uses a unique staging directory based on its process ID:

```bash
# In entry.sh
export S3_STAGING="/tmp/s3data_$$"  # $$ = shell PID, unique per fork
```

```python
# In s3_helper.py
S3_STAGING = os.environ.get("S3_STAGING", "/tmp/s3data")
S3_INPUT_DIR = os.path.join(S3_STAGING, "input")
S3_OUTPUT_DIR = os.path.join(S3_STAGING, "output")
```

Cleanup only removes that invocation's directory: `rm -rf "$S3_STAGING"`. Concurrent requests on the same pod are now fully isolated.

---

## Repository Structure

```
VideoSearcher-src/
├── README.md                    # This file
├── stack.yml                    # OpenFaaS deployment manifest
├── build.sh                     # Convenience script to build all images
│
├── aisprint-stub/               # NEW — No-op stub package
│   ├── setup.py
│   └── aisprint/
│       ├── __init__.py
│       ├── annotations.py       # No-op @annotation decorator
│       └── onnx_inference.py    # Functional ONNX inference stub
│
├── s3-wrapper/                  # NEW — Transparent S3 integration
│   └── s3_helper.py             # Download/upload S3 objects, per-invocation staging
│
├── videos.csv                   # Test video list (S3 URIs) for JMeter
│
├── ffmpeg-0/                    # Stage 0: Split audio + video
│   ├── main.py                  # ORIGINAL (untouched)
│   ├── requirements.txt         # ORIGINAL
│   ├── requirements.sys         # ORIGINAL
│   ├── Dockerfile               # NEW
│   └── entry.sh                 # NEW
│
├── ffmpeg-1/                    # Stage 1: Cut clips by timestamps
│   ├── main.py                  # ORIGINAL (untouched)
│   ├── Dockerfile               # NEW
│   └── entry.sh                 # NEW
│
├── ffmpeg-2/                    # Stage 2: Downsample + compress
│   ├── main.py                  # ORIGINAL (untouched)
│   ├── Dockerfile               # NEW
│   └── entry.sh                 # NEW
│
├── ffmpeg-3/                    # Stage 3: Extract frames
│   ├── main.py                  # ORIGINAL (untouched)
│   ├── Dockerfile               # NEW
│   └── entry.sh                 # NEW
│
├── librosa/                     # Speech detection
│   ├── main.py                  # ORIGINAL (untouched)
│   ├── requirements.txt         # ORIGINAL
│   ├── requirements.sys         # ORIGINAL
│   ├── Dockerfile               # NEW
│   └── entry.sh                 # NEW
│
├── deepspeech/                  # Speech-to-text
│   ├── main.py                  # ORIGINAL (untouched)
│   ├── deepspeech-0.9.3-models.pbmm   # ORIGINAL (model file ~188MB)
│   ├── deepspeech-0.9.3-models.scorer  # ORIGINAL (scorer file ~900MB)
│   ├── requirements.txt         # ORIGINAL
│   ├── requirements.sys         # ORIGINAL
│   ├── Dockerfile               # NEW
│   └── entry.sh                 # NEW
│
└── object-detector/             # YOLOv4 object detection
    ├── main.py                  # ORIGINAL (untouched)
    ├── postprocess.py           # ORIGINAL (untouched)
    ├── requirements.txt         # ORIGINAL
    ├── requirements.sys         # ORIGINAL
    ├── cfg/
    │   └── coco.names           # ORIGINAL
    ├── onnx/
    │   ├── coco.names           # ORIGINAL
    │   └── yolov4.onnx          # ORIGINAL (model file)
    ├── Dockerfile               # NEW
    └── entry.sh                 # NEW
```

---

## Files We Created (Original Code Left Untouched)

### aisprint-stub Package

**`aisprint-stub/setup.py`** — pip-installable package:

```python
from setuptools import setup, find_packages

setup(
    name="aisprint-stub",
    version="0.1.0",
    description="No-op stub for aisprint, used to run original code unchanged in OpenFaaS",
    packages=find_packages(),
    install_requires=[],
)
```

**`aisprint-stub/aisprint/annotations.py`** — No-op decorator:

```python
def annotation(config):
    """No-op decorator that passes through the original function."""
    def decorator(func):
        return func
    return decorator
```

**`aisprint-stub/aisprint/onnx_inference.py`** — Functional ONNX inference:

```python
import onnxruntime

def load_and_inference(onnx_model_path, input_dict):
    session = onnxruntime.InferenceSession(onnx_model_path)
    model_input_names = {inp.name for inp in session.get_inputs()}

    model_inputs = {}
    return_dict = {}

    for key, value in input_dict.items():
        if key in model_input_names:
            model_inputs[key] = value
        elif key != "keep":
            return_dict[key] = value

    outputs = session.run(None, model_inputs)
    return return_dict, outputs
```

### S3 Helper

**`s3-wrapper/s3_helper.py`** — Transparent S3 download/upload, installed in every function image:

- **`prepare(input, output)`**: Downloads S3 input to local staging, maps S3 output to local path
- **`upload(local_output, original_output)`**: Uploads local output files back to S3
- Uses `S3_STAGING` environment variable for per-invocation isolation
- Preserves full S3 key structure to support subfolder conventions
- Installed via `COPY s3-wrapper/s3_helper.py .` in every Dockerfile

### entry.sh Wrappers

Each function has an `entry.sh` that parses JSON from stdin, handles S3 transfers, and invokes the original `main.py`:

**Standard entry.sh** (used by ffmpeg-0/1/2/3, librosa, deepspeech):

```bash
#!/bin/sh
JSON=$(cat)
INPUT=$(echo "$JSON" | jq -r '.input')
OUTPUT=$(echo "$JSON" | jq -r '.output')
cd /home/app/function

# Use a unique staging dir per invocation to avoid race conditions
export S3_STAGING="/tmp/s3data_$$"

# Resolve S3 paths to local paths (downloads input from S3 if needed)
eval $(python s3_helper.py prepare "$INPUT" "$OUTPUT")

python main.py -i "$LOCAL_INPUT" -o "$LOCAL_OUTPUT"
EXIT_CODE=$?

# Upload output to S3 if the original output was an S3 path
if [ $EXIT_CODE -eq 0 ]; then
    python s3_helper.py upload "$LOCAL_OUTPUT" "$OUTPUT"
fi

# Clean up this invocation's staging area
rm -rf "$S3_STAGING"
exit $EXIT_CODE
```

**Object-detector entry.sh** (adds ONNX model path argument):

```bash
#!/bin/sh
JSON=$(cat)
INPUT=$(echo "$JSON" | jq -r '.input')
OUTPUT=$(echo "$JSON" | jq -r '.output')
ONNX_FILE=$(echo "$JSON" | jq -r '.onnx_file // "onnx/yolov4.onnx"')
cd /home/app/function

export S3_STAGING="/tmp/s3data_$$"
eval $(python s3_helper.py prepare "$INPUT" "$OUTPUT")

python main.py -i "$LOCAL_INPUT" -o "$LOCAL_OUTPUT" -y "$ONNX_FILE"
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    python s3_helper.py upload "$LOCAL_OUTPUT" "$OUTPUT"
fi

rm -rf "$S3_STAGING"
exit $EXIT_CODE
```

### Dockerfiles

Each function has its own Dockerfile following the same pattern:

1. **Stage 1**: Copy the classic watchdog binary from `ghcr.io/openfaas/classic-watchdog:0.2.3`
2. **Stage 2**: Build on `python:3.9-slim`
   - Install system deps (`ffmpeg`, `jq`, `libsndfile1`, `libgl1`, etc.)
   - Install the `aisprint-stub` package via pip
   - Install Python dependencies from `requirements.txt`
   - Copy the original `main.py` and `entry.sh`
   - Set `fprocess` env var to `/home/app/function/entry.sh`

Notable differences per function:
- **deepspeech**: Copies large model files (`.pbmm` and `.scorer`) into the image
- **object-detector**: Copies `onnx/` and `cfg/` directories, installs OpenCV dependencies
- **librosa**: Installs `libsndfile1` and `libsndfile1-dev`

### stack.yml

The OpenFaaS deployment manifest defines all 7 functions with:
- `skip_build: true` (we build images manually)
- Images pointing to Docker Hub: `soumyadeeps/<function-name>:latest`
- 600s timeouts (video processing can be slow)
- Memory limits tuned to fit in a single-node Docker Desktop cluster

### build.sh

Convenience script that builds all 7 Docker images locally:

```bash
./build.sh
```

Note: DeepSpeech is built with `--platform linux/amd64` because there is no ARM64 wheel for `deepspeech==0.9.3`.

---

## Prerequisites

| Tool | Version Used | Purpose |
|------|-------------|---------|
| Docker | 29.1.3 | Build and run containers |
| faas-cli | 0.18.0 | Deploy to OpenFaaS |
| kubectl | v1.34.1 | Manage Kubernetes cluster |
| Kubernetes | Docker Desktop | Cluster runtime |
| OpenFaaS | CE (Community) | Serverless framework |

### Install OpenFaaS on Kubernetes

```bash
# Add OpenFaaS Helm repo
helm repo add openfaas https://openfaas.github.io/faas-netes/
helm repo update

# Create namespaces
kubectl apply -f https://raw.githubusercontent.com/openfaas/faas-netes/master/namespaces.yml

# Install OpenFaaS
helm upgrade openfaas --install openfaas/openfaas \
    --namespace openfaas \
    --set functionNamespace=openfaas-fn \
    --set generateBasicAuth=true

# Get the admin password
PASSWORD=$(kubectl get secret -n openfaas basic-auth -o jsonpath="{.data.basic-auth-password}" | base64 --decode)
echo $PASSWORD

# Login with faas-cli
echo -n $PASSWORD | faas-cli login --username admin --password-stdin
```

---

## Build & Deploy Instructions

### Step 1: Build Docker Images

From the repository root:

```bash
# Build all images at once
chmod +x build.sh
./build.sh

# Or build individually
docker build -f ffmpeg-0/Dockerfile -t videosearcher/ffmpeg-0:latest .
docker build -f ffmpeg-1/Dockerfile -t videosearcher/ffmpeg-1:latest .
docker build -f ffmpeg-2/Dockerfile -t videosearcher/ffmpeg-2:latest .
docker build -f ffmpeg-3/Dockerfile -t videosearcher/ffmpeg-3:latest .
docker build -f librosa/Dockerfile  -t videosearcher/librosa-fn:latest .
docker build -f object-detector/Dockerfile -t videosearcher/object-detector:latest .

# DeepSpeech MUST be built for amd64 (no ARM64 wheel exists)
docker build --platform linux/amd64 -f deepspeech/Dockerfile -t videosearcher/deepspeech-fn:latest .
```

### Step 2: Tag and Push to Docker Hub

OpenFaaS Community Edition requires **public images**. Push to your Docker Hub account:

```bash
# Login to Docker Hub
docker login

# Tag and push all images
for fn in ffmpeg-0 ffmpeg-1 ffmpeg-2 ffmpeg-3; do
  docker tag videosearcher/${fn}:latest <your-dockerhub-user>/${fn}:latest
  docker push <your-dockerhub-user>/${fn}:latest
done

docker tag videosearcher/librosa-fn:latest <your-dockerhub-user>/librosa-fn:latest
docker push <your-dockerhub-user>/librosa-fn:latest

docker tag videosearcher/deepspeech-fn:latest <your-dockerhub-user>/deepspeech-fn:latest
docker push <your-dockerhub-user>/deepspeech-fn:latest

docker tag videosearcher/object-detector:latest <your-dockerhub-user>/object-detector:latest
docker push <your-dockerhub-user>/object-detector:latest
```

> **Important**: Update `stack.yml` to replace `soumyadeeps/` with your own Docker Hub username.

### Step 3: Deploy to OpenFaaS

```bash
# Login to OpenFaaS (if not already)
echo -n <password> | faas-cli login --username admin --password-stdin

# Deploy all functions
faas-cli deploy -f stack.yml
```

### Step 4: Verify Deployment

```bash
# Check all function pods are running
kubectl get pods -n openfaas-fn

# Expected output (all should be Running 1/1):
# NAME                               READY   STATUS    RESTARTS   AGE
# ffmpeg-0-<hash>                    1/1     Running   0          1m
# ffmpeg-1-<hash>                    1/1     Running   0          1m
# ffmpeg-2-<hash>                    1/1     Running   0          1m
# ffmpeg-3-<hash>                    1/1     Running   0          1m
# librosa-fn-<hash>                  1/1     Running   0          1m
# deepspeech-fn-<hash>               1/1     Running   0          1m
# object-detector-<hash>             1/1     Running   0          1m

# List functions via faas-cli
faas-cli list
```

---

## Testing

### Basic Connectivity Test

Verify each function endpoint responds:

```bash
GATEWAY="http://a86db78a1498941edbb5952f01041129-854708034.us-east-1.elb.amazonaws.com:8080"

# Test ffmpeg-0 with an S3 input
curl -s -o /dev/null -w "HTTP: %{http_code}, Time: %{time_total}s\n" \
  -X POST "$GATEWAY/function/ffmpeg-0" \
  -H 'Content-Type: application/json' \
  -d '{"input":"s3://cloud-pipeline-loadtest-sharma/vid1.mp4","output":"s3://cloud-pipeline-loadtest-sharma/run_test/ffmpeg0/output"}'

# Test librosa
curl -s -o /dev/null -w "HTTP: %{http_code}, Time: %{time_total}s\n" \
  -X POST "$GATEWAY/function/librosa-fn" \
  -H 'Content-Type: application/json' \
  -d '{"input":"s3://cloud-pipeline-loadtest-sharma/run_test/ffmpeg0/output.tar.gz","output":"s3://cloud-pipeline-loadtest-sharma/run_test/librosa/output"}'
```

You should get `HTTP: 200` for each function. The S3 helper transparently downloads the input, runs the function, and uploads the output.

### Testing Individual Functions

Each function accepts a JSON body with `input` and `output` fields. Both can be local paths or S3 URIs:

```bash
# S3-to-S3 (cloud deployment)
curl -X POST "$GATEWAY/function/ffmpeg-1" \
  -d '{"input":"s3://bucket/run_abc/librosa/output.tar.gz","output":"s3://bucket/run_abc/ffmpeg1/clip"}'

# Local paths (for testing inside the container)
curl -X POST "http://127.0.0.1:8080/function/ffmpeg-0" \
  -d '{"input":"/tmp/test.mp4","output":"/tmp/out"}'
```

### End-to-End Pipeline Test

The recommended end-to-end execution path is now **OpenFaaS queue orchestration** (see [OpenFaaS Queue Orchestration (SQS, No Lambda)](#openfaas-queue-orchestration-sqs-no-lambda) below). JMeter remains useful for performance/load testing.

---

## Issues Faced and How We Fixed Them

### 1. Watchdog Image Not Found

**Problem**: The initial Dockerfiles referenced `openfaas/classic-watchdog:0.2.3` from Docker Hub, but the image has been moved to GitHub Container Registry.

**Error**: Docker build failed with image pull error.

**Fix**: Changed the watchdog image reference in all 7 Dockerfiles from:
```dockerfile
FROM openfaas/classic-watchdog:0.2.3 AS watchdog
```
to:
```dockerfile
FROM ghcr.io/openfaas/classic-watchdog:0.2.3 AS watchdog
```

### 2. OpenFaaS CE Public Image Restriction

**Problem**: After building images locally with `videosearcher/` prefix, deploying to OpenFaaS CE returned an error:

> *"the Community Edition license agreement only allows public images to be used"*

OpenFaaS CE cannot pull from local-only Docker images — it requires images to be available from a public registry.

**Fix**: 
1. Logged into Docker Hub (`docker login` as `soumyadeeps`)
2. Re-tagged all 7 images: `docker tag videosearcher/ffmpeg-0:latest soumyadeeps/ffmpeg-0:latest`
3. Pushed all images to Docker Hub: `docker push soumyadeeps/ffmpeg-0:latest`
4. Updated `stack.yml` to reference `soumyadeeps/<name>:latest`

### 3. Docker Hub Push Failures / Layer Retries

**Problem**: Some images (particularly `librosa-fn` and `deepspeech-fn`) experienced intermittent layer push failures during upload to Docker Hub, requiring retries.

**Fix**: Re-ran the `docker push` commands. Docker's layer-based upload mechanism handles retries automatically — only failed layers need to be re-uploaded, not the entire image. All images eventually pushed successfully.

### 4. object-detector Pod Stuck in Pending (Insufficient Memory)

**Problem**: After deploying all 7 functions, the `object-detector` pod was stuck in `Pending` state. Describing the pod revealed:

> *"0/1 nodes are available: 1 Insufficient memory"*

The Docker Desktop Kubernetes single-node cluster had limited memory, and having multiple pods with high memory requests exceeded the available resources.

**Original memory config**:
- ffmpeg functions: 256Mi request
- deepspeech-fn: 1Gi request  
- object-detector: 1Gi request

**Fix**: Reduced memory **requests** (not limits) across all functions:
- ffmpeg functions: 256Mi → **128Mi** request
- librosa/deepspeech/object-detector: 1Gi → **128Mi** request
- Memory **limits** kept higher (512Mi–1Gi) so functions can burst when processing

Then deleted old pods to free memory for the redeployed pods:
```bash
kubectl delete pods -n openfaas-fn -l faas_function=ffmpeg-0
# (repeated for each function)
```

After redeployment, all 7 pods were Running 1/1.

### 5. DeepSpeech No ARM64 Wheel

**Problem**: The machine is Apple Silicon (arm64), but the `deepspeech==0.9.3` Python package only provides x86_64 (amd64) wheels. Installing it on an ARM64 image fails.

**Fix**: Built the deepspeech image with platform emulation:
```bash
docker build --platform linux/amd64 -f deepspeech/Dockerfile -t videosearcher/deepspeech-fn:latest .
```

This builds an amd64 image that runs under Rosetta/QEMU emulation on Apple Silicon. It works but will be **slower than native ARM64 execution**. For production, consider running DeepSpeech on an x86_64 node.

### 6. aisprint Import Errors

**Problem**: All original `main.py` files contain:
```python
from aisprint.annotations import annotation
```
The `aisprint` package is proprietary and not available on PyPI. Without it, every function would crash on import.

**Fix**: Created the `aisprint-stub` package (see [aisprint-stub Package](#aisprint-stub-package) above). This pip-installable stub provides:
- `aisprint.annotations.annotation` — a no-op decorator that returns the function unchanged
- `aisprint.onnx_inference.load_and_inference` — a functional ONNX inference wrapper (needed by object-detector)

Installed in every Dockerfile:
```dockerfile
COPY aisprint-stub /tmp/aisprint-stub
RUN pip install --no-cache-dir /tmp/aisprint-stub && rm -rf /tmp/aisprint-stub
```

### 7. JMeter Pipeline Stopping at ffmpeg-1

**Problem**: When running the JMeter load test, the pipeline consistently stopped at the ffmpeg-1 step. ffmpeg-0 succeeded, librosa sometimes worked, but ffmpeg-1 always showed 100% error rate. Manually calling ffmpeg-1 via `curl` returned HTTP 200 — proving the function worked fine in isolation.

**Root Cause**: Four separate bugs in the JMeter test plan compounded to cause this failure:

**Bug 1 — JSR223PreProcessor generating a new UUID per sampler (not per iteration)**

The `Generate Run ID` PreProcessor was placed at the ThreadGroup level, causing it to execute before *every* sampler in the loop. This meant each pipeline step (ffmpeg-0, librosa, ffmpeg-1, ...) got a different `runId` and `baseOutput`, so ffmpeg-1 looked for librosa's output under the wrong S3 prefix.

*Fix*: Moved the PreProcessor into ffmpeg-0's hashTree so it only runs once at the start of each pipeline iteration.

**Bug 2 — ffmpeg-1 output naming mismatch (`clip_0` vs `clip`)**

The JMX sent output `${baseOutput}ffmpeg1/clip_0` to ffmpeg-1. But ffmpeg-1's code appends `_<index>` to the output base name, producing files like `clip_0_0.mp4` instead of the expected `clip_0.mp4`. The downstream ffmpeg-2 step expected `clip_0.mp4` and couldn't find it.

*Fix*: Changed the JMX ffmpeg-1 output from `clip_0` to `clip`, so clips are named `clip_0.mp4`, `clip_1.mp4`, etc.

**Bug 3 — CSV header row treated as data**

The CSV Data Set had `ignoreFirstLine=false` with `variableNames=input_video`. Since `videos.csv` has a header row (`input_video`), the first thread received the literal string `input_video` as the S3 path instead of an actual video URI.

*Fix*: Set `ignoreFirstLine=true`.

**Bug 4 — Pipeline continuing after failures**

The ThreadGroup had `on_sample_error=continue`, so when one step failed, subsequent steps still executed with invalid/missing input, generating cascading errors that obscured the root cause.

*Fix*: Changed to `on_sample_error=startnextloop` — if any step fails, the thread skips the rest of that iteration and starts fresh.

### 8. Concurrent Request Race Condition (/tmp/s3data)

**Problem**: Even after fixing the JMeter bugs, the pipeline still failed intermittently under concurrent load. librosa showed ~50% error rate, and ffmpeg-1 showed 100% errors in JMeter — yet both worked perfectly when tested individually via `curl`.

**Root Cause**: The OpenFaaS classic watchdog forks a **new process per request**. When multiple concurrent requests land on the same pod, they all shared a single `/tmp/s3data` staging directory. When Request A finished and ran `rm -rf /tmp/s3data`, it **destroyed Request B's in-flight downloaded data**, causing Request B to fail with missing files.

This explained the pattern:
- ffmpeg-0: 0% errors (requests separated by ramp-up time, short processing)
- librosa: ~50% errors (longer processing = higher overlap probability)
- ffmpeg-1: 100% errors (always overlapped with concurrent requests)

**Fix**: Modified `entry.sh` (all 7 functions) and `s3_helper.py` to use **per-invocation staging directories** based on the shell PID:

```bash
# entry.sh — each fork gets a unique PID
export S3_STAGING="/tmp/s3data_$$"
```

```python
# s3_helper.py — reads the per-invocation path
S3_STAGING = os.environ.get("S3_STAGING", "/tmp/s3data")
```

Cleanup only removes that invocation's directory (`rm -rf "$S3_STAGING"`), so concurrent requests on the same pod are fully isolated.

This required rebuilding and redeploying all 7 Docker images.

### 9. Queue Fan-Out S3 Path Mismatch (ffmpeg-1 -> ffmpeg-2)

**Problem**: After enabling multi-clip fan-out, only part of the downstream pipeline behaved correctly. `ffmpeg-2`, `ffmpeg-3`, and `deepspeech` were inconsistent and object detection could stall with no new outputs.

**Symptoms observed**:

- `ffmpeg-1` produced multiple clips successfully
- many downstream invocations returned HTTP 200 but produced empty or invalid artifacts
- extracted `ffmpeg2/*.tar.gz` files were tiny/empty in some runs
- counters on downstream stages did not match expected artifact growth

**Root Cause**: In the fan-out message built by `ffmpeg-1/entry.sh`, clip inputs were queued as:

```text
s3://<bucket>/<run_id>/ffmpeg1/<clip_name>.mp4
```

But because of the current `s3_helper.py upload` behavior, ffmpeg-1 clip files are uploaded at run-root level:

```text
s3://<bucket>/<run_id>/<clip_name>.mp4
```

So `ffmpeg-2` received non-existent input keys, leading to bad downstream artifacts.

**Fix**:

1. Updated `ffmpeg-1/entry.sh` fan-out mapping to publish clip input URIs from run root.
2. Rebuilt and pushed `soumyadeeps/ffmpeg-1:latest`.
3. Redeployed with `faas-cli deploy -f stack.yml`.
4. Revalidated using an isolated `run_id` and compared function invocation deltas.

**Validation result**:

- `ffmpeg-2`, `ffmpeg-3`, and `deepspeech-fn` increased in parallel after a single seeded run
- `object-detector` resumed increasing as frame fan-out drained correctly

This fix restores correct multi-clip propagation from ffmpeg-1 into the rest of the queue-driven pipeline.

### 10. Pipeline Output Overwrites (Data Loss via S3 Race)

**Problem**: Under concurrent processing loads with multiple fan-out chunks, we noticed severe data loss when verifying end-to-end artifact outputs on S3. When viewing AWS S3, pipeline stages like `deepspeech` and `object-detector` only had ONE resulting file per run instead of $N$ (equal to the number of valid clips extracted).

**Root Cause**: The staging queue mechanism driven by `queue_helper.py` lacked context on the unique clip identifier being passed into it. When determining the S3 path for `$OUTPUT` of any target queue, it blindly dumped results using static stage names (e.g., `s3://bucket/run_id/deepspeech/`). This forced concurrent workers from a fan-out stage to overwrite each other’s uploads.

**Fix**: Updated `_stage_output_uri` and `enqueue_next` in `queue_helper.py` to dynamically parse the unique input base block (e.g., `clip_0`) and propagate it explicitly to the S3 output URI map. Now, every concurrent fan-out correctly writes to a fully unique S3 key path.

### 11. Cascading Bug: Fan-Out Path Mismatch Starvation

**Problem**: After applying the data loss fix from issue 10 above, developers noticed that the `object-detector` stage inexplicably froze, receiving 0 messages from the event queue despite `ffmpeg-3` reporting HTTP 200 Successes under `sqs-bridge` monitoring. 

**Root Cause**: Because `queue_helper.py` now routed artifacts into dedicated subfolders (`s3://bucket/run_id/ffmpeg1/clip_0.mp4` instead of `s3://bucket/run_id/clip_0.mp4`), embedded Python SQS publishing loops residing directly inside `ffmpeg-1/entry.sh` and `ffmpeg-3/entry.sh` were feeding incorrect absolute `s3://` URIs pointing to the root structure to downstream components. 
- `ffmpeg-2` received instructions to evaluate a non-existent file in the root context, leading it to silently execute `tar` on a non-existent source. This synthesized into an empty 45-byte `.tar.gz` archive. 
- `ffmpeg-3` unpacked the resulting empty artifact, outputting zero valid extracted JPG frames. Since the `frame_files` glob was empty, the queue helper gracefully executed `sys.exit(0)` completely bypassing the SQS publish event towards `object-detector` queue routes, starving it!

**Fix**:
1. Updated the embedded `entry.sh` script for `ffmpeg-3` to prefix its generated queue metadata to downstream targets with `f"ffmpeg3/{frame_name}"`.
2. Updated the embedded `entry.sh` script for `ffmpeg-1` identically, prefixing explicit `ffmpeg1/` keys so `ffmpeg-2` accurately downloads the source chunk.
3. Rebuilt & redeployed `soumyadeeps/ffmpeg-1` and `soumyadeeps/ffmpeg-3`. Both data isolation and scaling behavior act healthily now.

---

## Function Details

| Function | Docker Hub Image | System Deps | Python Deps | Special Notes |
|----------|-----------------|-------------|-------------|---------------|
| ffmpeg-0 | `soumyadeeps/ffmpeg-0:latest` | ffmpeg, jq | — | Splits audio track from video |
| ffmpeg-1 | `soumyadeeps/ffmpeg-1:latest` | ffmpeg, jq | — | Cuts clips by timestamps |
| ffmpeg-2 | `soumyadeeps/ffmpeg-2:latest` | ffmpeg, jq | — | Downsamples audio to 16kHz mono |
| ffmpeg-3 | `soumyadeeps/ffmpeg-3:latest` | ffmpeg, jq | — | Extracts frames at 12fps |
| librosa-fn | `soumyadeeps/librosa-fn:latest` | libsndfile1, jq | SoundFile, librosa | Speech segment detection |
| deepspeech-fn | `soumyadeeps/deepspeech-fn:latest` | jq | deepspeech | Built for amd64; bundles ~1.1GB of model files |
| object-detector | `soumyadeeps/object-detector:latest` | libgl1, libglib2.0-0, jq | onnxruntime, opencv, numpy, scipy, etc. | Bundles YOLOv4 ONNX model |

---

## Configuration Reference

### stack.yml Environment Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| `write_timeout` | 600s | Max time to write the HTTP response |
| `read_timeout` | 600s | Max time to read the HTTP request |
| `exec_timeout` | 600s | Max time for function execution |

### stack.yml Labels

| Label | Purpose |
|-------|---------|
| `com.openfaas.scale.min` | Minimum number of replicas (1) |
| `com.openfaas.scale.max` | Maximum replicas for autoscaling (3–5) |

### Resource Limits (Current)

| Function | Memory Request | Memory Limit |
|----------|---------------|--------------|
| ffmpeg-0/1/2/3 | 128Mi | 512Mi |
| librosa-fn | 128Mi | 1Gi |
| deepspeech-fn | 128Mi | 1Gi |
| object-detector | 128Mi | 1Gi |

---

## Performance Testing (JMeter)

Performance tests are executed using **Apache JMeter** to measure response times, throughput, and error rates of the deployed OpenFaaS functions under different load levels.

### Test Plan Overview

The test plan (`jmeter-tests/videosearcher-load-test.jmx`) simulates realistic user behavior with **S3-backed data flow** between pipeline stages:

1. A Groovy PreProcessor generates a unique `runId` (UUID) and `baseOutput` S3 prefix at the start of each iteration
2. Each virtual user sends a POST request with S3 input/output paths to the function endpoint
3. The function downloads input from S3, processes it, uploads output to S3
4. **Waits ~20 seconds** (exponential think time) — simulating a real user
5. The next function in the pipeline reads the previous function's S3 output as its input
6. Repeats for the configured test duration

The test uses a CSV data source (`videos.csv`) containing S3 URIs for input videos:
```
input_video
s3://cloud-pipeline-loadtest-sharma/vid1.mp4
s3://cloud-pipeline-loadtest-sharma/vid2.mp4
```

Each virtual user calls all **7 functions in pipeline order**, with S3 paths following the subfolder convention:

```
ffmpeg-0 → librosa-fn → ffmpeg-1 → ffmpeg-2 → ffmpeg-3 → deepspeech-fn → object-detector

S3 paths per iteration:
  Input:  s3://bucket/vid1.mp4
  ffmpeg-0 output: s3://bucket/run_<UUID>/ffmpeg0/output
  librosa  input:  s3://bucket/run_<UUID>/ffmpeg0/output.tar.gz
  librosa  output: s3://bucket/run_<UUID>/librosa/output
  ffmpeg-1 input:  s3://bucket/run_<UUID>/librosa/output.tar.gz
  ffmpeg-1 output: s3://bucket/run_<UUID>/ffmpeg1/clip
  ffmpeg-2 input:  s3://bucket/run_<UUID>/ffmpeg1/clip_0.mp4
  ffmpeg-2 output: s3://bucket/run_<UUID>/ffmpeg2/clip_0
  ffmpeg-3 input:  s3://bucket/run_<UUID>/ffmpeg2/clip_0.tar.gz
  ffmpeg-3 output: s3://bucket/run_<UUID>/ffmpeg3/frame
  deepspeech input:  s3://bucket/run_<UUID>/ffmpeg2/clip_0.tar.gz
  deepspeech output: s3://bucket/run_<UUID>/deepspeech/clip_0
  object-detector input:  s3://bucket/run_<UUID>/ffmpeg3/frame-1.jpg
  object-detector output: s3://bucket/run_<UUID>/objdetect/frame-1
```

Note: The test processes only the first clip (`clip_0`) through the later stages. Deepspeech and ffmpeg-3 both read from ffmpeg-2's output (parallel branches). If any step fails, `startnextloop` skips the rest of that iteration.

### Load Configuration

| Parameter | Value | Description |
|-----------|-------|-------------|
| **Concurrent Users** | 5, 10, 15 | Three progressive load levels |
| **Think Time** | 20 seconds | Pause between each request (simulates user reading response) |
| **Ramp-up Period** | 10 seconds | Time to start all threads |
| **Test Duration** | 300 seconds (5 min) | Per load level |
| **Protocol** | HTTP POST | JSON body with input/output paths |

The testing strategy follows the principle of **starting with a low number of users** (5) and progressively increasing (10, then 15) to observe how the system behaves under increasing load.

### Installing JMeter

```bash
# macOS
brew install jmeter

# Verify installation
jmeter --version
```

### Running the Tests

**Option 1: Use the automated runner script** (recommended)

```bash
cd jmeter-tests

# Run all 3 load levels (5 → 10 → 15 users)
./run-tests.sh

# Run a specific load level only
./run-tests.sh 5          # 5 users only
./run-tests.sh 5 10       # 5 and 10 users
```

The script will:
- Check prerequisites (JMeter installed, gateway reachable)
- Run each load level for 5 minutes
- Wait 30 seconds between levels for system stabilization
- Generate HTML reports and print a quick summary

**Option 2: Run JMeter directly**

```bash
# CLI mode (non-GUI) — 5 users, 20s think time, 5 min duration
jmeter -n \
    -t jmeter-tests/videosearcher-load-test.jmx \
    -l jmeter-tests/results/5-users/results.jtl \
    -Jusers=5 \
    -Jthinktime=20000 \
    -Jduration=300 \
    -e -o jmeter-tests/results/5-users/report

# 10 users
jmeter -n \
    -t jmeter-tests/videosearcher-load-test.jmx \
    -l jmeter-tests/results/10-users/results.jtl \
    -Jusers=10 \
    -Jthinktime=20000 \
    -Jduration=300 \
    -e -o jmeter-tests/results/10-users/report

# 15 users
jmeter -n \
    -t jmeter-tests/videosearcher-load-test.jmx \
    -l jmeter-tests/results/15-users/results.jtl \
    -Jusers=15 \
    -Jthinktime=20000 \
    -Jduration=300 \
    -e -o jmeter-tests/results/15-users/report
```

**Option 3: Open in JMeter GUI** (for debugging/visualization)

```bash
jmeter -t jmeter-tests/videosearcher-load-test.jmx
```

In the GUI you can:
- View and modify the test plan
- Enable "View Results Tree" listener for debugging
- Run tests and see real-time graphs

### Analyzing Results

**HTML Reports**: JMeter auto-generates comprehensive HTML reports in each results directory:

```bash
# Open the HTML report in your browser
open jmeter-tests/results/5-users/report/index.html
open jmeter-tests/results/10-users/report/index.html
open jmeter-tests/results/15-users/report/index.html
```

The HTML report includes:
- **Dashboard**: Overall statistics, APDEX score, request summary
- **Response Times Over Time**: Graph showing response time trends
- **Throughput**: Requests per second over time
- **Response Time Percentiles**: P50, P90, P95, P99
- **Error %**: Failure rate per endpoint

**Compare across load levels**: Use the comparison script to see all levels side-by-side:

```bash
cd jmeter-tests
./compare-results.sh
```

This prints a table like:

```
│ Test Level   │ Total  │  Pass  │  Fail  │   Avg   │   Min   │   Max   │   P50   │   P90   │   P95    │ Err %  │ Throughput │
├──────────────┼────────┼────────┼────────┼─────────┼─────────┼─────────┼─────────┼─────────┼──────────┼────────┼────────────┤
│ 5-users      │    105 │    105 │      0 │  1234ms │   45ms  │  5678ms │  890ms  │ 3456ms  │  4567ms  │   0.0% │    0.35/s  │
│ 10-users     │    210 │    208 │      2 │  2345ms │   56ms  │  8901ms │ 1234ms  │ 5678ms  │  7890ms  │   0.9% │    0.70/s  │
│ 15-users     │    315 │    310 │      5 │  3456ms │   67ms  │ 12345ms │ 2345ms  │ 8901ms  │ 10234ms  │   1.6% │    1.05/s  │
```

Plus a per-function breakdown showing which endpoints are slowest.

### Test Files Reference

```
jmeter-tests/
├── videosearcher-load-test.jmx   # JMeter test plan (open in JMeter GUI or run via CLI)
├── run-tests.sh                  # Automated runner: runs tests at 5, 10, 15 users
├── compare-results.sh            # Compares results across load levels
└── results/                      # Test output (generated, gitignored)
    ├── 5-users/
    │   ├── results_<timestamp>.jtl    # Raw results (CSV)
    │   ├── jmeter_<timestamp>.log     # JMeter log
    │   └── report_<timestamp>/        # HTML report
    │       └── index.html
    ├── 10-users/
    │   └── ...
    └── 15-users/
        └── ...
```

### Configurable Parameters

All parameters can be overridden via JMeter properties (`-J` flags):

| Property | Default | Description |
|----------|---------|-------------|
| `users` | 5 | Number of concurrent virtual users |
| `thinktime` | 20000 | Think time in milliseconds |
| `rampup` | 10 | Ramp-up period in seconds |
| `duration` | 300 | Test duration in seconds |
| `host` | ELB hostname | OpenFaaS gateway host |
| `port` | 8080 | OpenFaaS gateway port |
| `loops` | -1 | Loop count (-1 = infinite, controlled by duration) |

---

## OpenFaaS Queue Orchestration (SQS, No Lambda)

This project now supports queue chaining **without AWS Lambda**.

- JMeter calls only the first function (`ffmpeg-0`)
- Each OpenFaaS function publishes the next-stage SQS message itself
- SQS bridge consumers drain each queue and invoke the next OpenFaaS endpoint

Important: queue messages should carry **S3 URI pointers and metadata**, not binary artifacts. Intermediate outputs are written to S3 and passed between stages by URI.

### Quick Start (SQS Mode)

If you only want the shortest path to a working SQS-based run, follow these steps.

1. Build and deploy functions:

```bash
./build.sh
faas-cli deploy -f stack.yml
```

2. Create the six queues in `us-east-1`:

```bash
aws sqs create-queue --queue-name videosearcher-ffmpeg0-to-librosa --region us-east-1
aws sqs create-queue --queue-name videosearcher-librosa-to-ffmpeg1 --region us-east-1
aws sqs create-queue --queue-name videosearcher-ffmpeg1-to-ffmpeg2 --region us-east-1
aws sqs create-queue --queue-name videosearcher-ffmpeg2-to-ffmpeg3 --region us-east-1
aws sqs create-queue --queue-name videosearcher-ffmpeg2-to-deepspeech --region us-east-1
aws sqs create-queue --queue-name videosearcher-ffmpeg3-to-object --region us-east-1
```

3. Resolve queue URLs and put them into `stack.yml` under `NEXT_QUEUES_JSON`, then redeploy:

```bash
AWS_PAGER="" aws sqs get-queue-url --queue-name videosearcher-ffmpeg0-to-librosa --region us-east-1 --query QueueUrl --output text
AWS_PAGER="" aws sqs get-queue-url --queue-name videosearcher-librosa-to-ffmpeg1 --region us-east-1 --query QueueUrl --output text
AWS_PAGER="" aws sqs get-queue-url --queue-name videosearcher-ffmpeg1-to-ffmpeg2 --region us-east-1 --query QueueUrl --output text
AWS_PAGER="" aws sqs get-queue-url --queue-name videosearcher-ffmpeg2-to-ffmpeg3 --region us-east-1 --query QueueUrl --output text
AWS_PAGER="" aws sqs get-queue-url --queue-name videosearcher-ffmpeg2-to-deepspeech --region us-east-1 --query QueueUrl --output text
AWS_PAGER="" aws sqs get-queue-url --queue-name videosearcher-ffmpeg3-to-object --region us-east-1 --query QueueUrl --output text

faas-cli deploy -f stack.yml
```

4. Deploy the SQS bridge consumers:

```bash
docker build -t soumyadeeps/sqs-bridge:latest sqs-bridge
docker push soumyadeeps/sqs-bridge:latest
kubectl apply -f k8s/sqs-bridge.yaml
kubectl get pods -n openfaas-fn | grep sqs-bridge
```

5. Ensure IAM permissions are present for the EKS node/IRSA role:

- producers: `sqs:SendMessage`, `sqs:GetQueueAttributes`, `sqs:GetQueueUrl`
- consumers: `sqs:ReceiveMessage`, `sqs:DeleteMessage`, `sqs:ChangeMessageVisibility`, `sqs:GetQueueAttributes`, `sqs:GetQueueUrl`

6. Run a clean stage-1-only JMeter test:

```bash
cd jmeter-tests
GATEWAY_HOST=<your-ELB-host> GATEWAY_PORT=8080 THINK_TIME=5000 DURATION=60 ./run-tests.sh 5
```

7. Verify queue-driven chain execution:

```bash
faas-cli list --gateway http://<your-ELB-host>:8080
kubectl logs -n openfaas-fn deploy/sqs-bridge-ffmpeg0-to-librosa --tail=100
```

If `ffmpeg-0` returns HTTP 200 and downstream invocation counts increase, SQS orchestration is working.

### How Queue Chaining Works

```text
JMeter -> OpenFaaS ffmpeg-0
      -> SQS (ffmpeg-0 to librosa)
      -> OpenFaaS librosa-fn
      -> SQS (librosa to ffmpeg-1)
      -> OpenFaaS ffmpeg-1
      -> SQS (ffmpeg-1 to ffmpeg-2)
      -> OpenFaaS ffmpeg-2
  -> fan-out to SQS ffmpeg-3 + SQS deepspeech
      -> OpenFaaS ffmpeg-3
  -> SQS (ffmpeg-3 to object-detector)
  -> OpenFaaS deepspeech-fn / object-detector
```

### What We Changed to Make It Work

The following implementation changes were made so queue orchestration runs fully inside OpenFaaS (no Lambda):

1. Added queue publisher helper:
   - `s3-wrapper/queue_helper.py`
   - Adds stage-aware SQS publish logic (`run_id`, `root_prefix`, `input`, `output`, `source_stage`)
2. Updated all function wrappers to publish next-stage messages on success:
   - `ffmpeg-0/entry.sh`
   - `librosa/entry.sh`
   - `ffmpeg-1/entry.sh`
   - `ffmpeg-2/entry.sh`
   - `ffmpeg-3/entry.sh`
   - `deepspeech/entry.sh`
   - `object-detector/entry.sh`
3. Updated all function Dockerfiles to include queue helper in image:
   - Added `COPY s3-wrapper/queue_helper.py .` (or equivalent) to every function image build
4. Updated OpenFaaS stack routing metadata:
   - `stack.yml`
   - Added per-function `CURRENT_STAGE` and `NEXT_QUEUES_JSON`
   - Added fan-out routing from `ffmpeg-2` to `ffmpeg-3` and `deepspeech-fn`
5. Updated JMeter to stage-1 trigger only:
   - `jmeter-tests/videosearcher-load-test.jmx`
   - Keeps only `ffmpeg-0` active, downstream samplers disabled
   - Sends `run_id` and `root_prefix` for queue chaining
6. Added SQS bridge workers (queue consumers) to trigger OpenFaaS endpoints:
   - `sqs-bridge/consumer.py`
   - `sqs-bridge/Dockerfile`
   - `sqs-bridge/requirements.txt`
   - `k8s/sqs-bridge.yaml`
   - `sqs-bridge/deploy.sh`
7. Hardened builds for reliability:
   - `object-detector/Dockerfile` apt retry/mirror hardening
   - `build.sh` image build retry wrapper

### End-to-End Setup Steps (Exact Flow)

Use this sequence to reproduce a working SQS-driven setup from scratch.

#### Step 1: Build and Deploy All OpenFaaS Functions

```bash
chmod +x build.sh
./build.sh

# Push images (example)
docker login
for fn in ffmpeg-0 ffmpeg-1 ffmpeg-2 ffmpeg-3 librosa-fn deepspeech-fn object-detector; do
  docker push soumyadeeps/${fn}:latest
done

# Deploy functions
faas-cli deploy -f stack.yml
```

#### Step 2: Create the Six SQS Queues

```bash
aws sqs create-queue --queue-name videosearcher-ffmpeg0-to-librosa --region us-east-1
aws sqs create-queue --queue-name videosearcher-librosa-to-ffmpeg1 --region us-east-1
aws sqs create-queue --queue-name videosearcher-ffmpeg1-to-ffmpeg2 --region us-east-1
aws sqs create-queue --queue-name videosearcher-ffmpeg2-to-ffmpeg3 --region us-east-1
aws sqs create-queue --queue-name videosearcher-ffmpeg2-to-deepspeech --region us-east-1
aws sqs create-queue --queue-name videosearcher-ffmpeg3-to-object --region us-east-1
```

Resolve queue URLs and use those exact URLs in configuration:

```bash
AWS_PAGER="" aws sqs get-queue-url --queue-name videosearcher-ffmpeg0-to-librosa --region us-east-1 --query QueueUrl --output text
AWS_PAGER="" aws sqs get-queue-url --queue-name videosearcher-librosa-to-ffmpeg1 --region us-east-1 --query QueueUrl --output text
AWS_PAGER="" aws sqs get-queue-url --queue-name videosearcher-ffmpeg1-to-ffmpeg2 --region us-east-1 --query QueueUrl --output text
AWS_PAGER="" aws sqs get-queue-url --queue-name videosearcher-ffmpeg2-to-ffmpeg3 --region us-east-1 --query QueueUrl --output text
AWS_PAGER="" aws sqs get-queue-url --queue-name videosearcher-ffmpeg2-to-deepspeech --region us-east-1 --query QueueUrl --output text
AWS_PAGER="" aws sqs get-queue-url --queue-name videosearcher-ffmpeg3-to-object --region us-east-1 --query QueueUrl --output text
```

#### Step 3: Configure Queue Routing in stack.yml

For each function in `stack.yml`:

- set `CURRENT_STAGE` to the function stage key
- set `NEXT_QUEUES_JSON` to a JSON array of objects:
  - `queue_url`: full SQS queue URL
  - `target_stage`: next stage name used by queue helper

Example format:

```yaml
environment:
  CURRENT_STAGE: ffmpeg-2
  NEXT_QUEUES_JSON: >-
    [
      {"queue_url":"https://sqs.us-east-1.amazonaws.com/<acct>/videosearcher-ffmpeg2-to-ffmpeg3","target_stage":"ffmpeg-3"},
      {"queue_url":"https://sqs.us-east-1.amazonaws.com/<acct>/videosearcher-ffmpeg2-to-deepspeech","target_stage":"deepspeech"}
    ]
```

Then redeploy:

```bash
faas-cli deploy -f stack.yml
```

#### Step 4: Grant IAM Permissions (Critical)

The EKS node role (or IRSA role if used) must have SQS permissions.

Minimum required actions:

- Producer side (function wrappers):
  - `sqs:SendMessage`
  - `sqs:GetQueueAttributes`
  - `sqs:GetQueueUrl`
- Consumer side (sqs-bridge):
  - `sqs:ReceiveMessage`
  - `sqs:DeleteMessage`
  - `sqs:ChangeMessageVisibility`
  - `sqs:GetQueueAttributes`
  - `sqs:GetQueueUrl`

Common failure if missing:

- ffmpeg-0 returns HTTP 500
- logs show `AccessDenied` for `sqs:SendMessage`

#### Step 5: Deploy the SQS Bridge Consumers

This setup uses custom bridge pods to poll SQS and invoke OpenFaaS HTTP endpoints.

```bash
# Build and push bridge image
docker build -t soumyadeeps/sqs-bridge:latest sqs-bridge
docker push soumyadeeps/sqs-bridge:latest

# Deploy bridges
kubectl apply -f k8s/sqs-bridge.yaml
kubectl get pods -n openfaas-fn | grep sqs-bridge
```

`k8s/sqs-bridge.yaml` should define one deployment per queue mapping:

- ffmpeg0->librosa (`/function/librosa-fn`)
- librosa->ffmpeg1 (`/function/ffmpeg-1`)
- ffmpeg1->ffmpeg2 (`/function/ffmpeg-2`)
- ffmpeg2->ffmpeg3 (`/function/ffmpeg-3`)
- ffmpeg2->deepspeech (`/function/deepspeech-fn`)
- ffmpeg3->object (`/function/object-detector`)

#### Step 6: Update JMeter to Trigger Only Stage 1

`jmeter-tests/videosearcher-load-test.jmx` should send only ffmpeg-0 requests.

Payload shape:

```json
{
  "run_id": "${runId}",
  "input": "${input_video}",
  "output": "s3://cloud-pipeline-loadtest-sharma/run_${runId}/ffmpeg0/output",
  "root_prefix": "s3://cloud-pipeline-loadtest-sharma/run_${runId}"
}
```

After this request, all downstream stages are queue-driven.

#### Step 7: Purge Queues Before Baseline Runs

Before each clean benchmark (5/10/15 users), purge all six queues and wait ~60 seconds:

```bash
for q in \
  videosearcher-ffmpeg0-to-librosa \
  videosearcher-librosa-to-ffmpeg1 \
  videosearcher-ffmpeg1-to-ffmpeg2 \
  videosearcher-ffmpeg2-to-ffmpeg3 \
  videosearcher-ffmpeg2-to-deepspeech \
  videosearcher-ffmpeg3-to-object; do
  url=$(AWS_PAGER="" aws sqs get-queue-url --queue-name "$q" --region us-east-1 --query QueueUrl --output text)
  aws sqs purge-queue --queue-url "$url" --region us-east-1
done

sleep 65
```

Then verify empty queues (`0 0` visible/not-visible):

```bash
for q in \
  videosearcher-ffmpeg0-to-librosa \
  videosearcher-librosa-to-ffmpeg1 \
  videosearcher-ffmpeg1-to-ffmpeg2 \
  videosearcher-ffmpeg2-to-ffmpeg3 \
  videosearcher-ffmpeg2-to-deepspeech \
  videosearcher-ffmpeg3-to-object; do
  url=$(AWS_PAGER="" aws sqs get-queue-url --queue-name "$q" --region us-east-1 --query QueueUrl --output text)
  echo -n "$q "
  aws sqs get-queue-attributes --queue-url "$url" --region us-east-1 \
    --attribute-names ApproximateNumberOfMessages ApproximateNumberOfMessagesNotVisible \
    --query 'Attributes.[ApproximateNumberOfMessages,ApproximateNumberOfMessagesNotVisible]' \
    --output text
done
```

#### Step 8: Run Load Tests

```bash
cd jmeter-tests

# 5, 10, 15-user baselines
GATEWAY_HOST=<your-ELB-host> GATEWAY_PORT=8080 THINK_TIME=5000 DURATION=60 ./run-tests.sh 5
GATEWAY_HOST=<your-ELB-host> GATEWAY_PORT=8080 THINK_TIME=5000 DURATION=60 ./run-tests.sh 10
GATEWAY_HOST=<your-ELB-host> GATEWAY_PORT=8080 THINK_TIME=5000 DURATION=60 ./run-tests.sh 15
```

#### Step 9: Validate End-to-End Success

Validation checklist:

1. Stage-1 request returns HTTP 200.
2. SQS bridge logs show receive -> invoke -> delete loop.
3. `faas-cli list --gateway ...` invocation counters increase for all downstream functions.
4. JMeter JTL summaries show 0 failures for ffmpeg-0 requests.

### Queue Message Contract

Queue message format produced by wrappers:

```json
{
  "run_id": "<uuid>",
  "source_stage": "ffmpeg-0",
  "root_prefix": "s3://bucket/run_<uuid>",
  "input": "s3://bucket/run_<uuid>/ffmpeg0/output.tar.gz",
  "output": "s3://bucket/run_<uuid>/librosa/output"
}
```

Notes:

- `run_id` keeps all stage artifacts grouped per pipeline execution.
- `root_prefix` allows deterministic derivation of later stage paths.
- `input` and `output` are always S3 URIs (pointers), not payload blobs.

### Stage Mapping Reference

| Source Stage | Queue | Target Function | Target Stage Key |
|-------------|-------|-----------------|------------------|
| ffmpeg-0 | videosearcher-ffmpeg0-to-librosa | librosa-fn | librosa |
| librosa | videosearcher-librosa-to-ffmpeg1 | ffmpeg-1 | ffmpeg-1 |
| ffmpeg-1 | videosearcher-ffmpeg1-to-ffmpeg2 | ffmpeg-2 | ffmpeg-2 |
| ffmpeg-2 | videosearcher-ffmpeg2-to-ffmpeg3 | ffmpeg-3 | ffmpeg-3 |
| ffmpeg-2 | videosearcher-ffmpeg2-to-deepspeech | deepspeech-fn | deepspeech |
| ffmpeg-3 | videosearcher-ffmpeg3-to-object | object-detector | object-detector |

### Troubleshooting Notes from This Setup

1. **`AccessDenied` on `SendMessage`**
   - Symptom: ffmpeg-0 returns 500, queue publish fails.
   - Fix: Add `sqs:SendMessage` and related read actions to node/IRSA role.
2. **Queue URL account mismatch (`InvalidAddress`)**
   - Symptom: purge/get attributes fails for seemingly correct URL.
   - Fix: always resolve URLs with `get-queue-url` in the active account/region.
3. **Bridge not deployed**
   - Symptom: messages accumulate, downstream functions never trigger.
   - Fix: deploy `k8s/sqs-bridge.yaml` and check bridge pod logs.
4. **Stale messages affect new tests**
   - Symptom: unexpected old payloads or malformed records in new run.
   - Fix: purge all queues and wait propagation window before each clean baseline.

Default output prefixes are auto-derived per stage:

- `ffmpeg-0` -> `.../ffmpeg0`
- `librosa` -> `.../librosa`
- `ffmpeg-1` -> `.../ffmpeg1`
- `ffmpeg-2` -> `.../ffmpeg2`
- `ffmpeg-3` -> `.../ffmpeg3`
- `deepspeech` -> `.../deepspeech`
- `object-detector` -> `.../objdetect`

---

## Cloud Deployment (AWS EKS)

After validating the pipeline locally on Docker Desktop, we deployed the entire OpenFaaS stack to **Amazon Elastic Kubernetes Service (EKS)** for production-grade cloud hosting.

### Why AWS EKS?

We evaluated multiple cloud Kubernetes services. AWS EKS was selected for the following reasons:

1. **Elastic File System (EFS)**: Provides `ReadWriteMany` persistent volumes natively — critical for a pipeline where all 7 functions need to share input/output data on the same filesystem
2. **Elastic Container Registry (ECR)**: Integrated private container registry for faster in-region image pulls (not used in our initial deployment since OpenFaaS CE requires public images, but available for future migration to OpenFaaS Pro)
3. **Full amd64 node control**: DeepSpeech requires x86_64 — EKS makes it straightforward to select specific instance types
4. **Mature Kubernetes ecosystem**: First-class support for Helm, `eksctl`, and the OpenFaaS `faas-netes` provider
5. **Elastic Load Balancer (ELB)**: One-command setup to expose the OpenFaaS gateway publicly via `kubectl patch svc gateway -p '{"spec":{"type":"LoadBalancer"}}'`

### Cloud Environment Comparison

Before choosing AWS EKS, we evaluated the following cloud Kubernetes platforms:

| Factor | **AWS EKS** (chosen) | Azure AKS | Google GKE |
|--------|---------------------|-----------|------------|
| Kubernetes maturity | Excellent | Good | Excellent |
| AMD64 node availability | Full control via instance types | Full control | Full control |
| Container registry | ECR (private, integrated) | ACR | GCR / Artifact Registry |
| Shared storage (ReadWriteMany) | **EFS** (native, easy) | Azure Files | Filestore |
| Load balancer integration | ELB (automatic) | Azure LB | Cloud LB |
| CLI tooling | `eksctl` (purpose-built) | `az aks` | `gcloud` |
| Free tier / credits | 12-month free tier | $200 credit | $300 credit |
| Estimated monthly cost | ~$100–215 | ~$80–150 | ~$70–140 |

**Decision**: AWS EKS was chosen for its superior shared storage (EFS), seamless load balancer provisioning, and the `eksctl` CLI which simplifies cluster lifecycle management.

### AWS Prerequisites

| Tool | Version Used | Purpose |
|------|-------------|----------|
| AWS CLI | v2 | Interact with AWS services |
| eksctl | 0.223.0 | Create and manage EKS clusters |
| kubectl | v1.34.1 | Manage Kubernetes resources |
| Helm | v3 | Install OpenFaaS via Helm chart |
| faas-cli | 0.18.0 | Deploy functions to OpenFaaS |
| Docker | 29.1.3 | Build container images |

**Install prerequisites** (macOS):

```bash
brew install awscli eksctl kubectl helm
curl -sL https://cli.openfaas.com | sudo sh
```

**Configure AWS credentials**:

```bash
aws configure
# AWS Access Key ID: <your-access-key>
# AWS Secret Access Key: <your-secret-key>
# Default region name: us-east-1
# Default output format: json
```

### Step 1: Create the EKS Cluster

#### Check vCPU Quota

Before creating the cluster, verify your On-Demand vCPU quota in the target region:

```bash
aws service-quotas get-service-quota \
  --service-code ec2 \
  --quota-code L-1216C47A \
  --region us-east-1
```

The default quota for new AWS accounts is often **5 vCPUs**. This limits your instance type choices.

#### Instance Type Selection

| Instance Type | vCPUs | Memory | vCPUs for 2 Nodes | Fits 5 vCPU Quota? | Notes |
|---------------|-------|--------|-------------------|--------------------|-------|
| `t3.xlarge` | 4 | 16 GB | 8 | No | Ideal but exceeds quota |
| `t3.large` | 2 | 8 GB | 4 | Yes | Good balance |
| `t3.medium` | 2 | 4 GB | 4 | Yes | Tight on memory |
| `m7i-flex.large` | 2 | 8 GB | 4 | **Yes** | **Chosen** — Free Tier eligible, 8GB RAM |

We selected **`m7i-flex.large`** because:
- 2 vCPUs × 2 nodes = 4 vCPUs → fits within the 5 vCPU quota
- 8 GB RAM per node → sufficient for memory-intensive functions (deepspeech, object-detector, librosa each need up to 1Gi)
- Free Tier eligible — reducing cost during development

#### Create the Cluster

```bash
eksctl create cluster \
  --name videosearcher \
  --region us-east-1 \
  --node-type m7i-flex.large \
  --nodes 2 \
  --nodes-min 1 \
  --nodes-max 2 \
  --managed \
  --zones us-east-1a,us-east-1b
```

This takes approximately **15–20 minutes**. `eksctl` creates:
- A VPC with public and private subnets in two availability zones
- The EKS control plane
- A managed node group with 2 EC2 instances
- All necessary IAM roles and security groups

Verify the cluster is ready:

```bash
kubectl get nodes
# NAME                             STATUS   ROLES    AGE   VERSION
# ip-192-168-31-209.ec2.internal   Ready    <none>   9m    v1.34.4-eks-efcacff
# ip-192-168-47-216.ec2.internal   Ready    <none>   9m    v1.34.4-eks-efcacff
```

### Step 2: Install OpenFaaS on EKS

```bash
# Create OpenFaaS namespaces
kubectl apply -f https://raw.githubusercontent.com/openfaas/faas-netes/master/namespaces.yml

# Add Helm repo
helm repo add openfaas https://openfaas.github.io/faas-netes/
helm repo update

# Install OpenFaaS
helm upgrade openfaas --install openfaas/openfaas \
  --namespace openfaas \
  --set functionNamespace=openfaas-fn \
  --set generateBasicAuth=true

# Verify all OpenFaaS pods are running
kubectl get pods -n openfaas
# NAME                            READY   STATUS    RESTARTS   AGE
# alertmanager-...                1/1     Running   0          5m
# gateway-...                     2/2     Running   0          5m
# nats-...                        1/1     Running   0          5m
# prometheus-...                  1/1     Running   0          5m
# queue-worker-...                1/1     Running   0          5m

# Get the admin password
PASSWORD=$(kubectl get secret -n openfaas basic-auth \
  -o jsonpath="{.data.basic-auth-password}" | base64 --decode)
echo $PASSWORD

# Port-forward the gateway and login
kubectl port-forward -n openfaas svc/gateway 8080:8080 &
echo -n $PASSWORD | faas-cli login --username admin --password-stdin
```

### Step 3: Rebuild Images for amd64

**Critical**: If you are building on Apple Silicon (ARM64/M1/M2/M3), the default `docker build` produces ARM64 images. The EKS nodes are x86_64 (amd64), so ARM64 images will crash with:

```
exec /usr/bin/fwatchdog: exec format error
```

**All images must be built with `--platform linux/amd64`.**

The `build.sh` script has been updated to force amd64 builds for all functions:

```bash
#!/bin/bash
set -e
cd "$(dirname "$0")"

# Force amd64 builds — required for x86_64 EKS nodes when building on Apple Silicon
PLATFORM="--platform linux/amd64"

docker build $PLATFORM -f ffmpeg-0/Dockerfile -t videosearcher/ffmpeg-0:latest .
docker build $PLATFORM -f ffmpeg-1/Dockerfile -t videosearcher/ffmpeg-1:latest .
docker build $PLATFORM -f ffmpeg-2/Dockerfile -t videosearcher/ffmpeg-2:latest .
docker build $PLATFORM -f ffmpeg-3/Dockerfile -t videosearcher/ffmpeg-3:latest .
docker build $PLATFORM -f librosa/Dockerfile -t videosearcher/librosa-fn:latest .
docker build $PLATFORM -f deepspeech/Dockerfile -t videosearcher/deepspeech-fn:latest .
docker build $PLATFORM -f object-detector/Dockerfile -t videosearcher/object-detector:latest .
```

Run the build:

```bash
chmod +x build.sh
./build.sh
```

Verify the architecture of a built image:

```bash
docker inspect --format='{{.Architecture}}' videosearcher/ffmpeg-0:latest
# amd64
```

### Step 4: Push Images and Deploy

**Tag and push all images to Docker Hub**:

```bash
docker login

# Push each image individually
docker tag videosearcher/ffmpeg-0 soumyadeeps/ffmpeg-0 && docker push soumyadeeps/ffmpeg-0
docker tag videosearcher/ffmpeg-1 soumyadeeps/ffmpeg-1 && docker push soumyadeeps/ffmpeg-1
docker tag videosearcher/ffmpeg-2 soumyadeeps/ffmpeg-2 && docker push soumyadeeps/ffmpeg-2
docker tag videosearcher/ffmpeg-3 soumyadeeps/ffmpeg-3 && docker push soumyadeeps/ffmpeg-3
docker tag videosearcher/librosa-fn soumyadeeps/librosa-fn && docker push soumyadeeps/librosa-fn
docker tag videosearcher/deepspeech-fn soumyadeeps/deepspeech-fn && docker push soumyadeeps/deepspeech-fn
docker tag videosearcher/object-detector soumyadeeps/object-detector && docker push soumyadeeps/object-detector
```

**Deploy to OpenFaaS on EKS**:

```bash
# Ensure port-forward is active
kubectl port-forward -n openfaas svc/gateway 8080:8080 &

# Deploy all functions
faas-cli deploy -f stack.yml
```

Verify all pods are running:

```bash
kubectl get pods -n openfaas-fn
# NAME                               READY   STATUS    RESTARTS   AGE
# deepspeech-fn-...                  1/1     Running   0          73s
# ffmpeg-0-...                       1/1     Running   0          73s
# ffmpeg-1-...                       1/1     Running   0          73s
# ffmpeg-2-...                       1/1     Running   0          73s
# ffmpeg-3-...                       1/1     Running   0          73s
# librosa-fn-...                     1/1     Running   0          73s
# object-detector-...                1/1     Running   0          72s
```

### Step 5: Expose the Gateway Publicly

To make the OpenFaaS gateway accessible over the internet, change the gateway service type to `LoadBalancer`:

```bash
kubectl patch svc gateway -n openfaas -p '{"spec":{"type":"LoadBalancer"}}'
```

AWS automatically provisions an Elastic Load Balancer (ELB). Wait 1–2 minutes, then get the URL:

```bash
kubectl get svc gateway -n openfaas
# NAME      TYPE           CLUSTER-IP      EXTERNAL-IP                                                               PORT(S)          AGE
# gateway   LoadBalancer   10.100.122.36   a86db78a1498941edbb5952f01041129-854708034.us-east-1.elb.amazonaws.com     8080:31083/TCP   33m
```

The gateway is now accessible at:

```
http://<ELB-URL>:8080
```

Invoke functions from anywhere:

```bash
curl http://<ELB-URL>:8080/function/ffmpeg-0 \
  -d '{"input":"/tmp/test.mp4","output":"/tmp/out"}'

faas-cli list --gateway http://<ELB-URL>:8080
```

> **Security note**: The ELB endpoint is publicly accessible. The basic-auth credentials protect the OpenFaaS API, but for production you should:
> - Add HTTPS via an AWS ACM certificate + ALB Ingress Controller
> - Restrict access via security groups to known IP ranges
> - Consider using OpenFaaS Pro with IAM-based authentication

### Cloud Deployment Verification

Final state of the cloud deployment:

| Component | Details |
|-----------|---------|
| **EKS Cluster** | `videosearcher` — ACTIVE, us-east-1 |
| **Kubernetes Version** | v1.34 |
| **Node Group** | 2× `m7i-flex.large` (2 vCPU, 8GB RAM each) |
| **Total Cluster Resources** | 4 vCPUs, 16 GB RAM |
| **OpenFaaS** | CE (Community Edition) via Helm |
| **Gateway** | Exposed via AWS ELB on port 8080 |
| **Functions** | All 7 Running (1/1), 0 restarts |
| **Image Registry** | Docker Hub (public, `soumyadeeps/*`) |

```bash
faas-cli list
# Function                        Invocations     Replicas
# deepspeech-fn                   0               1
# ffmpeg-0                        0               1
# ffmpeg-1                        0               1
# ffmpeg-2                        0               1
# ffmpeg-3                        0               1
# librosa-fn                      0               1
# object-detector                 0               1
```

### Issues Faced During Cloud Deployment

#### 1. CloudFormation Stack Timeout (Node Group Creation)

**Problem**: `eksctl create cluster` with `t3.xlarge` nodes failed with `exceeded max wait time for StackCreateComplete waiter`.

**Root Cause**: The AWS account had a **5 vCPU On-Demand quota** (default for new accounts). `t3.xlarge` (4 vCPUs) × 2 nodes = 8 vCPUs, exceeding the quota. CloudFormation couldn't launch the EC2 instances, causing the stack to time out.

**Diagnosis**:
```bash
aws service-quotas get-service-quota \
  --service-code ec2 \
  --quota-code L-1216C47A \
  --region us-east-1
# "Value": 5.0  ← only 5 vCPUs allowed
```

**Fix**: Switched to `m7i-flex.large` (2 vCPUs × 2 nodes = 4 vCPUs), which fits within the 5 vCPU quota and provides 8GB RAM per node (more than `t3.medium` at 4GB).

#### 2. CloudFormation Stack Already Exists

**Problem**: After a failed cluster creation, retrying `eksctl create cluster` returned `AlreadyExistsException: Stack [eksctl-videosearcher-cluster] already exists`.

**Root Cause**: The failed attempt left orphaned CloudFormation stacks that weren't fully cleaned up by `eksctl delete cluster`.

**Fix**: Manually deleted the CloudFormation stacks:
```bash
# Check for lingering stacks
aws cloudformation list-stacks --region us-east-1 \
  --query "StackSummaries[?contains(StackName,'videosearcher') && StackStatus!='DELETE_COMPLETE'].{Name:StackName,Status:StackStatus}" \
  --output table

# Delete them manually
aws cloudformation delete-stack --stack-name eksctl-videosearcher-nodegroup-ng-XXXX --region us-east-1
aws cloudformation delete-stack --stack-name eksctl-videosearcher-cluster --region us-east-1
aws cloudformation wait stack-delete-complete --stack-name eksctl-videosearcher-cluster --region us-east-1
```

#### 3. exec format error (ARM64 vs amd64 Images)

**Problem**: After deploying to EKS, 6 out of 7 function pods crashed with `CrashLoopBackOff`. Logs showed:

```
exec /usr/bin/fwatchdog: exec format error
```

Only `deepspeech-fn` worked correctly.

**Root Cause**: The Docker images were built on **Apple Silicon (ARM64)** without specifying `--platform linux/amd64`. The EKS nodes run **x86_64 (amd64)**, so the ARM64 binaries (including the `fwatchdog` watchdog) couldn't execute. DeepSpeech was the only function that worked because its Dockerfile already had `--platform linux/amd64` (required for the DeepSpeech Python wheel).

**Fix**: Updated `build.sh` to add `--platform linux/amd64` to **all** Docker build commands, rebuilt all images, re-pushed to Docker Hub, and deleted the old pods to force new image pulls:

```bash
# Rebuild all images for amd64
./build.sh

# Re-tag and push
docker tag videosearcher/ffmpeg-0 soumyadeeps/ffmpeg-0 && docker push soumyadeeps/ffmpeg-0
# ... (repeat for all 7 functions)

# Force new pods with fresh image pulls
kubectl delete pods --all -n openfaas-fn
```

#### 4. Kubernetes Image Cache (Stale ARM64 Images)

**Problem**: Even after pushing new amd64 images, pods still crashed with `exec format error` because Kubernetes was using **cached ARM64 images** on the nodes.

**Root Cause**: The Docker Hub tag (`:latest`) was the same, but the local `docker tag` command hadn't been re-run after the rebuild. The pushed image on Docker Hub was still the old ARM64 version.

**Diagnosis**:
```bash
# Compare image IDs — they should match
docker inspect --format='{{.Id}}' videosearcher/ffmpeg-0:latest
# sha256:fe3a5b5e57ca...  (new amd64 build)
docker inspect --format='{{.Id}}' soumyadeeps/ffmpeg-0:latest
# sha256:33c5e4ba15fa...  (old ARM64 — different!)
```

**Fix**: Re-ran `docker tag` to update the Docker Hub tag to point to the new amd64 image, then pushed again. After deleting all pods (`kubectl delete pods --all -n openfaas-fn`), Kubernetes pulled the correct amd64 images and all 7 pods started successfully.

### Cost Estimate

Estimated monthly cost for the deployment as configured:

| Resource | Specification | Monthly Cost |
|----------|--------------|-------------|
| EKS control plane | 1 cluster | ~$73 |
| EC2 nodes | 2× `m7i-flex.large` (Free Tier eligible) | ~$0–60* |
| Elastic Load Balancer | 1 Classic LB | ~$18 |
| Data transfer | Moderate | ~$5–10 |
| Docker Hub | Public images (free) | $0 |
| **Total** | | **~$96–161/mo** |

\* Free Tier eligible instances are free for 750 hours/month in the first 12 months.

**Cost-saving tips**:
- Use **Spot Instances** for worker nodes (60–70% savings on EC2)
- Scale down to 1 node when idle
- Use `eksctl scale nodegroup` to adjust capacity on demand
- Set up cluster auto-scaler to scale to 0 nodes during inactivity
- Consider **GKE Autopilot** for pay-per-pod pricing (~$70–100/mo)

---

## Future Improvements

1. **Pipeline Orchestrator**: Build a controller function that chains the 7 stages together automatically instead of relying on the JMeter test plan to drive the sequence
2. **Dynamic Clip Count Handling**: Currently the JMeter test only processes `clip_0` through later stages; a smarter test would parse ffmpeg-1's output to discover how many clips were produced and iterate over all of them
3. **ARM64 DeepSpeech Alternative**: Replace DeepSpeech with a speech-to-text model that has native ARM64 support (e.g., Whisper)
4. **Private Registry (ECR)**: Migrate from public Docker Hub to Amazon ECR for faster in-region pulls and private image storage (requires OpenFaaS Pro)
5. **Model Download at Runtime**: Instead of bundling large model files (~1.1GB for DeepSpeech) in the Docker image, download them at container startup from S3
6. **HTTPS / TLS**: Add an AWS ACM certificate and ALB Ingress Controller to serve the OpenFaaS gateway over HTTPS
7. **Security Hardening**: Restrict ELB access via security groups, enable Kubernetes RBAC, and rotate the OpenFaaS admin password
8. **vCPU Quota Increase**: Request a quota increase to 16+ vCPUs to use larger instance types (e.g., `t3.xlarge` with 16GB RAM) for better performance
9. **Health Checks**: Add more sophisticated health checks beyond the default lock file
10. **CI/CD Pipeline**: Automate the build → push → deploy cycle using GitHub Actions or AWS CodePipeline
