#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

IMAGE="${IMAGE:-soumyadeeps/videosearcher-sqs-bridge:latest}"

cd "$ROOT_DIR"

echo "Building bridge image: ${IMAGE}"
docker build --platform linux/amd64 -f sqs-bridge/Dockerfile -t "${IMAGE}" .

echo "Pushing bridge image: ${IMAGE}"
docker push "${IMAGE}"

echo "Applying Kubernetes manifests"
kubectl apply -f k8s/sqs-bridge.yaml

echo "Restarting bridge deployments"
kubectl get deploy -n openfaas-fn -o name | grep sqs-bridge | while read -r dep; do
	kubectl rollout restart -n openfaas-fn "$dep"
done

echo "Bridge deployments status"
kubectl get deploy -n openfaas-fn | grep sqs-bridge || true
