#!/bin/bash
# Build all OpenFaaS function images from the repo root.
# Usage: ./build.sh
set -e

cd "$(dirname "$0")"

# Force amd64 builds — required for x86_64 EKS nodes when building on Apple Silicon
PLATFORM="--platform linux/amd64"

echo "=== Building ffmpeg-0 ==="
docker build $PLATFORM -f ffmpeg-0/Dockerfile -t videosearcher/ffmpeg-0:latest .

echo "=== Building ffmpeg-1 ==="
docker build $PLATFORM -f ffmpeg-1/Dockerfile -t videosearcher/ffmpeg-1:latest .

echo "=== Building ffmpeg-2 ==="
docker build $PLATFORM -f ffmpeg-2/Dockerfile -t videosearcher/ffmpeg-2:latest .

echo "=== Building ffmpeg-3 ==="
docker build $PLATFORM -f ffmpeg-3/Dockerfile -t videosearcher/ffmpeg-3:latest .

echo "=== Building librosa-fn ==="
docker build $PLATFORM -f librosa/Dockerfile -t videosearcher/librosa-fn:latest .

echo "=== Building deepspeech-fn (amd64 — no ARM64 wheel available) ==="
docker build $PLATFORM -f deepspeech/Dockerfile -t videosearcher/deepspeech-fn:latest .

echo "=== Building object-detector ==="
docker build $PLATFORM -f object-detector/Dockerfile -t videosearcher/object-detector:latest .

echo ""
echo "All images built successfully!"
docker images | grep videosearcher
