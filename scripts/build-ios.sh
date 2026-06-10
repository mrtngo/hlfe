#!/bin/bash
# Build script for iOS static export.
#
# Why this exists
# ───────────────
# Next.js can't emit `output: 'export'` while the project has route handlers
# (`app/api/*`). The handlers don't run on a static host anyway, so for iOS
# we move them outside the build tree, run the export, then move them back.
#
# Resilience
# ──────────
# - Stale Next caches (`.next`, `.next-3001/dev/types/validator.ts`) reference
#   moved routes by absolute path and break the build with a type error. We
#   nuke them before each build.
# - A previous crash can leave `app/api` empty and the routes stranded in
#   `_api_temp`. We detect that and recover.
# - An `EXIT` trap always restores the routes, even if the build fails — so
#   you can never lose them.

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

API_DIR="app/api"
STAGE_DIR="_api_temp"

# Middleware is unsupported under `output: 'export'`; move it aside for the
# duration of the export and restore it (with the API routes) on exit.
MW_FILE="middleware.ts"
MW_STAGE="_middleware_temp.ts"

restore_api() {
    if [ -d "$STAGE_DIR" ]; then
        echo "🛟 Restoring API routes from $STAGE_DIR..."
        # If app/api doesn't exist, move whole. If it exists (partial recovery),
        # merge any missing children back without overwriting.
        if [ ! -d "$API_DIR" ]; then
            mv "$STAGE_DIR" "$API_DIR"
        else
            for child in "$STAGE_DIR"/*; do
                base="$(basename "$child")"
                if [ ! -e "$API_DIR/$base" ]; then
                    mv "$child" "$API_DIR/$base"
                fi
            done
            rmdir "$STAGE_DIR" 2>/dev/null || true
        fi
    fi
    if [ -f "$MW_STAGE" ] && [ ! -f "$MW_FILE" ]; then
        echo "🛟 Restoring $MW_FILE..."
        mv "$MW_STAGE" "$MW_FILE"
    fi
}
trap restore_api EXIT

echo "🍎 Building for iOS..."

# Recover from a prior crash before doing anything else.
if [ ! -d "$API_DIR" ] && [ -d "$STAGE_DIR" ]; then
    echo "⚠️  Found stale $STAGE_DIR from previous crash — restoring first."
    mv "$STAGE_DIR" "$API_DIR"
fi
if [ ! -f "$MW_FILE" ] && [ -f "$MW_STAGE" ]; then
    echo "⚠️  Found stale $MW_STAGE from previous crash — restoring first."
    mv "$MW_STAGE" "$MW_FILE"
fi

# Nuke stale Next caches so generated type validators don't reference the
# moved routes (Next 16 emits .next-3001/dev/types/validator.ts that imports
# every route by absolute path; stale entries fail the typecheck).
echo "🧹 Clearing Next build caches..."
rm -rf .next .next-3001 out

# Move API routes aside for the duration of the export.
if [ -d "$API_DIR" ]; then
    echo "📦 Moving API routes aside..."
    mv "$API_DIR" "$STAGE_DIR"
fi

# Move middleware aside (unsupported by static export).
if [ -f "$MW_FILE" ]; then
    echo "📦 Moving $MW_FILE aside..."
    mv "$MW_FILE" "$MW_STAGE"
fi

# Run the static export.
echo "🔨 Running Next.js static export..."
CAPACITOR_BUILD=true npm run build

# Trap will move routes back on EXIT.

echo "✅ iOS build complete! Output is in ./out"
echo ""
echo "Next steps:"
echo "  npx cap sync"
echo "  npx cap open ios"
