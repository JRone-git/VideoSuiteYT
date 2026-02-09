#!/usr/bin/env python3
"""
Whisper Service for Speech-to-Text Processing
Handles caption generation using local Whisper model
"""

import os
import logging
import asyncio
from typing import Optional, List, Dict, Any
from faster_whisper import WhisperModel
import subprocess

logger = logging.getLogger("whisper-service")

class WhisperService:
    def __init__(
        self,
        model_dir: str = "models/whisper",
        device: str = "cuda",
        compute_type: str = "float16"
    ):
        self.model_dir = model_dir
        self.device = "cuda" if self._check_gpu() else "cpu"
        self.compute_type = compute_type
        self.model = None
        self.model_name = "small"
        self.setup_directories()
        
    def _check_gpu(self) -> bool:
        """Check if GPU is available for Whisper"""
        try:
            import torch
            return torch.cuda.is_available()
        except ImportError:
            return False
            
    def setup_directories(self):
        """Create necessary directories"""
        os.makedirs(self.model_dir, exist_ok=True)
        
    async def transcribe(
        self, 
        audio_path: str, 
        model_size: str = "small",
        language: Optional[str] = None,
        use_gpu: bool = True
    ) -> Dict[str, Any]:
        """Transcribe audio to text with captions"""
        try:
            # Load model if not already loaded
            if not self.model or self.model_name != model_size:
                await self._load_model(model_size, use_gpu)
            
            # Transcribe audio
            segments, info = self.model.transcribe(
                audio_path,
                language=language,
                beam_size=5,
                vad_filter=True,
                vad_parameters=dict(min_silence_duration_ms=500)
            )
            
            # Collect segments
            full_text = ""
            segments_list = []
            
            for segment in segments:
                segment_text = segment.text.strip()
                full_text += segment_text + " "
                
                segments_list.append({
                    "start": segment.start,
                    "end": segment.end,
                    "text": segment_text
                })
            
            # Generate SRT format
            srt_content = self._segments_to_srt(segments_list)
            
            return {
                "text": full_text.strip(),
                "srt": srt_content,
                "segments": segments_list,
                "language": info.language,
                "language_probability": info.language_probability,
                "duration": info.duration
            }
            
        except Exception as e:
            logger.error(f"Transcription failed: {str(e)}")
            raise
    
    async def _load_model(self, model_size: str, use_gpu: bool):
        """Load Whisper model with memory management"""
        try:
            # Memory-aware model loading
            if use_gpu and self._check_gpu():
                try:
                    import torch
                    # Check VRAM availability
                    vram_available = torch.cuda.get_device_properties(0).total_memory / (1024**3)
                    
                    # Adjust model based on available VRAM
                    if vram_available < 6:
                        logger.warning("Low VRAM detected, using smaller model or CPU")
                        self.device = "cpu"
                    else:
                        self.device = "cuda"
                        self.compute_type = "float16"
                except Exception as e:
                    logger.warning(f"GPU check failed: {str(e)}, using CPU")
                    self.device = "cpu"
            else:
                self.device = "cpu"
                self.compute_type = "int8"  # Use quantized model for CPU
            
            logger.info(f"Loading Whisper {model_size} model on {self.device}")
            
            self.model = WhisperModel(
                model_size,
                device=self.device,
                compute_type=self.compute_type,
                download_root=self.model_dir
            )
            
            self.model_name = model_size
            logger.info(f"Whisper model loaded successfully on {self.device}")
            
        except Exception as e:
            logger.error(f"Failed to load Whisper model: {str(e)}")
            raise
    
    def _segments_to_srt(self, segments: List[Dict]) -> str:
        """Convert segments to SRT format"""
        srt_content = ""
        
        for i, segment in enumerate(segments, 1):
            start_time = self._format_timestamp(segment["start"])
            end_time = self._format_timestamp(segment["end"])
            text = segment["text"]
            
            srt_content += f"{i}\n"
            srt_content += f"{start_time} --> {end_time}\n"
            srt_content += f"{text}\n\n"
        
        return srt_content
    
    def _format_timestamp(self, seconds: float) -> str:
        """Format seconds to SRT timestamp format"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        ms = int((seconds % 1) * 1000)
        
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{ms:03d}"
    
    async def burn_captions(
        self, 
        video_path: str, 
        captions_path: str, 
        output_path: str,
        style: str = "minimal"
    ) -> str:
        """Burn captions into video"""
        try:
            # FFmpeg command for burning captions
            cmd = [
                "ffmpeg", "-y",
                "-i", video_path,
                "-vf", f"subtitles={captions_path}:force_style='Fontsize=24,PrimaryColour=&H00FFFF,Outline=1,Shadow=1,MarginV=100'",
                "-c:v", "h264",
                "-b:v", "8M",
                "-c:a", "copy",
                output_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                logger.info(f"Captions burned successfully: {output_path}")
                return output_path
            else:
                raise Exception(f"Caption burning failed: {result.stderr}")
                
        except Exception as e:
            logger.error(f"Caption burning failed: {str(e)}")
            raise
    
    async def detect_speaking_rate(self, audio_path: str) -> Dict[str, float]:
        """Detect speaking rate and speech patterns"""
        try:
            # Simple speaking rate estimation
            cmd = [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                audio_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            duration = float(result.stdout.strip())
            
            # Estimate word count (assume ~150 words/minute for normal speech)
            estimated_words = duration * 150 / 60
            
            return {
                "duration_seconds": duration,
                "estimated_words": estimated_words,
                "speaking_rate_wpm": estimated_words / (duration / 60) if duration > 0 else 0
            }
            
        except Exception as e:
            logger.error(f"Speaking rate detection failed: {str(e)}")
            return {"duration_seconds": 0, "estimated_words": 0, "speaking_rate_wpm": 0}

# Example usage
async def test_whisper_service():
    """Test the whisper service"""
    service = WhisperService()
    
    try:
        # Create test audio file
        test_audio = "test_audio.wav"
        import numpy as np
        import soundfile as sf
        
        # Generate 10 seconds of silent audio
        sample_rate = 16000
        duration = 10
        audio_data = np.zeros(int(sample_rate * duration), dtype=np.float32)
        sf.write(test_audio, audio_data, sample_rate)
        
        result = await service.transcribe(test_audio)