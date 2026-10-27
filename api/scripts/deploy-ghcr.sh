#!/bin/sh
# Build and push the vishnu-api image to GitHub Container Registry.
#
# Usage:
#   ./scripts/deploy-ghcr.sh              # build + push (uses layer cache)
#   ./scripts/deploy-ghcr.sh --no-cache   # force full rebuild
#
# Run from the api/ directory — the Docker build context is the repo root:
#   cd api && ./scripts/deploy-ghcr.sh

set -e

IMAGE_NAME="vishnu-api"
TAG="latest"
PLATFORM="linux/amd64"
GITHUB_USER="andikapradanaarif"
GHCR_REPO="ghcr.io/$GITHUB_USER/$IMAGE_NAME"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$API_ROOT/.." && pwd)"

BUILD_FLAGS=""
for arg in "$@"; do
  case "$arg" in
    --no-cache) BUILD_FLAGS="--no-cache" ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

# Login first — fail fast on bad credentials instead of after the build.
# GITHUB_PAT env var skips the interactive prompt (CI / re-runs).
if [ -z "$GITHUB_PAT" ]; then
  echo "Please enter your GitHub Personal Access Token (with 'write:packages' scope):"
  read -rs GITHUB_PAT
fi
if [ -z "$GITHUB_PAT" ]; then
  echo "❌ No token provided."; exit 1
fi

echo "Logging in to GitHub Container Registry..."
echo "$GITHUB_PAT" | docker login ghcr.io -u "$GITHUB_USER" --password-stdin \
  || { echo "❌ Login to GHCR failed — check the token has 'write:packages'."; exit 1; }

echo "Building $IMAGE_NAME for $PLATFORM (context: $REPO_ROOT)..."
docker build --platform "$PLATFORM" $BUILD_FLAGS \
  -f "$API_ROOT/Dockerfile" -t "$IMAGE_NAME" "$REPO_ROOT" \
  || { echo "❌ Build failed"; exit 1; }

docker tag "$IMAGE_NAME:latest" "$GHCR_REPO:$TAG" \
  || { echo "❌ Tagging failed"; exit 1; }

echo "Pushing image to GHCR..."
docker push "$GHCR_REPO:$TAG" || { echo "❌ Push failed"; exit 1; }

echo "✅ Success: image pushed to $GHCR_REPO:$TAG"
echo "To deploy on your server, run from the api/ directory:"
echo "  ./deploy/deploy.sh   # pulls images, runs migrations, recreates, health-checks"
