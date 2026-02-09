#!/usr/bin/env python3
"""
Audio Pipeline for Local TTS and Audio Processing
Handles voice generation, ducking, and audio mixing
"""

import os
import logging
import asyncio
from typing import Optional, List, Dict, Any
import numpy as np
import soundfile as sf
import subprocess
import json

logger = logging.getLogger("audio-pipeline")

class AudioPipeline:
    def __init__(self, audio_dir: str = "assets/audio"):
        self.audio_dir = audio_dir
        self.oscillators = {}  # For Orpheus TTS
        self.setup_directories()
        
    def setup_directories(self):
        """Create necessary audio directories"""
        os.makedirs(self.audio_dir, exist_ok=True)
        os.makedirs("assets/audio/voices", exist_ok=True)
        
    async def generate_voiceover(self, request) -> str:
        """Generate voiceover audio from text using local TTS"""
        try:
            # Generate output filename
            output_path = os.path.join(
                self.audio_dir,
                f"voiceover_{abs(hash(request.text)) % 10000}.wav"
            )
            
            # For MVP, use simple text-to-speech approach
            # In production, this would use Orpheus TTS via Ollama
            if request.voice_settings.voice_type == "preset":
                audio_path = await self._generate_preset_voice(request.text, output_path, request.voice_settings)
            else:  # custom voice
                audio_path = await self._generate_custom_voice(request.text, output_path, request.voice_settings)
            
            # Normalize loudness to -16 LUFS for voiceover
            normalized_path = await self._normalize_loudness(audio_path, -16)
            
            return normalized_path
    
        except Exception as e:
            logger.error(f"Voiceover generation failed: {str(e)}")
            raise
    
    async def _generate_preset_voice(self, text: str, output_path: str, settings) -> str:
        """Generate voice using preset voices (Orpheus TTS via Ollama)"""
        try:
            # This would be replaced with actual Orpheus TTS implementation
            # For now, create a silent placeholder
            logger.warning("Using placeholder audio - implement Orpheus TTS for real voiceover")
            
            # Create silent placeholder
            sample_rate = 22050
            duration = max(1, len(text.split()) / 150 * settings.speed)
            audio_data = np.zeros(int(sample_rate * duration), dtype=np.float32)
            
            sf.write(output_path, audio_data, sample_rate)
            return output_path
            
        except Exception as e:
            logger.error(f"Failed to generate preset voice: {str(e)}")
            raise
    
    async def _generate_custom_voice(self, text: str, output_path: str, settings) -> str:
        """Generate voice using custom voice cloning (OpenVoice)"""
        try:
            # Check if reference audio exists
            if not settings.reference_audio_path or not os.path.exists(settings.reference_audio_path):
                raise ValueError("Custom voice requires reference audio file (10-60s)")
            
            # This would be replaced with actual OpenVoice implementation
            logger.warning("Using placeholder audio for custom voice - implement OpenVoice for real cloning")
            
            # Create silent placeholder
            sample_rate = 22050
            duration = max(1, len(text.split()) / 150 * settings.speed)
            audio_data = np.zeros(int(sample_rate * duration), dtype=np.float32)
            
            sf.write(output_path, audio_data, sample_rate)
            return output_path
            
        except Exception as e:
            logger.error(f"Failed to generate custom voice: {str(e)}")
            raise
    
    async def _normalize_loudness(self, audio_path: str, target_lufs: float) -> str:
        """Normalize audio loudness using FFmpeg"""
        try:
            output_path = audio_path.replace(".wav", "_normalized.wav")
            
            # Use FFmpeg for loudness normalization
            cmd = [
                "ffmpeg", "-y", "-i", audio_path,
                "-af", f"loudnorm=I={target_lufs}:TP=-1.5:LRA=11:print_format=json",
                "-af", "volume=1.0",
                output_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                # Parse loudnorm metadata to get actual gain
                try:
                    # Extract loudnorm JSON output
                    loudnorm_output = result.stderr
                    if "input_i" in loudnorm_output:
                        # Apply actual gain
                        cmd2 = [
                            "ffmpeg", "-y", "-i", audio_path,
                            "-af", "volume=1.0",  # Simplified - would use actual measured gain
                            output_path
                        ]
                        subprocess.run(cmd2, capture_output=True, text=True)
                except:
                    pass
                
                return output_path
            else:
                # Fallback: simple volume normalization
                cmd_fallback = [
                    "ffmpeg", "-y", "-i", audio_path,
                    "-af", "volume=1.0",
                    output_path
                ]
                subprocess.run(cmd_fallback, capture_output=True, text=True)
                return output_path
                
        except Exception as e:
            logger.error(f"Normalization failed: {str(e)}")
            # Return original path if normalization fails
            return audio_path
    
    def apply_auto_ducking(self, voice_path: str, music_path: str, output_path: str) -> str:
        """Apply auto-ducking to mix voiceover and background music"""
        try:
            # Get audio durations
            voice_duration = self._get_audio_duration(voice_path)
            music_duration = self._get_audio_duration(music_path)
            
            # Ensure music loops to match voice duration
            loop_music = f"loop=loop=-1:size={int(voice_duration * 44100)}"
            
            # FFmpeg command for auto-ducking
            cmd = [
                "ffmpeg", "-y",
                "-i", voice_path,
                "-i", music_path,
                "-filter_complex",
                f"[1:a]{loop_music}[music];"
                "[0:a][music]sidechaincompress=threshold=0.01:ratio=6:attack=200:release=2000:makeup=1dB[ducked]",
                "-map", "[ducked]",
                "-map", "0:a",
                "-c:a", "aac",
                "-b:a", "192k",
                "-t", str(voice_duration),
                output_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                logger.info(f"Audio ducking successful: {output_path}")
                return output_path
            else:
                # Fallback: simple mix
                fallback_cmd = [
                    "ffmpeg", "-y",
                    "-i", voice_path,
                    "-i", music_path,
                    "-filter_complex",
                    f"[1:a]{loop_music}[music];"
                    "[0:a][music]amix=inputs=2:duration=first:dropout_transition=0",
                    "-c:a", "aac",
                    "-b:a", "192k",
                    output_path
                ]
                subprocess.run(fallback_cmd, capture_output=True, text=True)
                return output_path
                
        except Exception as e:
            logger.error(f"Auto ducking failed: {str(e)}")
            raise
    
    def _get_audio_duration(self, audio_path: str) -> float:
        """Get audio duration in seconds using FFprobe"""
        try:
            cmd = [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                audio_path
            ]
            result = subprocess.run(cmd, capture_output=True, text=True)
            return float(result.stdout.strip())
        except Exception as e:
            logger.error(f"Failed to get audio duration: {str(e)}")
            return 60.0  # Default 60 seconds
    
    async def create_background_music(self, mood: str, duration: float) -> str:
        """Generate background music based on mood"""
        try:
            output_path = os.path.join(
                self.audio_dir,
                f"background_{mood}_{abs(hash(mood)) % 10000}.mp3"
            )
            
            # This would use a music generation model in production
            logger.warning("Using placeholder background music - implement music generation for real audio")
            
            # Create silent placeholder
            sample_rate = 44100
            audio_data = np.zeros(int(sample_rate * duration), dtype=np.float32)
            
            sf.write(output_path, audio_data, sample_rate)
            return output_path
            
        except Exception as e:
            logger.error(f"Background music generation failed: {str(e)}")
            raise

# Example usage
async def test_audio_pipeline():
    """Test the audio pipeline"""
    pipeline = AudioPipeline()
    
    # Test voiceover generation
    from types import SimpleNamespace
    voice_settings = SimpleNamespace(
        voice_type="preset",
        voice_id="default",
        reference_audio_path=None,
        speed=1.0,
        pitch=1.0
    )
    
    request = SimpleNamespace(
        text="Welcome to this amazing video! Today we're going to talk about something really interesting.",
        voice_settings=voice_settings
    )
    
    try:
        result = await pipeline.generate_voiceover(request)
        print(f"Generated voiceover: {result