#!/usr/bin/env bash
set -e

echo "=================================================="
echo "🎬 CineMind AI Platform — Full-Stack Launcher"
echo "=================================================="

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 1. Load Environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    echo "🔑 Loading environment variables from .env..."
    export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
else
    echo "⚠️ .env file not found! Make sure GEMINI_API_KEY and GROQ_API_KEY are exported."
fi

# 2. Check Java version
echo "☕ Checking Java 21..."
java -version 2>&1 | head -n 1

# 3. Compile Backend
echo "🔨 Compiling ai-assistant-service..."
cd "$PROJECT_ROOT/ai-assistant-service"
mvn clean compile -q

echo ""
echo "✅ Compilation successful!"
echo ""
echo "To start the backend in this terminal:"
echo "   mvn spring-boot:run"
echo ""
echo "To start the frontend UI in a new terminal:"
echo "   cd ../ai-assistant-ui"
echo "   npm install && npm run dev"
echo ""
echo "=================================================="
