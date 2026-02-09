# YSS Video Creator

A desktop video creation tool for 30-60 second vertical shorts with fully local AI processing.

## Features

- **100% Local AI**: All processing runs locally via Ollama - zero cloud dependencies
- **Vertical Shorts**: Optimized for YouTube Shorts, TikTok, Instagram Reels
- **Cross-Platform**: Works on Windows 11 and Pop!_OS 22.04 LTS
- **VRAM Optimized**: Designed for RTX 3060 (12GB) with graceful degradation
- **Offline-First**: Works completely air-gapped after initial setup

## Architecture

```
┌──────────────────────────────────────┐
│        Electron Frontend             │
│    (React + Vite, cross-platform)   │
└───────────────┬──────────────────────┘
                │ HTTP / IPC
┌───────────────▼──────────────────────┐
│        Python Backend                │
│  ┌──────────┐ ┌──────────┐ ┌──────┐ │
│  │ Ollama   │ │ Audio    │ │Video │ │
│  │ Client   │ │ Pipeline │ │Engine│ │
│  └──────────┘ └──────────┘ └──────┘ │
└──────────────────────────────────────┘
```

## Quick Start (Windows 11)

### Prerequisites
- NVIDIA GPU (RTX 3060 or better recommended)
- Python 3.11+
- Node.js 18+
- NVIDIA Drivers 535+

### Installation

```powershell
# Run the setup script
.\setup.ps1

# Start backend server
cd backend
python -m src.main

# Start frontend (in new terminal)
cd frontend
npm run dev
```

## Technical Stack

- **Frontend**: Electron + React + Vite
- **Backend**: Python 3.11, FastAPI, PyTorch
- **AI**: Ollama (local LLM), Whisper, OpenVoice
- **Video**: FFmpeg 6.0+
- **State**: SQLite, YAML manifests

## Project Structure

```
yss-video-creator/
├── backend/              # Python FastAPI server
│   ├── src/
│   │   ├── main.py      # API endpoints
│   │   ├── ollama_client.py
│   │   ├── audio_pipeline.py
│   │   ├── video_engine.py
│   │   └── whisper_service.py
│   └── requirements.txt
├── frontend/            # Electron app
│   ├── src/
│   │   ├── main.ts      # Electron main process
│   │   ├── renderer.tsx # React UI
│   │   └── styles.css
│   └── package.json
├── models/              # Local AI models
├── projects/            # User projects
└── README.md
```

## Performance Targets

| Operation | Target | VRAM Usage |
|-----------|--------|------------|
| LLM inference | 20 tok/s | 6-8GB |
| TTS (30s audio) | <10s | 3GB |
| STT transcription | 0.5× realtime | 2GB |
| Video export | <3 min | 1GB |

## Acceptance Criteria

- [x] Install on fresh Windows 11 PC: 15 minutes to first render
- [x] 60-second video export completes in under 5 minutes on target hardware
- [x] Air-gapped operation: all features functional 24 hours after install with no network
- [x] OOM recovery: app suggests smaller model/context rather than crashing

## License

MIT License - See LICENSE file for details.