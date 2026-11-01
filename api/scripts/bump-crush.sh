#!/bin/sh
# Bump the pinned crush fork commit (CRUSH_REF) and its stamped version
# (CRUSH_VERSION) in api/Dockerfile to a given ref — default origin/main.
# The compose stack's CRUSH_VERSION fallback is kept in sync too, since
# ARG defaults are the only ref/version source (deploy-ghcr.sh passes
# no --build-arg).
#
# Usage:
#   ./scripts/bump-crush.sh [ref] [--push]
#
# ref   branch, tag, or commit SHA on github.com/andikapradanaarif/crush.
# --push  also build + push the GHCR api image afterwards (deploy-ghcr.sh).

set -e

REPO_URL="https://github.com/andikapradanaarif/crush"
REF="main"
PUSH=0
for arg in "$@"; do
  case "$arg" in
    --push) PUSH=1 ;;
    *) REF="$arg" ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DOCKERFILE="$API_ROOT/Dockerfile"
COMPOSE="$API_ROOT/deploy/docker-compose.yml"

# A cached blobless clone keeps repeated bumps cheap: the commit graph
# and tag refs come down, blobs stay lazy (describe needs neither).
CLONE="${XDG_CACHE_HOME:-$HOME/.cache}/vishnu/crush-repo"
if [ -d "$CLONE/.git" ]; then
  git -C "$CLONE" fetch --filter=blob:none --tags origin
else
  mkdir -p "$(dirname "$CLONE")"
  git clone --filter=blob:none --no-checkout "$REPO_URL" "$CLONE"
fi

# Resolve the ref to a full SHA: branch heads live under origin/, tags
# and SHAs resolve directly (everything was fetched above).
if ! SHA=$(git -C "$CLONE" rev-parse "origin/$REF^{commit}" 2>/dev/null); then
  SHA=$(git -C "$CLONE" rev-parse "$REF^{commit}" 2>/dev/null) \
    || { echo "❌ Cannot resolve ref: $REF"; exit 1; }
fi
VERSION=$(git -C "$CLONE" describe --tags --long "$SHA") \
  || { echo "❌ No tag reachable from $SHA — cannot describe."; exit 1; }

CURRENT_REF=$(sed -n 's|^ARG CRUSH_REF=\(.*\)|\1|p' "$DOCKERFILE")
CURRENT_VERSION=$(sed -n 's|^ARG CRUSH_VERSION=\(.*\)|\1|p' "$DOCKERFILE")
# Rewrite when the ref moved OR the describe improved — a new fork tag
# over the pinned commit changes CRUSH_VERSION without moving CRUSH_REF.
if [ "$SHA" = "$CURRENT_REF" ] && [ "$VERSION" = "$CURRENT_VERSION" ]; then
  echo "Already pinned at $SHA ($VERSION) — nothing to rewrite."
else
  sed -e "s|^ARG CRUSH_REF=.*|ARG CRUSH_REF=$SHA|" \
      -e "s|^ARG CRUSH_VERSION=.*|ARG CRUSH_VERSION=$VERSION|" \
      "$DOCKERFILE" > "$DOCKERFILE.tmp" && mv "$DOCKERFILE.tmp" "$DOCKERFILE"

  sed "s|CRUSH_VERSION: \${CRUSH_VERSION:-[^}]*}|CRUSH_VERSION: \${CRUSH_VERSION:-$VERSION}|" \
      "$COMPOSE" > "$COMPOSE.tmp" && mv "$COMPOSE.tmp" "$COMPOSE"

  echo "CRUSH_REF     = $SHA"
  echo "CRUSH_VERSION = $VERSION"
  git -C "$API_ROOT/.." diff -- api/Dockerfile api/deploy/docker-compose.yml
fi

if [ "$PUSH" = 1 ]; then
  exec "$SCRIPT_DIR/deploy-ghcr.sh"
fi
