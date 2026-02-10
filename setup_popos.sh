#!/bin/bash
# YSS Video Creator - Pop!_OS Setup Script
# This script sets up the project for Pop!_OS 22.04 LTS

set -e

echo "=========================================="
echo "YSS Video Creator - Pop!_OS Setup"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check if running on Pop!_OS or Ubuntu-based distro
echo "Checking system compatibility..."
if [[ -f /etc/os-release ]]; then
    OS_NAME=$(grep '^NAME=' /etc/os-release | cut -d'"' -f2)
    OS_VERSION=$(grep '^VERSION_ID=' /etc/os-release | cut -d'"' -f2)
    print_status "Detected OS: $OS_NAME $OS_VERSION"
else
    print_warning "Could not detect OS version, continuing anyway..."
fi

# Update system
echo ""
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Python and pip
echo ""
echo "Installing Python 3.11+..."
sudo apt install -y python3 python3-pip python3-venv python3-dev

# Check Python version
PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
print_status "Python version: $PYTHON_VERSION"

# Install Node.js 18+
echo ""
echo "Installing Node.js 18+..."
# Add NodeSource repository
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
    print_status "Node.js installed"
else
    NODE_VERSION=$(node --version)
    print_status "Node.js already installed: $NODE_VERSION"
fi

# Install FFmpeg
echo ""
echo "Installing FFmpeg..."
sudo apt install -y ffmpeg
ffmpeg -version | head -n1

# Install NVIDIA drivers if not already installed
echo ""
echo "Checking NVIDIA drivers..."
if command -v nvidia-smi &> /dev/null; then
    nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits
    print_status "NVIDIA drivers detected"
else
    print_warning "NVIDIA drivers not detected. Install with: sudo ubuntu-drivers install nvidia-driver-535"
    print_warning "Or download from: https://www.nvidia.com/Download/index.aspx"
fi

# Install Ollama
echo ""
echo "Installing Ollama..."
if ! command -v ollama &> /dev/null; then
    curl -fsSL https://ollama.ai/install.sh | sh
    print_status "Ollama installed"
    # Start Ollama service
    sudo systemctl start ollama || sudo systemctl enable ollama || print_warning "Could not start Ollama service automatically"
else
    print_status "Ollama already installed"
fi

# Create Python virtual environment
echo ""
echo "Setting up Python virtual environment..."
cd backend
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies in venv
echo ""
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# For AppImage compatibility, also install Python dependencies system-wide
# This allows the bundled Python to work on systems without matching venv
echo ""
echo "Installing Python dependencies for AppImage..."
echo "Note: Using --break-system-packages flag due to PEP 668"
pip install -r requirements.txt --break-system-packages --user

# Install PyTorch with CUDA support (if GPU available)
echo ""
echo "Installing PyTorch with CUDA support..."
if command -v nvidia-smi &> /dev/null; then
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
    print_status "PyTorch with CUDA installed"
else
    pip install torch torchvision torchaudio
    print_warning "PyTorch CPU version installed (no NVIDIA GPU detected)"
fi

# Return to project root
cd ..

# Install frontend dependencies
echo ""
echo "Installing frontend dependencies..."
cd frontend
npm install

# Return to project root
cd ..

# Create necessary directories
echo ""
echo "Creating project directories..."
mkdir -p output
mkdir -p assets/audio
mkdir -p assets/video
mkdir -p models
mkdir -p projects
mkdir -p logs

# Create environment file
echo ""
echo "Creating environment configuration..."
cat > .env << EOF
# YSS Video Creator Environment Variables
API_HOST=127.0.0.1
API_PORT=8000
FRONTEND_PORT=3000
OLLAMA_HOST=http://localhost:11434
EOF

print_status "Environment file created: .env"

# Create startup script
echo ""
echo "Creating startup scripts..."

# Backend startup script
cat > start-backend.sh << EOF
#!/bin/bash
cd backend
source venv/bin/activate
python -m src.main
EOF
chmod +x start-backend.sh

# Frontend startup script
cat > start-frontend.sh << EOF
#!/bin/bash
cd frontend
npm run dev
EOF
chmod +x start-frontend.sh

# Combined startup script
cat > start.sh << EOF
#!/bin/bash
# Start both backend and frontend
echo "Starting YSS Video Creator..."

