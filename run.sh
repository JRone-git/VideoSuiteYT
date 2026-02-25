#!/bin/bash
# VideoSuiteYT - Optimized Launcher for Linux/macOS
# Usage: ./run.sh [--backend] [--frontend] [--dev]

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

status() { echo -e "${CYAN}[VideoSuiteYT]${NC} $1"; }
success() { echo -e "${GREEN}[VideoSuiteYT]${NC} $1"; }
error() { echo -e "${RED}[VideoSuiteYT]${NC} $1"; }

# Check prerequisites
check_prerequisites() {
    status "Checking prerequisites..."
    
    missing=()
    
    if ! command -v python3 &> /dev/null; then
        missing+=("Python 3.11+")
    fi
    
    if ! command -v node &> /dev/null; then
        missing+=("Node.js 18+")
    fi
    
    if ! command -v ffmpeg &> /dev/null; then
        missing+=("FFmpeg 6.0+")
    fi
    
    if [ ${#missing[@]} -gt 0 ]; then
        error "Missing prerequisites:"
        for item in "${missing[@]}"; do
            echo "  - $item"
        done
        exit 1
    fi
    
    success "All prerequisites found"
}

# Install dependencies
install_dependencies() {
    status "Installing dependencies..."
    
    # Python backend
    status "Setting up Python virtual environment..."
    cd "$BACKEND_DIR"
    
    if [ ! -d "venv" ]; then
        python3 -m venv venv
    fi
    
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    
    cd "$PROJECT_ROOT"
    
    # Node.js frontend
    status "Installing Node.js dependencies..."
    cd "$FRONTEND_DIR"
    npm install
    
    cd "$PROJECT_ROOT"
    
    success "Dependencies installed"
}

# Start backend server
start_backend() {
    status "Starting backend server..."
    
    cd "$BACKEND_DIR"
    
    if [ ! -d "venv" ]; then
        error "Virtual environment not found. Run with --install first."
        exit 1
    fi
    
    source venv/bin/activate
    python -m uvicorn src.main:app --host 127.0.0.1 --port 8000 --reload
}

# Start frontend development server
start_frontend() {
    status "Starting frontend development server..."
    
    cd "$FRONTEND_DIR"
    
    if [ ! -d "node_modules" ]; then
        error "Node modules not found. Run with --install first."
        exit 1
    fi
    
    npm run dev
}

# Start both in development mode
start_dev() {
    status "Starting in development mode..."
    
    # Start backend in background
    cd "$BACKEND_DIR"
    source venv/bin/activate
    python -m uvicorn src.main:app --host 127.0.0.1 --port 8000 --reload &
    BACKEND_PID=$!
    
    sleep 3
    
    # Start frontend
    cd "$FRONTEND_DIR"
    npm run dev &
    FRONTEND_PID=$!
    
    # Wait for either process to exit
    wait $BACKEND_PID $FRONTEND_PID
}

# Build production version
build_production() {
    status "Building for production..."
    
    cd "$FRONTEND_DIR"
    npm run build
    npm run electron:build
    
    success "Build complete"
}

# Main logic
case "${1:-}" in
    --install|-i)
        check_prerequisites
        install_dependencies
        ;;
    --backend|-b)
        start_backend
        ;;
    --frontend|-f)
        start_frontend
        ;;
    --dev|-d)
        check_prerequisites
        start_dev
        ;;
    --build)
        build_production
        ;;
    *)
        echo "VideoSuiteYT Launcher"
        echo ""
        echo "Usage:"
        echo "  ./run.sh --install     Install all dependencies"
        echo "  ./run.sh --backend     Start backend server only"
        echo "  ./run.sh --frontend    Start frontend dev server only"
        echo "  ./run.sh --dev         Start both in dev mode"
        echo "  ./run.sh --build       Build for production"
        ;;
esac