#!/bin/bash
# Deploy script for the Vishnu stack using Docker Compose and GHCR images.
#
# Usage:
#   ./deploy/deploy.sh              # deploy :latest images
#   ./deploy/deploy.sh v1.2.3       # deploy a specific tag for both images
#
# Run from the api/ directory:
#   cd api && ./deploy/deploy.sh
#
# What it does:
#   1. Pull the vishnu-api and vishnu-web images from GHCR
#   2. Run database migrations (api image's migrate entrypoint)
#   3. Recreate the stack
#   4. Health check through the web front (waits for /healthz)
#   5. Roll back to the previous images if the health check fails
#
# Prerequisites:
#   - Docker Compose v2
#   - deploy/.env next to this script (see .env.example)
#   - Logged in to GHCR (docker login ghcr.io)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.prod.yml"
API_IMAGE="ghcr.io/andikapradanaarif/vishnu-api"
WEB_IMAGE="ghcr.io/andikapradanaarif/vishnu-web"
TAG="${1:-latest}"
HOST_PORT="${VISHNU_HOST_PORT:-8080}"
HEALTH_URL="http://localhost:${HOST_PORT}/healthz"
HEALTH_TIMEOUT=60  # seconds to wait for the health check

echo "=== Vishnu Deploy ==="
echo "Images: $API_IMAGE:$TAG, $WEB_IMAGE:$TAG"
echo "Health URL: $HEALTH_URL"
echo ""

# --- 1. Save current image IDs for rollback ---
OLD_API_ID=$(docker images --no-trunc -q "$API_IMAGE:latest" 2>/dev/null || echo "")
OLD_WEB_ID=$(docker images --no-trunc -q "$WEB_IMAGE:latest" 2>/dev/null || echo "")
[ -n "$OLD_API_ID" ] && docker tag "$API_IMAGE:latest" "$API_IMAGE:rollback" 2>/dev/null || true
[ -n "$OLD_WEB_ID" ] && docker tag "$WEB_IMAGE:latest" "$WEB_IMAGE:rollback" 2>/dev/null || true

# --- 2. Pull new images ---
echo "[1/4] Pulling images..."
for IMAGE in "$API_IMAGE" "$WEB_IMAGE"; do
    if [ "$TAG" != "latest" ]; then
        docker pull "$IMAGE:$TAG"
        docker tag "$IMAGE:$TAG" "$IMAGE:latest"
    else
        docker pull "$IMAGE:latest"
    fi
done
echo "  Done."
echo ""

# --- 3. Run migrations ---
echo "[2/4] Running migrations..."
docker compose -f "$COMPOSE_FILE" run --rm vishnu migrate
echo "  Done."
echo ""

# --- 4. Recreate the stack ---
# --force-recreate: a re-pulled :latest keeps the same tag, so plain
# `up -d` can decide "no config change" and leave the old image running.
echo "[3/4] Recreating containers..."
docker compose -f "$COMPOSE_FILE" up -d --force-recreate
echo "  Done."
echo ""

# --- 5. Health check ---
echo "[4/4] Health check (waiting up to ${HEALTH_TIMEOUT}s)..."
HEALTH_OK=false
for i in $(seq 1 "$HEALTH_TIMEOUT"); do
    if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
        HEALTH_OK=true
        echo "  Healthy after ${i}s."
        break
    fi
    sleep 1
    printf "."
done
echo ""

if [ "$HEALTH_OK" = "true" ]; then
    echo ""
    echo "=== Deploy successful ==="
    docker compose -f "$COMPOSE_FILE" ps
else
    echo ""
    echo "=== Health check failed — rolling back ==="
    if [ -n "$OLD_API_ID" ]; then
        docker tag "$API_IMAGE:rollback" "$API_IMAGE:latest"
    fi
    if [ -n "$OLD_WEB_ID" ]; then
        docker tag "$WEB_IMAGE:rollback" "$WEB_IMAGE:latest"
    fi
    if [ -n "$OLD_API_ID$OLD_WEB_ID" ]; then
        docker compose -f "$COMPOSE_FILE" up -d --force-recreate
        echo "Rolled back to previous images."
    else
        echo "No previous images to roll back to. Check logs:"
        echo "  docker compose -f $COMPOSE_FILE logs -f"
    fi
    exit 1
fi
