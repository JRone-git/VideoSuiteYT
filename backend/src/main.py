#!/usr/bin/env python3
"""
YSS Video Creator - Python Backend
Local AI video creation tool for vertical shorts
"""

import os
import sys
import asyncio
import logging
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import uvicorn

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("yss-backend")

# Initialize FastAPI app
app = FastAPI(
    title="YSS Video Creator API",
    description="Local AI video creation API for vertical shorts",
    version="0.1.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state
class AppState:
    def __init__(self):
        self.ollama_client = None
        self.audio_pipeline = None
        self.video_engine = None
        self.whisper_service = None
        self.is_gpu_available = False
        self.vram_available = 12  # GB (RTX 3060)
        self.current_vram_usage = 0
        
app.state = AppState()

# Pydantic models for API requests/responses
class ScriptGenerationRequest(BaseModel):
    topic: str
    target_duration_seconds: int = 45
    tone: str = "engaging"
    style: str = "conversational"
    model_name: str = "llama3.1:8b-q4_K_M"

class ScriptRefinementRequest(BaseModel):
    script: str
    target_duration_seconds: int
    adjustments: List[str] = []

class VoiceSettings(BaseModel):
    voice_type: str = "preset"  # "preset" or "custom"
    voice_id: str = "default"
    reference_audio_path: Optional[str] = None
    speed: float = 1.0
    pitch: float = 1.0

class AudioRequest(BaseModel):
    text: str
    voice_settings: VoiceSettings

class CaptionRequest(BaseModel):
    audio_path: str
    model_size: str = "small"
    language: Optional[str] = None
    use_gpu: bool = True

class ProjectSettings(BaseModel):
    platform: str = "youtube-shorts"
    resolution: str = "1080x1920"
    fps: int = 30
    bit_rate: str = "8M"

class VideoClip(BaseModel):
    path: str
    duration: float = 5.0
    start_time: float = 0.0

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "gpu_available": app.state.is_gpu_available,
        "vram_available": app.state.vram_available
    }

@app.post("/script/generate")
async def generate_script(request: ScriptGenerationRequest):
    """Generate a script from a topic using local LLM"""
    try:
        # Load the model if not already loaded
        if not app.state.ollama_client:
            from ollama_client import OllamaClient
            app.state.ollama_client = OllamaClient()
        
        # Generate script using local LLM
        result = await app.state.ollama_client.generate_script(request)
        
        return {
            "success": True,
            "script": result,
            "token_count": len(str(result).split()),
            "duration_estimate_seconds": request.target_duration_seconds
        }
    
    except Exception as e:
        logger.error(f"Script generation failed: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "recommendation": "Try using a smaller model or reducing context length"
        }

