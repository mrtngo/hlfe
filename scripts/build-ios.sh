#!/bin/bash
# Build script for iOS that temporarily moves API routes completely outside

set -e

echo "🍎 Building for iOS..."

# Temporarily move API routes OUTSIDE the app folder entirely
if [ -d "app/api" ]; then
    echo "📦 Moving API routes aside..."
    mv app/api _api_temp
fi

# Run the static export build
echo "🔨 Running Next.js static export..."
CAPACITOR_BUILD=true npm run build

# Restore API routes
if [ -d "_api_temp" ]; then
    echo "📦 Restoring API routes..."
    mv _api_temp app/api
fi

echo "✅ iOS build complete! Output is in ./out"
echo ""
echo "Next steps:"
echo "  1. npx cap sync"
echo "  2. npx cap open ios"
