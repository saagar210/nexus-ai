#!/bin/bash

# Nexus AI - Start Script
# This script starts both the backend and frontend

echo "🚀 Starting Nexus AI..."

# Check if Ollama is running
if ! pgrep -x "ollama" > /dev/null; then
    echo "⚠️  Ollama is not running. Please start Ollama first."
    echo "   Run: ollama serve"
    exit 1
fi

# Start the backend
echo "📡 Starting backend server..."
cd "$(dirname "$0")/backend"
source venv/bin/activate 2>/dev/null || python3 -m venv venv && source venv/bin/activate
pip install -q -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8420 --reload &
BACKEND_PID=$!

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 3

# Start the frontend
echo "🎨 Starting frontend..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Nexus AI is running!"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:8420"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
