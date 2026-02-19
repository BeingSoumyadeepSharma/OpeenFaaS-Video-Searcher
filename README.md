# VideoSearcher on OpenFaaS

This project deploys the **VideoSearcher** AI-SPRINT video processing pipeline as a set of serverless functions on **OpenFaaS**, running on a local Kubernetes cluster (Docker Desktop). The key design goal was to **keep all original `main.py` files completely untouched** — no code changes to any component.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
  - [Pipeline Stages](#pipeline-stages)
  - [Classic Watchdog Pattern](#classic-watchdog-pattern)
- [Design Decisions](#design-decisions)
  - [Why Classic Watchdog (Not of-watchdog)](#why-classic-watchdog-not-of-watchdog)
  - [Why aisprint-stub (No-Op Package)](#why-aisprint-stub-no-op-package)
  - [Why entry.sh Wrappers](#why-entrysh-wrappers)
- [Repository Structure](#repository-structure)
- [Files We Created (Original Code Left Untouched)](#files-we-created-original-code-left-untouched)
  - [aisprint-stub Package](#aisprint-stub-package)
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
- [Function Details](#function-details)
- [Configuration Reference](#configuration-reference)
- [Performance Testing (JMeter)](#performance-testing-jmeter)
  - [Test Plan Overview](#test-plan-overview)
  - [Load Configuration](#load-configuration)
  - [Installing JMeter](#installing-jmeter)
  - [Running the Tests](#running-the-tests)
  - [Analyzing Results](#analyzing-results)
  - [Test Files Reference](#test-files-reference)
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
3. Calls `python main.py -i "$INPUT" -o "$OUTPUT"`

This way the original `main.py` receives exactly the same arguments it always expected.

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

### entry.sh Wrappers

Each function has an `entry.sh` that parses JSON from stdin and invokes the original `main.py`:

**Standard entry.sh** (used by ffmpeg-0/1/2/3, librosa, deepspeech):

```bash
#!/bin/sh
JSON=$(cat)
INPUT=$(echo "$JSON" | jq -r '.input')
OUTPUT=$(echo "$JSON" | jq -r '.output')
cd /home/app/function
exec python main.py -i "$INPUT" -o "$OUTPUT"
```

**Object-detector entry.sh** (adds ONNX model path argument):

```bash
#!/bin/sh
JSON=$(cat)
INPUT=$(echo "$JSON" | jq -r '.input')
OUTPUT=$(echo "$JSON" | jq -r '.output')
ONNX_FILE=$(echo "$JSON" | jq -r '.onnx_file // "onnx/yolov4.onnx"')
cd /home/app/function
exec python main.py -i "$INPUT" -o "$OUTPUT" -y "$ONNX_FILE"
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
# Test ffmpeg-0
curl -s http://127.0.0.1:8080/function/ffmpeg-0 \
  -d '{"input":"/tmp/test.mp4","output":"/tmp/out"}'

# Test librosa
curl -s http://127.0.0.1:8080/function/librosa-fn \
  -d '{"input":"/tmp/test.tar.gz","output":"/tmp/out"}'

# Test deepspeech
curl -s http://127.0.0.1:8080/function/deepspeech-fn \
  -d '{"input":"/tmp/test.tar.gz","output":"/tmp/out"}'

# Test object-detector
curl -s http://127.0.0.1:8080/function/object-detector \
  -d '{"input":"/tmp/frames/","output":"/tmp/out"}'
```

You should get output from each function. If the input files don't exist, you'll see errors like `No such file or directory` — this is **expected** and confirms the function container is running and the full pipeline (watchdog → entry.sh → main.py) is working.

### Testing Individual Functions

To test with real data, you need to place files inside the container or on a shared volume:

```bash
# Copy a test video into the ffmpeg-0 pod
FFMPEG0_POD=$(kubectl get pods -n openfaas-fn -l faas_function=ffmpeg-0 -o jsonpath='{.items[0].metadata.name}')
kubectl cp /path/to/video.mp4 openfaas-fn/$FFMPEG0_POD:/tmp/test.mp4

# Invoke the function
curl -s http://127.0.0.1:8080/function/ffmpeg-0 \
  -d '{"input":"/tmp/test.mp4","output":"/tmp/out"}'
```

### End-to-End Pipeline Test

To run the full pipeline, each function's output needs to be available as the next function's input. Options:

1. **Shared PersistentVolumeClaim (PVC)**: Mount the same volume in all function pods
2. **Manual file copying**: Use `kubectl cp` between pods
3. **Orchestrator function**: Create a controller that chains the functions together

For a PVC-based approach, add a volume configuration to `stack.yml`:

```yaml
functions:
  ffmpeg-0:
    # ... existing config ...
    volumes:
      - name: shared-data
        persistentVolumeClaim:
          claimName: videosearcher-pvc
    volumeMounts:
      - name: shared-data
        mountPath: /mnt/data
```

Then all functions can read/write to `/mnt/data/`.

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

The test plan (`jmeter-tests/videosearcher-load-test.jmx`) simulates realistic user behavior:

1. A virtual user sends a POST request to a function endpoint
2. Receives and reads the response
3. **Waits 20 seconds** (think time) — simulating a real user reading the response
4. Sends the next request to the next function in the pipeline
5. Repeats for the configured test duration

Each virtual user calls all **7 functions in pipeline order**:

```
ffmpeg-0 → librosa-fn → ffmpeg-1 → ffmpeg-2 → ffmpeg-3 → deepspeech-fn → object-detector
```

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
| `host` | 127.0.0.1 | OpenFaaS gateway host |
| `port` | 8080 | OpenFaaS gateway port |
| `loops` | -1 | Loop count (-1 = infinite, controlled by duration) |

---

## Future Improvements

1. **Shared Volume**: Set up a PersistentVolumeClaim to allow all functions to share input/output data without `kubectl cp`
2. **Pipeline Orchestrator**: Build a controller function that chains the 7 stages together automatically
3. **ARM64 DeepSpeech Alternative**: Replace DeepSpeech with a speech-to-text model that has native ARM64 support (e.g., Whisper)
4. **Private Registry**: Use a private container registry instead of public Docker Hub for production
5. **Model Download at Runtime**: Instead of bundling large model files (~1.1GB for DeepSpeech) in the Docker image, download them at container startup from object storage
6. **Increase Cluster Resources**: For production workloads, use a multi-node cluster with more memory to handle concurrent video processing
7. **Health Checks**: Add more sophisticated health checks beyond the default lock file
