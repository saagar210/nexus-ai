#!/bin/bash
# Create a standalone Nexus AI.app that includes the backend

APP_NAME="Nexus AI"
APP_DIR="/Applications/${APP_NAME}.app"
NEXUS_DIR="/Users/d/NEXUS"

echo "🚀 Creating standalone Nexus AI app..."

# Create the app bundle structure
mkdir -p "${APP_DIR}/Contents/MacOS"
mkdir -p "${APP_DIR}/Contents/Resources"

# Copy the icon
cp "${NEXUS_DIR}/frontend/src-tauri/icons/icon.icns" "${APP_DIR}/Contents/Resources/AppIcon.icns" 2>/dev/null || true

# Create Info.plist
cat > "${APP_DIR}/Contents/Info.plist" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>NexusAI</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundleIdentifier</key>
    <string>com.nexus.ai</string>
    <key>CFBundleName</key>
    <string>Nexus AI</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.15</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
PLIST

# Create the launcher script
cat > "${APP_DIR}/Contents/MacOS/NexusAI" << 'LAUNCHER'
#!/bin/bash

NEXUS_DIR="/Users/d/NEXUS"
LOG_DIR="$HOME/.nexus-ai/logs"
mkdir -p "$LOG_DIR"

# Function to cleanup on exit
cleanup() {
    echo "Shutting down Nexus AI..."
    # Kill backend if we started it
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    # Kill any processes on our ports
    lsof -ti:8420 | xargs kill -9 2>/dev/null
    lsof -ti:5173 | xargs kill -9 2>/dev/null
}
trap cleanup EXIT

# Check if Ollama is running
if ! pgrep -x "ollama" > /dev/null; then
    echo "Starting Ollama..."
    open -a Ollama
    sleep 3
fi

# Check if backend is already running
if curl -s http://localhost:8420/ > /dev/null 2>&1; then
    echo "Backend already running"
else
    echo "Starting backend..."
    cd "$NEXUS_DIR/backend"
    source venv/bin/activate
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8420 > "$LOG_DIR/backend.log" 2>&1 &
    BACKEND_PID=$!

    # Wait for backend to be ready
    for i in {1..30}; do
        if curl -s http://localhost:8420/ > /dev/null 2>&1; then
            echo "Backend ready!"
            break
        fi
        sleep 1
    done
fi

# Open the web UI in default browser
open "http://localhost:5173"

# Start the frontend dev server (or use built version)
cd "$NEXUS_DIR/frontend"
if [ -d "dist" ]; then
    # Use a simple HTTP server for the built version
    python3 -m http.server 5173 --directory dist > "$LOG_DIR/frontend.log" 2>&1 &
else
    # Use vite dev server
    npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
fi

# Keep the app running
echo "Nexus AI is running!"
echo "Frontend: http://localhost:5173"
echo "Backend: http://localhost:8420"

# Wait and keep alive (show a simple dialog)
osascript -e 'display dialog "Nexus AI is running!\n\nFrontend: http://localhost:5173\nBackend: http://localhost:8420\n\nClick OK to stop the servers." buttons {"OK"} default button "OK" with title "Nexus AI" with icon note'

LAUNCHER

chmod +x "${APP_DIR}/Contents/MacOS/NexusAI"

echo "✅ Nexus AI.app created in /Applications"
echo ""
echo "To launch: Open 'Nexus AI' from your Applications folder or Spotlight"
echo ""
echo "The app will:"
echo "  1. Start Ollama if not running"
echo "  2. Start the Python backend"
echo "  3. Start the frontend"
echo "  4. Open your browser to http://localhost:5173"
