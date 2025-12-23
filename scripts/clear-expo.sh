#!/bin/bash

echo "🧹 Clearing all Expo and Metro processes..."

# Kill all processes related to expo and metro
pkill -f "expo" 2>/dev/null || true
pkill -f "metro" 2>/dev/null || true
pkill -f "node.*8081" 2>/dev/null || true
pkill -f "node.*8082" 2>/dev/null || true
pkill -f "node.*8083" 2>/dev/null || true

# Wait a moment for processes to fully terminate
sleep 2

# Check if any processes are still running
remaining=$(ps aux | grep -E "(expo|metro)" | grep -v grep | wc -l)

if [ "$remaining" -eq 0 ]; then
    echo "✅ All Expo and Metro processes cleared successfully!"
else
    echo "⚠️ Some processes may still be running:"
    ps aux | grep -E "(expo|metro)" | grep -v grep
fi