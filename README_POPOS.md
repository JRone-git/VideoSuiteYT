# YSS Video Creator - Pop!_OS Setup Guide

## Quick Start

### Prerequisites Installation

1. **Install FFmpeg** (if not already installed):
```bash
sudo apt update
sudo apt install -y ffmpeg
```

2. **Install Ollama** (for local AI):
```bash
curl -fsSL https://ollama.ai/install.sh | sh
sudo systemctl start ollama
```

3. **Pull a language model**:
```bash
ollama pull llama3.1:8b-q4_K_M
```

### Project Setup

1. **Set up Python environment**:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

2. **Install frontend dependencies**:
```bash
cd ../frontend
npm install
```

3. **Create required directories**:
```bash
mkdir -p output assets/audio assets/video models projects logs
```

## Running the Application

### Terminal 1 - Start Backend:
```bash
cd backend
source venv/bin/activate
python -m src.main
```

### Terminal 2 - Start Frontend:
```bash
cd frontend
npm run dev
```

### Access the Application:
- Open browser: http://localhost:3000
- API: http://localhost:8000

## Directory Structure
```
YTVideoSuite/
├── backend/
│   ├── src/           # Python backend code
│   ├── venv/          # Python virtual environment
│   └── requirements.txt
├── frontend/
│   ├── src/           # React frontend code
│   └── package.json
├── output/            # Generated videos
├── assets/            # Audio/video assets
├── models/            # AI models
├── projects/           # Project files
└── logs/              # Application logs
```

## Troubleshooting

### FFmpeg not found:
```bash
sudo apt install ffmpeg
```

### Ollama not responding:
```bash
sudo systemctl status ollama
sudo systemctl start ollama
```

### GPU not detected:
```bash
nvidia-smi
# If not working, install NVIDIA drivers:
sudo ubuntu-drivers install nvidia-driver-535
```

### Port already in use:
```bash
# Find process using port 8000 or 3000
lsof -i :8000
lsof -i :3000
```
