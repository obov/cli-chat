#!/bin/bash

# Kill any existing processes on ports 3002 and 5173
lsof -ti:3002 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

echo "Starting development servers..."

# Start server in background
cd apps/server && bun run dev &
SERVER_PID=$!

# Wait for server to start
sleep 2

# Start web app in background
cd ../../apps/web && bun run dev &
WEB_PID=$!

echo ""
echo "🚀 Development servers started:"
echo "   Server: http://localhost:3002"
echo "   Web:    http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for Ctrl+C
trap "kill $SERVER_PID $WEB_PID; exit" INT
wait