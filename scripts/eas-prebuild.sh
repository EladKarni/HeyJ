#!/usr/bin/env bash
set -euo pipefail

echo "🔧 [EAS Pre-build] Starting google-services.json injection..."

# Verify secret exists
if [ -z "${GOOGLE_SERVICES_JSON:-}" ]; then
  echo "❌ [EAS Pre-build] ERROR: GOOGLE_SERVICES_JSON secret not found"
  exit 1
fi

# Decode and write to project root
echo "📝 [EAS Pre-build] Decoding secret to ./google-services.json"
echo "$GOOGLE_SERVICES_JSON" | base64 -d > google-services.json

# Validate JSON structure
if ! jq empty google-services.json 2>/dev/null; then
  echo "❌ [EAS Pre-build] ERROR: Decoded google-services.json is not valid JSON"
  exit 1
fi

echo "✅ [EAS Pre-build] Created ./google-services.json"

# Copy to android/app if directory exists
if [ -d "android/app" ]; then
  echo "📝 [EAS Pre-build] Copying to android/app/google-services.json"
  cp google-services.json android/app/google-services.json
  echo "✅ [EAS Pre-build] Created android/app/google-services.json"
fi

# Display validation info (without exposing secrets)
echo "📊 [EAS Pre-build] File validation:"
echo "   - File size: $(wc -c < google-services.json) bytes"
echo "   - Project ID: $(jq -r .project_id google-services.json)"
echo "   - Client email: $(jq -r .client_email google-services.json)"

echo "🎉 [EAS Pre-build] google-services.json injection complete!"
