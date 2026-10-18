#!/bin/bash

# Dev script for shared-ts
# This script watches for changes and rebuilds with Bun

set -e

# Bun applies the package's own "sideEffects" field during bundling, which
# tree-shakes away all component implementations. Temporarily strip it so
# Bun preserves all exports, then restore it on exit.
PACKAGE_JSON_BACKUP=""
cleanup() {
  if [ -n "$PACKAGE_JSON_BACKUP" ]; then
    echo "$PACKAGE_JSON_BACKUP" > package.json
    echo "📋 Restored package.json with sideEffects field"
  fi
}
trap cleanup EXIT

if grep -q '"sideEffects"' package.json; then
  PACKAGE_JSON_BACKUP=$(cat package.json)
  python3 -c "
import json
with open('package.json') as f:
    d = json.load(f)
d.pop('sideEffects', None)
with open('package.json', 'w') as f:
    json.dump(d, f, indent='\t')
    f.write('\n')
"
fi

echo "📦 Watching for changes with Bun..."
bun build \
  ./index.ts \
  ./ui-component/actionBar/index.ts \
  ./ui-component/button/index.ts \
  ./ui-component/calendar/index.ts \
  ./ui-component/chip/index.ts \
  ./ui-component/dataList/index.ts \
  ./ui-component/dialog/index.ts \
  ./ui-component/drawer/index.ts \
  ./ui-component/input/index.ts \
  ./ui-component/loadingAnimation/index.ts \
  ./ui-component/message/index.ts \
  ./ui-component/pagination/index.ts \
  ./ui-component/popover/index.ts \
  ./ui-component/table/index.ts \
  ./ui-component/tabs/index.ts \
  ./ui-component/text/index.ts \
  ./ui-component/tooltip/index.ts \
  ./ui-component/alert/index.ts \
  ./ui-component/clickOutside/index.ts \
  ./ui-component/form/index.ts \
  ./ui-component/menu/index.ts \
  ./ui-component/userImageIcon/index.ts \
  ./ui-component/wrapper/index.ts \
  ./ui-component/input/timePicker/index.ts \
  ./ui-component/accordion/index.ts \
  ./ui-component/breadcrumb/index.ts \
  ./ui-component/browserWarning/index.ts \
  ./ui-component/emptyData/index.ts \
  ./ui-component/qrCode/index.ts \
  ./ui-component/stepper/index.ts \
  ./ui-component/slider/index.ts \
  ./ui-component/richTextEditor/index.ts \
  ./ui-component/progressBar/index.ts \
  ./ui-component/rating/index.ts \
  ./ui-component/emptyState/index.ts \
  ./utils/index.ts \
  ./hooks/index.ts \
  --bundle \
  --outdir ./dist \
  --format esm \
  --splitting \
  --target node \
  --external react \
  --external react-dom \
  --external react/jsx-runtime \
  --external react/jsx-dev-runtime \
  --external @tanstack/react-form \
  --external qrcode.react \
  --external slate \
  --external slate-react \
  --external slate-history \
  --external slate-dom \
  --watch
