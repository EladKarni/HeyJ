#!/bin/bash

# Clear all Expo processes and related Metro bundlers

echo "🧹 Clearing all Expo and Metro processes..."

# Kill all expo-related processes
pkill -f "expo" 2>/dev/null || true
pkill -f "npx expo" 2>/dev/null || true
pkill -f "react-native" 2>/dev/null || true
pkill -f "metro" 2>/dev/null || true
pkill -f "node --inspect" 2>/dev/null || true

# Also kill any processes using common development ports
for port in 8081 8082 8083; do
  pkill -f ":$port" 2>/dev/null || true
done

# Wait a moment for processes to fully terminate
sleep 2

# Check if any processes are still running
remaining_processes=$(ps aux | grep -E "(expo|metro|node.*inspect)" | grep -v grep || wc -l)

if [ -n "$remaining_processes" ]; then
  echo "✅ All Expo and Metro processes cleared successfully!"
else
    echo "⚠️ Some processes may still be running. You might need to manually kill them."
fi

echo "📋 Expo and Metro cleanup complete!"