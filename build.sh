#!/bin/bash
# Build all OpenFaaS function images from the repo root.
# Usage: ./build.sh
set -e

cd "$(dirname "$0")"

echo "=== Building ffmpeg-0 ==="
docker build -f ffmpeg-0/Dockerfile -t videosearcher/ffmpeg-0:latest .

echo "=== Building ffmpeg-1 ==="
docker build -f ffmpeg-1/Dockerfile -t videosearcher/ffmpeg-1:latest .

echo "=== Building ffmpeg-2 ==="
docker build -f ffmpeg-2/Dockerfile -t videosearcher/ffmpeg-2:latest .

echo "=== Building ffmpeg-3 ==="
docker build -f ffmpeg-3/Dockerfile -t videosearcher/ffmpeg-3:latest .

echo "=== Building librosa-fn ==="
docker build -f librosa/Dockerfile -t videosearcher/librosa-fn:latest .

echo "=== Building deepspeech-fn (amd64 — no ARM64 wheel available) ==="
docker build --platform linux/amd64 -f deepspeech/Dockerfile -t videosearcher/deepspeech-fn:latest .

echo "=== Building object-detector ==="
docker build -f object-detector/Dockerfile -t videosearcher/object-detector:latest .

echo ""
echo "All images built successfully!"
docker images | grep videosearcher
