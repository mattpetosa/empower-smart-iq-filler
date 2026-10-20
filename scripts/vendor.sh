#!/usr/bin/env bash
# Copy browser builds of the third-party libraries into www/vendor.
# pdf.js ships .mjs; nginx serves .mjs as application/octet-stream, which
# browsers refuse to run as a module, so the files are renamed to .js.
# ESLC core.js comes from the License Cleaner repo; its commit is recorded
# in www/vendor/eslc/SOURCE so a sync is a deliberate, reviewable change.
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ESLC_REPO="${ESLC_REPO:-$HOME/licenses-site}"
V="$REPO/www/vendor"
mkdir -p "$V/pdfjs" "$V/eslc"
cp "$REPO/node_modules/pdf-lib/dist/pdf-lib.esm.min.js" "$V/pdf-lib.esm.min.js"
cp "$REPO/node_modules/pdfjs-dist/legacy/build/pdf.min.mjs" "$V/pdfjs/pdf.min.js"
cp "$REPO/node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs" "$V/pdfjs/pdf.worker.min.js"
cp "$REPO/node_modules/pdfjs-dist/LICENSE" "$V/pdfjs/LICENSE"
cp "$REPO/node_modules/pdf-lib/LICENSE.md" "$V/pdf-lib.LICENSE.md"
cp "$ESLC_REPO/offline/core.js" "$V/eslc/core.js"
{
  echo "Copied from $ESLC_REPO/offline/core.js"
  echo "commit $(git -C "$ESLC_REPO" rev-parse HEAD)"
  echo "date $(date -u +%Y-%m-%dT%H:%M:%SZ)"
} > "$V/eslc/SOURCE"
echo "vendored into $V"
