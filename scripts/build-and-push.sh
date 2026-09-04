#!/usr/bin/env bash
set -euo pipefail

REGISTRY="713923090919.dkr.ecr.us-east-1.amazonaws.com"
REPO="taskflow-backstage"
REGION="us-east-1"

# --- Guard: refuse to tag an image with a SHA that doesn't describe its contents
if ! git diff-index --quiet HEAD --; then
  echo "ERROR: uncommitted changes. A SHA tag would describe the wrong code."
  git status --short
  exit 1
fi

TAG=$(git rev-parse --short HEAD)
IMAGE="${REGISTRY}/${REPO}:${TAG}"

echo "==> Building ${IMAGE}"

yarn tsc
yarn build:backend

aws ecr get-login-password --region "${REGION}" \
  | docker login --username AWS --password-stdin "${REGISTRY}"

docker build . -f packages/backend/Dockerfile -t "${IMAGE}"
docker push "${IMAGE}"

echo ""
echo "==> Pushed ${IMAGE}"
echo "==> Deploy with:"
echo "helm upgrade --install backstage ./helm/backstage -n backstage --set image.tag=${TAG}"