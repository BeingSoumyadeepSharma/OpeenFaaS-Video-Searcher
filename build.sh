#!/bin/bash
# Build all OpenFaaS function images from the repo root.
# Usage: ./build.sh
set -e

cd "$(dirname "$0")"

# Force amd64 builds — required for x86_64 EKS nodes when building on Apple Silicon
PLATFORM="--platform linux/amd64"

retry_build() {
	local name="$1"
	shift
	local attempts=3
	local n=1

	while [ "$n" -le "$attempts" ]; do
		echo "=== Building ${name} (attempt ${n}/${attempts}) ==="
		if "$@"; then
			return 0
		fi

		if [ "$n" -lt "$attempts" ]; then
			echo "Build failed for ${name}, retrying in 10s..."
			sleep 10
		fi
		n=$((n + 1))
	done

	echo "ERROR: Build failed for ${name} after ${attempts} attempts."
	return 1
}

retry_build "ffmpeg-0" docker build $PLATFORM -f ffmpeg-0/Dockerfile -t videosearcher/ffmpeg-0:latest .

retry_build "ffmpeg-1" docker build $PLATFORM -f ffmpeg-1/Dockerfile -t videosearcher/ffmpeg-1:latest .

retry_build "ffmpeg-2" docker build $PLATFORM -f ffmpeg-2/Dockerfile -t videosearcher/ffmpeg-2:latest .

retry_build "ffmpeg-3" docker build $PLATFORM -f ffmpeg-3/Dockerfile -t videosearcher/ffmpeg-3:latest .

retry_build "librosa-fn" docker build $PLATFORM -f librosa/Dockerfile -t videosearcher/librosa-fn:latest .

retry_build "deepspeech-fn (amd64 — no ARM64 wheel available)" docker build $PLATFORM -f deepspeech/Dockerfile -t videosearcher/deepspeech-fn:latest .

retry_build "object-detector" docker build $PLATFORM -f object-detector/Dockerfile -t videosearcher/object-detector:latest .

echo ""
echo "All images built successfully!"
docker images | grep videosearcher