@app.post("/script/refine")
async def refine_script(request: ScriptRefinementRequest):
    """Refine an existing script based on adjustments"""
    try:
        # Load the model if not already loaded
        if not app.state.ollama_client:
            from ollama_client import OllamaClient
            app.state.ollama_client = OllamaClient()
        
        # Refine the script
        result = await app.state.ollama_client.refine_script(request)
        
        return {
            "success": True,
            "script": result,
            "token_count": len(str(result).split())
        }
    
    except Exception as e:
        logger.error(f"Script refinement failed: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

@app.post("/audio/generate")
async def generate_audio(request: AudioRequest, background_tasks: BackgroundTasks):
    """Generate voiceover audio from text using local TTS"""
    try:
        # Check VRAM usage
        if app.state.current_vram_usage > 8:
            logger.warning("VRAM usage high, unloading models if any")
            if app.state.ollama_client:
                app.state.ollama_client.unload_model()
        
        # Load audio pipeline if not already loaded
        if not app.state.audio_pipeline:
            from audio_pipeline import AudioPipeline
            app.state.audio_pipeline = AudioPipeline()
        
        # Generate voiceover
        audio_path = await app.state.audio_pipeline.generate_voiceover(request)
        
        return {
            "success": True,
            "audio_path": audio_path,
            "duration_seconds": len(request.text.split()) / 150 * request.voice_settings.speed
        }
    
    except Exception as e:
        logger.error(f"Audio generation failed: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "recommendation": "Try using preset voices instead of custom voice cloning"
        }

@app.post("/audio/ducking")
async def apply_audio_ducking(
    voice_path: str,
    music_path: str,
    output_path: str
):
    """Apply auto-ducking to mix voiceover and background music"""
    try:
        # Load audio pipeline if not already loaded
        if not app.state.audio_pipeline:
            from audio_pipeline import AudioPipeline
            app.state.audio_pipeline = AudioPipeline()
        
        # Apply ducking
        result_path = app.state.audio_pipeline.apply_auto_ducking(
            voice_path, 
            music_path, 
            output_path
        )
        
        return {
            "success": True,
            "output_path": result_path
        }
    
    except Exception as e:
        logger.error(f"Audio ducking failed: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

@app.post("/captions/generate")
async def generate_captions(request: CaptionRequest):
    """Generate captions from audio using local STT"""
    try:
        # Load Whisper service if not already loaded
        if not app.state.whisper_service:
            from whisper_service import WhisperService
            app.state.whisper_service = WhisperService()
        
        # Generate captions
        result = await app.state.whisper_service.transcribe(
            request.audio_path,
            model_size=request.model_size,
            language=request.language,
            use_gpu=request.use_gpu
        )
        
        return {
            "success": True,
            "captions": result["text"],
            "srt_content": result["srt"],
            "duration_seconds": result["duration"]
        }
    
    except Exception as e:
        logger.error(f"Caption generation failed: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "recommendation": "Try using CPU fallback or a smaller Whisper model"
        }

@app.post("/video/export")
async def export_video(
    settings: ProjectSettings,
    video_clips: List[VideoClip],
    audio_path: str,
    captions_path: Optional[str] = None
):
    """Export final video using FFmpeg"""
    try:
        # Load video engine if not already loaded
        if not app.state.video_engine:
            from video_engine import VideoEngine
            app.state.video_engine = VideoEngine()
        
        # Convert Pydantic models to dictionaries
        clips_dict = [clip.dict() for clip in video_clips]
        
        # Export video
        result_path = await app.state.video_engine.export_video(
            settings=settings,
            video_clips=clips_dict,
            audio_path=audio_path,
            captions_path=captions_path
        )
        
        return {
            "success": True,
            "video_path": result_path,
            "file_size_bytes": os.path.getsize(result_path)
        }
    
    except Exception as e:
        logger.error(f"Video export failed: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "recommendation": "Try reducing resolution or FPS settings"
        }

@app.post("/project/create")
async def create_project(
    project_name: str,
    directory: str
):
    """Create a new project"""
    try:
        # Create project directory
        project_path = os.path.join(directory, project_name)
        os.makedirs(project_path, exist_ok=True)
        
        # Create project manifest
        manifest = {
            "version": "1.0",
            "name": project_name,
            "created_at": str(asyncio.get_event_loop().time()),
            "last_modified": str(asyncio.get_event_loop().time()),
            "duration_seconds": 45,
            "target_platform": "youtube-shorts",
            "assets": {
                "scripts": [],
                "audio": [],
                "video": [],
                "captions": []
            },
            "ai_settings": {
                "llm_model": "llama3.1:8b-q4_K_M",
                "whisper_model": "small",
                "tts_engine": "orpheus",
                "voice_clone_enabled": False
            }
        }
        
        # Save manifest
        import yaml
        manifest_path = os.path.join(project_path, "project.yml")
        with open(manifest_path, 'w') as f:
            yaml.dump(manifest, f)
        
        return {
            "success": True,
            "project_path": project_path,
            "manifest_path": manifest_path
        }
    
    except Exception as e:
        logger.error(f"Project creation failed: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

@app.get("/models/list")
async def list_available_models():
    """List available local models from Ollama"""
    try:
        from ollama_client import OllamaClient
        client = OllamaClient()
        models = await client.list_models()
        
        return {
            "success": True,
            "models": models
        }
    
    except Exception as e:
        logger.error(f"Failed to list models: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

@app.get("/download/{filename}")
async def download_file(filename: str):
    """Download a file from the server"""
    try:
        # Search for file in various directories
        search_paths = [
            "output/",
            "assets/audio/",
            "assets/video/",
            "models/",
            "projects/"
        ]
        
        for path in search_paths:
            file_path = os.path.join(path, filename)
            if os.path.exists(file_path):
                return FileResponse(file_path, filename=filename)
        
        raise HTTPException(status_code=404, detail=f"File {filename} not found")
    
    except Exception as e:
        logger.error(f"Download failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.on_event("startup")
async def startup_event():
    """Initialize resources on startup"""
    try:
        # Check GPU availability
        app.state.is_gpu_available = check_gpu_availability()
        
        # Initialize logging directory
        os.makedirs("logs", exist_ok=True)
        
        # Check for essential tools
        check_ffmpeg()
        check_ollama()
        
        logger.info("YSS Video Creator backend started")
    
    except Exception as e:
        logger.error(f"Startup initialization failed: {str(e)}")

def check_gpu_availability():
    """Check if GPU is available and working"""
    try:
        # Check NVIDIA drivers
        import subprocess
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader,nounits"],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0:
            gpu_info = result.stdout.strip()
            gpu_name, vram = gpu_info.split(", ")
            vram_int = int(vram.strip())
            
            logger.info(f"GPU detected: {gpu_name}, VRAM: {vram_int} GB")
            return vram_int >= 12  # Minimum 12GB for RTX 3060
        
        return False
    
    except Exception as e:
        logger.warning(f"GPU check failed: {str(e)}")
        return False

def check_ffmpeg():
    """Check if FFmpeg is installed"""
    try:
        import subprocess
        result = subprocess.run(
            ["ffmpeg", "-version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0:
            logger.info("FFmpeg detected")
            return True
        else:
            logger.warning("FFmpeg not found or not working")
            return False
    
    except Exception as e:
        logger.warning(f"FFmpeg check failed: {str(e)}")
        return False

def check_ollama():
    """Check if Ollama is running"""
    try:
        import requests
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        
        if response.status_code == 200:
            logger.info("Ollama detected and running")
            return True
        else:
            logger.warning("Ollama not responding")
            return False
    
    except Exception as e:
        logger.warning(f"Ollama check failed: {str(e)}")
        return False

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=False,
        log_level="info"
    )