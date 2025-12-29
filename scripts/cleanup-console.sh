#!/bin/bash

# Console statement replacement utility
# Replaces common console patterns with AppLogger calls

echo "Starting console statement cleanup..."

# Define patterns and replacements
declare -A replacements=(
    ["console\.log("]="AppLogger.debug("
    ["console\.error("]="AppLogger.error("
    ["console\.warn("]="AppLogger.warn("
    ["console\.info("]="AppLogger.info("
)

# Function to add import if not present
add_app_logger_import() {
    local file="$1"
    if ! grep -q "import AppLogger" "$file"; then
        # Find the last import line
        local last_import=$(grep -n "^import" "$file" | tail -1 | cut -d: -f1)
        if [ -n "$last_import" ]; then
            sed -i "${last_import}a\\import AppLogger from \"@/utilities/AppLogger\";" "$file"
        fi
    fi
}

# Process each TypeScript/TSX file
find /home/light/projects/HeyJ/src -name "*.ts" -o -name "*.tsx" | while read -r file; do
    if grep -q "console\." "$file"; then
        echo "Processing: $file"
        
        # Add import if needed
        add_app_logger_import "$file"
        
        # Replace console statements
        sed -i 's/console\.log(/AppLogger.debug(/g' "$file"
        sed -i 's/console\.error(/AppLogger.error(/g' "$file"
        sed -i 's/console\.warn(/AppLogger.warn(/g' "$file"
        sed -i 's/console\.info(/AppLogger.info(/g' "$file"
    fi
done

echo "Console statement cleanup completed!"
echo "Remaining console statements:"
find /home/light/projects/HeyJ/src -name "*.ts" -o -name "*.tsx" | xargs grep -n "console\." | wc -l