# Start backend in background
cd backend
source venv/bin/activate
python -m src.main &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
cd ../frontend
npm run dev &
FRONTEND_PID=$echo "=========================================="
echo "YSS Video Creator - Pop!_OS Setup"
echo "=========================================="

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check if running on Pop!_OS or Ubuntu-based distro
echo "Checking system compatibility..."
if [[ -f /etc/os-release ]]; then
    OS_NAME=$(grep '^NAME=' /etc/os-release | cut -d'"' -f2)
    OS_VERSION=$(grep '^VERSION_ID=' /etc/os-release | cut -d'"' -f2)
    print_status "Detected OS: $OS_NAME $OS_VERSION"
else
    print_warning "Could not detect OS version, continuing anyway..."
fi

# Update system
echo ""
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Python and pip
echo ""
echo "Installing Python 3.11+..."
sudo apt install -y python3 python3-pip python3-venv python3-dev

# Check Python version
PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
print_status "Python version: $PYTHON_VERSION"

# Install Node.js 18+
echo ""
echo "Installing Node.js 18+..."
# Add NodeSource repository
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
    print_status "Node.js installed"
else
    NODE_VERSION=$(node --version)
    print_status "Node.js already installed: $NODE_VERSION"
fi

# Install FFmpeg
echo ""
echo "Installing FFmpeg..."
sudo apt install -y ffmpeg
ffmpeg -version | head -n1

# Install NVIDIA drivers if not already installed
echo ""
echo "Checking NVIDIA drivers..."
if command -v nvidia-smi &> /dev/null; then
    nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits
    print_status "NVIDIA drivers detected"
else
    print_warning "NVIDIA drivers not detected. Install with: sudo ubuntu-drivers install nvidia-driver-535"
    print_warning "Or download from: https://www.nvidia.com/Download/index.aspx"
fi

# Install Ollama
echo ""
echo "Installing Ollama..."
if ! command -v ollama &> /dev/null; then
    curl -fsSL https://ollama.ai/install.sh | sh
    print_status "Ollama installed"
    # Start Ollama service
    sudo systemctl start ollama || sudo systemctl enable ollama || print_warning "Could not start Ollama service automatically"
else
    print_status "Ollama already installed"
fi

# Create Python virtual environment
echo ""
echo "Setting up Python virtual environment..."
cd backend
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
echo ""
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Install PyTorch with CUDA support (if GPU available)
echo ""
echo "Installing PyTorch with CUDA support..."
if command -v nvidia-smi &> /dev/null; then
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
    print_status "PyTorch with CUDA installed"
else
    pip install torch torchvision torchaudio
    print_warning "PyTorch CPU version installed (no NVIDIA GPU detected)"
fi

# Return to project root
cd ..

# Install frontend dependencies
echo ""
echo "Installing frontend dependencies..."
cd frontend
npm install

# Return to project root
cd ..

# Create necessary directories
echo ""
echo "Creating project directories..."
mkdir -p output
mkdir -p assets/audio
mkdir -p assets/video
mkdir -p models
mkdir -p projects
mkdir -p logs

# Create environment file
echo ""
echo "Creating environment configuration..."
cat > .env << EOF
# YSS Video Creator Environment Variables
API_HOST=127.0.0.1
API_PORT=8000
FRONTEND_PORT=3000
OLLAMA_HOST=http://localhost:11434
EOF

print_status "Environment file created: .env"

# Create startup script
echo ""
echo "Creating startup scripts..."

# Backend startup script
cat > start-backend.sh << EOF
#!/bin/bash
cd backend
source venv/bin/activate
python -m src.main
EOF
chmod +x start-backend.sh

# Frontend startup script
cat > start-frontend.sh << EOF
#!/bin/bash
cd frontend
npm run dev
EOF
chmod +x start-frontend.sh

# Combined startup script
cat > start.sh << EOF
#!/bin/bash
# Start both backend and frontend
echo "Starting YSS Video Creator..."

# Start backend in background
cd backend
source venv/bin/activate
python -m src.main &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "YSS Video Creator is running!"
echo "Frontend: http://localhost:3000"
echo "Backend API: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for user interrupt
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
EOF
chmod +x start.sh

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "To start the application:"
echo "  1. Make sure Ollama is running: ollama serve"
echo "  2. Start backend: ./start-backend.sh"
echo "  3. Start frontend: ./start-frontend.sh"
echo ""
echo "Or use the combined script: ./start.sh"
echo ""
echo "Access the application at: http://localhost:3000"
echo ""
print_warning "Don't forget to pull a model for Ollama:"
echo "  ollama pull llama3.1:8b-q4_K_M"
echo ""
