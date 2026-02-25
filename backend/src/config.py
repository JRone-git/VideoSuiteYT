#!/usr/bin/env python3
"""
Centralized Configuration for YSS Video Creator
"""

import os
from pathlib import Path
from typing import Optional
from pydantic import BaseModel
import yaml

# Base paths
BASE_DIR = Path(__file__).parent.parent.parent
MODELS_DIR = BASE_DIR / "models"
PROJECTS_DIR = BASE_DIR / "models" / ".." / "projects"
OUTPUT_DIR = BASE_DIR / "output"

class GPUConfig(BaseModel):
    """GPU configuration"""
    enabled: bool = True
    vram_total_gb: float = 12.0  # RTX 3060
    vram_target_gb: float = 10.0  # Leave 2GB headroom
    fallback_to_cpu: bool = True
    
class OllamaConfig(BaseModel):
    """Ollama configuration"""
    base_url: str = "http://localhost:11434"
    default_model: str = "llama3.1:8b-q4_K_M"
    context_size: int = 4096
    temperature: float = 0.7
    max_tokens: int = 2048

class TTSConfig(BaseModel):
    """TTS configuration"""
    engine: str = "orpheus"  # or "openvoice"
    default_voice: str = "default"
    sample_rate: int = 22050
    speed: float = 1.0
    
class WhisperConfig(BaseModel):
    """Whisper configuration"""
    model_size: str = "small"  # tiny, base, small, medium, large
    language: Optional[str] = None  # Auto-detect
    use_gpu: bool = True
    
class VideoConfig(BaseModel):
    """Video export configuration"""
    resolution: str = "1080x1920"
    fps: int = 30
    bitrate: str = "8M"
    codec: str = "h264"
    preset: str = "fast"  # ultrafast, fast, medium, slow
    
class AppConfig(BaseModel):
    """Main application configuration"""
    gpu: GPUConfig = GPUConfig()
    ollama: OllamaConfig = OllamaConfig()
    tts: TTSConfig = TTSConfig()
    whisper: WhisperConfig = WhisperConfig()
    video: VideoConfig = VideoConfig()
    
    # Server settings
    host: str = "127.0.0.1"
    port: int = 8000
    debug: bool = False
    
    # Paths
    models_dir: str = str(MODELS_DIR)
    projects_dir: str = str(PROJECTS_DIR)
    output_dir: str = str(OUTPUT_DIR)
    
    @classmethod
    def load(cls, config_path: Optional[Path] = None) -> "AppConfig":
        """Load configuration from YAML file"""
        if config_path is None:
            config_path = BASE_DIR / "config" / "settings.yaml"
        
        if config_path.exists():
            with open(config_path, "r") as f:
                data = yaml.safe_load(f) or {}
            return cls(**data)
        return cls()
    
    def save(self, config_path: Optional[Path] = None):
        """Save configuration to YAML file"""
        if config_path is None:
            config_path = BASE_DIR / "config" / "settings.yaml"
        
        config_path.parent.mkdir(parents=True, exist_ok=True)
        with open(config_path, "w") as f:
            yaml.dump(self.model_dump(), f, default_flow_style=False)

# Global config instance
config = AppConfig.load()