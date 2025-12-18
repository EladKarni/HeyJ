#!/bin/bash

# Update imports script for HeyJ reorganization
# This script updates all relative imports to use path aliases

set -e

SRC_DIR="src"
TESTS_DIR="tests"

echo "🔄 Updating imports in TypeScript files..."

# Function to update imports in a directory
update_imports() {
  local dir=$1

  # Find all .ts and .tsx files
  find "$dir" -type f \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/node_modules/*" | while read -r file; do
    echo "  Processing: $file"

    # Update utilities imports (most common)
    sed -i '' 's|from ["'\'']\.\.*/utilities/|from "@utilities/|g' "$file"
    sed -i '' 's|from ["'\'']\.\.*/\.\.*/utilities/|from "@utilities/|g' "$file"
    sed -i '' 's|from ["'\'']\.\.*/\.\.*/\.\.*/utilities/|from "@utilities/|g' "$file"
    sed -i '' 's|from ["'\'']\.\.*/\.\.*/\.\.*/\.\.*/utilities/|from "@utilities/|g' "$file"
    sed -i '' 's|from ["'\'']\.\.*/\.\.*/\.\.*/\.\.*/\.\.*/utilities/|from "@utilities/|g' "$file"
    sed -i '' 's|from ["'\'']\.\.*/\.\.*/\.\.*/\.\.*/\.\.*/\.\.*/utilities/|from "@utilities/|g' "$file"

    # Update components imports
    sed -i '' 's|from ["'\'']\.\.*/components/|from "@components/|g' "$file"
    sed -i '' 's|from ["'\'']\.\.*/\.\.*/components/|from "@components/|g' "$file"
    sed -i '' 's|from ["'\'']\.\.*/\.\.*/\.\.*/components/|from "@components/|g' "$file"
    sed -i '' 's|from ["'\'']\.\.*/\.\.*/\.\.*/\.\.*/components/|from "@components/|g' "$file"
    sed -i '' 's|from ["'\'']\.\.*/\.\.*/\.\.*/\.\.*/\.\.*/components/|from "@components/|g' "$file"

    # Update screens imports
    sed -i '' 's|from ["'\'']\.\.*/screens/|from "@screens/|g' "$file"
    sed -i '' 's|from ["'\'']\.\.*/\.\.*/screens/|from "@screens/|g' "$file"
    sed -i '' 's|from ["'\'']\.\.*/\.\.*/\.\.*/screens/|from "@screens/|g' "$file"
    sed -i '' 's|from ["'\'']\.\.*/\.\.*/\.\.*/\.\.*/screens/|from "@screens/|g' "$file"

    # Update stores imports
    sed -i '' 's|from ["'\'']\.\.*/stores/|from "@stores/|g' "$file"
    sed -i '' 's|from ["'\'']\.\.*/\.\.*/stores/|from "@stores/|g' "$file"
    sed -i '' 's|from ["'\'']\.\.*/\.\.*/\.\.*/stores/|from "@stores/|g' "$file"
    sed -i '' 's|from ["'\'']\.\.*/\.\.*/\.\.*/\.\.*/stores/|from "@stores/|g' "$file"

    # Update hooks imports
    sed -i '' 's|from ["'\'']\.\.*/hooks/|from "@hooks/|g' "$file"
    sed -i '' 's|from ["'\'']\.\.*/\.\.*/hooks/|from "@hooks/|g' "$file"
    sed -i '' 's|from ["'\'']\.\.*/\.\.*/\.\.*/hooks/|from "@hooks/|g' "$file"
    sed -i '' 's|from ["'\'']\.\.*/\.\.*/\.\.*/\.\.*/hooks/|from "@hooks/|g' "$file"

    # Update objects imports
    sed -i '' 's|from ["'\'']\.\.*/objects/|from "@objects/|g' "$file"
    sed -i '' 's|from ["'\'']\.\.*/\.\.*/objects/|from "@objects/|g' "$file"
    sed -i '' 's|from ["'\'']\.\.*/\.\.*/\.\.*/objects/|from "@objects/|g' "$file"
    sed -i '' 's|from ["'\'']\.\.*/\.\.*/\.\.*/\.\.*/objects/|from "@objects/|g' "$file"

    # Update services imports
    sed -i '' 's|from ["'\'']\.\.*/services/|from "@services/|g' "$file"
    sed -i '' 's|from ["'\'']\.\.*/\.\.*/services/|from "@services/|g' "$file"
    sed -i '' 's|from ["'\'']\.\.*/\.\.*/\.\.*/services/|from "@services/|g' "$file"

    # Update styles imports
    sed -i '' 's|from ["'\'']\.\.*/styles/|from "@styles/|g' "$file"
    sed -i '' 's|from ["'\'']\.\.*/\.\.*/styles/|from "@styles/|g' "$file"
    sed -i '' 's|from ["'\'']\.\.*/\.\.*/\.\.*/styles/|from "@styles/|g' "$file"
    sed -i '' 's|from ["'\'']\.\.*/\.\.*/\.\.*/\.\.*/styles/|from "@styles/|g' "$file"

    # Update types imports
    sed -i '' 's|from ["'\'']\.\.*/types/|from "@types/|g' "$file"
    sed -i '' 's|from ["'\'']\.\.*/\.\.*/types/|from "@types/|g' "$file"
    sed -i '' 's|from ["'\'']\.\.*/\.\.*/\.\.*/types/|from "@types/|g' "$file"

    # Update asset requires
    sed -i '' 's|require(["'\'']\.\.*/assets/|require("@assets/|g' "$file"
    sed -i '' 's|require(["'\'']\.\.*/\.\.*/assets/|require("@assets/|g' "$file"
    sed -i '' 's|require(["'\'']\.\.*/\.\.*/\.\.*/assets/|require("@assets/|g' "$file"
  done
}

# Update src directory
if [ -d "$SRC_DIR" ]; then
  echo "📁 Updating imports in src/..."
  update_imports "$SRC_DIR"
else
  echo "⚠️  src/ directory not found"
fi

# Update tests directory
if [ -d "$TESTS_DIR" ]; then
  echo "📁 Updating imports in tests/..."
  update_imports "$TESTS_DIR"
else
  echo "⚠️  tests/ directory not found"
fi

echo "✅ Import updates complete!"
