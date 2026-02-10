#!/bin/bash
# Build script for Pulse Studio - Hybrid Approach
# Bundles Python runtime but requires Ollama/PyTorch installed separately
# This results in a much smaller download (~100MB)

set -e

echo "=== Pulse Studio Standalone Build (Hybrid Approach) ==="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Navigate to project root
cd "$(dirname "$0")"

echo -e "${YELLOW}Step 1: Installing PyInstaller...${NC}"
pip install pyinstaller --break-system-packages -q 2>/dev/null || pip install pyinstaller -q

echo -e "${YELLOW}Step 2: Building Python backend executable (excluding PyTorch)...${NC}"
cd backend

# Clean previous builds
rm -rf dist build *.spec

# Build with PyInstaller - EXCLUDE PyTorch and other large ML libs
# Users will need to have PyTorch/Ollama installed separately
pyinstaller \
    --name pulse-backend \
    --onedir \
    --windowed \
    --clean \
    --noconfirm \
    --hidden-import uvicorn \
    --hidden-import uvicorn.loops \
    --hidden-import uvicorn.protocols \
    --hidden-import uvicorn.protocols.http \
    --hidden-import fastapi \
    --hidden-import fastapi.middleware \
    --hidden-import fastapi.middleware.cors \
    --hidden-import pydantic \
    --hidden-import aiohttp \
    --hidden-import numpy \
    --hidden-import soundfile \
    --exclude-module torch \
    --exclude-module torchaudio \
    --exclude-module torchvision \
    --exclude-module tensorflow \
    --exclude-module transformers \
    --exclude-module accelerate \
    --exclude-module bitsandbytes \
    --exclude-module scipy \
    --exclude-module matplotlib \
    --exclude-module pandas \
    --exclude-module sympy \
    --exclude-module onnxruntime \
    --exclude-module faster_whisper \
    --collect-binaries soundfile \
    src/main.py

echo -e "${GREEN}Backend built successfully!${NC}"
echo "Output: backend/dist/pulse-backend/"

echo -e "${YELLOW}Step 3: Building Electron app...${NC}"
cd ../frontend

# Build the frontend
npm run build

echo -e "${GREEN}Frontend built successfully!${NC}"

echo -e "${YELLOW}Step 4: Copying backend to Electron resources...${NC}"
mkdir -p dist-electron/resources
cp -r ../backend/dist/pulse-backend dist-electron/resources/backend

echo -e "${GREEN}Backend copied to resources!${NC}"

echo -e "${YELLOW}Step 5: Building Electron installer...${NC}"

# Build for current platform
case "$(uname -s)" in
    Linux*)
        echo "Building for Linux..."
        npx electron-builder --linux
        echo -e "${GREEN}Linux AppImage built in frontend/dist-electron/!${NC}"
        ;;
    Darwin*)
        echo "Building for macOS..."
        npx electron-builder --mac
        echo -e "${GREEN}macOS DMG built in frontend/dist-electron/!${NC}"
        ;;
    CYGWIN*|MINGW*|MSYS*)
        echo "Building for Windows..."
        npx electron-builder --win
        echo -e "${GREEN}Windows installer built in frontend/dist-electron/!${NC}"
        ;;
    *)
        echo "Unknown platform, building AppImage..."
        npx electron-builder --linux
        ;;
esac

echo ""
echo -e "${GREEN}=== Build Complete! ===${NC}"
echo ""
echo "Output files:"
ls -la frontend/dist-electron/*.{AppImage,dmg,exe,zip} 2>/dev/null || echo "Check frontend/dist-electron/ for outputs"
echo ""
echo -e "${YELLOW}=== IMPORTANT: User Requirements ===${NC}"
echo ""
echo "Users will need to install:"
echo "  1. Ollama: https://ollama.com"
echo "  2. PyTorch: pip install torch torchaudio"
echo ""
echo "This keeps the app download small (~100MB) while still providing"
echo "a desktop UI experience."
