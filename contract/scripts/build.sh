#!/bin/bash

# Build script for @vishnu/api-contract
# 1. tsc emits .d.ts declarations (emitDeclarationOnly). Source files use
#    extensionless relative imports (bundler resolution).
# 2. bun build bundles each runtime entry point to ESM .js, inlining
#    relative imports so the emitted bundles are self-contained.

set -e

echo "Cleaning dist directory..."
rm -rf dist

echo "Generating TypeScript declarations..."
tsc --project tsconfig.build.json

echo "Bundling runtime modules..."
bun build src/index.ts --outfile dist/index.js --format esm
bun build src/client.ts --outfile dist/client.js --format esm
bun build src/paths.ts --outfile dist/paths.js --format esm
bun build src/types.ts --outfile dist/types.js --format esm

for d in auth projects users workspaces sessions agent config permissions questions events; do
	bun build "src/$d/index.ts" --outfile "dist/$d/index.js" --format esm
done

echo "Build complete!"
