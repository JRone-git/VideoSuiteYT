#!/usr/bin/env python3
"""
Video Engine for FFmpeg-based Video Processing
Handles video composition, rendering, and export
"""

import os
import logging
import asyncio
import subprocess
from typing import Optional, List, Dict, Any
from datetime import datetime

logger = logging.getLogger("video-engine")

class VideoEngine:
    def __init__(
        self, 
        video_dir: str = "assets/video",
        output_dir: str = "output"
    ):
        self.video_dir = video_dir
        self.output_dir = output_dir
        self.setup_directories()
        
    def setup_directories(self):
        """Create necessary video directories"""
        os.makedirs(self.video_dir, exist_ok=True)
        os.makedirs(self.output_dir, exist_ok=True)
        
    async def export_video(self, settings, video_clips, audio_path, captions_path=None) -> str:
        """Export final video using FFmpeg with specified settings"""
        try:
            # Parse platform preset
            platform_presets = {
                "youtube-shorts": {
                    "resolution": "1080x1920",
                    "fps": 30,
                    "codec": "h.264",
                    "bitrate": "8M"
                },
                "tiktok": {
                    "resolution": "1080x1920", 
                    "fps": 30,
                    "codec": "h.264",
                    "bitrate": "8M"
                },
                "instagram-reels": {
                    "resolution": "1080x1920",
                    "fps": 30,
                    "codec": "h.264",
                    "bitrate": "8M"
                }
            }
            
            # Use provided settings or platform preset
            resolution = settings.resolution or platform_presets.get(settings.platform, {}).get("resolution", "1080x1920")
            fps = settings.fps or platform_presets.get(settings.platform, {}).get("fps", 30)
            codec = settings.codec or platform_presets.get(settings.platform, {}).get("codec", "h.264")
            bitrate = settings.bit_rate or platform_presets.get(settings.platform, {}).get("bitrate", "8M")
            
            # Create output filename
            output_filename = f"short_{datetime.now().strftime('%Y%m%d_%H%M%S')}.mp4"
            output_path = os.path.join(self.output_dir, output_filename)
            
            # Build FFmpeg command
            cmd = self._build_ffmpeg_command(
                resolution=resolution,
                fps=fps,
                codec=codec,
                bitrate=bitrate,
                video_clips=video_clips,
                audio_path=audio_path,
                captions_path=captions_path
            )
            
            # Execute FFmpeg
            logger.info(f"Exporting video: {cmd}")
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                logger.info(f"Video export successful: {output_path}")
                return output_path
            else:
                logger.error(f"FFmpeg error: {result.stderr}")
                raise Exception(f"FFmpeg failed: {result.stderr}")
                
        except Exception as e:
            logger.error(f"Video export failed: {str(e)}")
            raise
    
    def _build_ffmpeg_command(self, resolution, fps, codec, bitrate, video_clips, audio_path, captions_path=None):
        """Build FFmpeg command for video export"""
        inputs = []
        filters = []
        map_args = []
        
        # Add video clips as inputs
        video_files = []
        for i, clip in enumerate(video_clips):
            video_path = clip.get("path", f"video_clip_{i}.mp4")
            duration = clip.get("duration", 5.0)
            
            if os.path.exists(video_path):
                inputs.extend(["-i", video_path])
                video_files.append(video_path)
            else:
                # Create placeholder if clip doesn't exist
                logger.warning(f"Video clip not found: {video_path}")
        
        # Add audio input
        inputs.extend(["-i", audio_path])
        audio_input_idx = len(video_files)
        
        # Build video filter chain
        filter_parts = []
        
        # Scale and concat videos
        if video_files:
            # Scale to target resolution
            for i, _ in enumerate(video_files):
                filter_parts.append(f"[{i}:v]scale={resolution}:force_original_aspect_ratio=decrease,pad={resolution}:(ow-iw)/2:(oh-ih)/2,setsar=1[f{i}]")
            
            # Concatenate videos
            concat_inputs = "".join(f"[f{i}]" for i in range(len(video_files)))
            filter_parts.append(f"{concat_inputs}concat=n={len(video_files)}:v=1:a=0[outv]")
        else:
            # Create placeholder video if no clips
            filter_parts.append(f"color=c=black:s={resolution}:d=10,fps={fps}[outv]")
        
        # Add text overlay if captions available
        if captions_path and os.path.exists(captions_path):
            filter_parts.append(f"[outv]subtitles={captions_path}:force_style='Fontsize=24,PrimaryColour=&H00FFFF,Outline=1,Shadow=1,MarginV=100'[outsub]")
        
        # Combine filters
        filter_complex = ";".join(filter_parts)
        
        # Build final command
        cmd = ["ffmpeg", "-y"]
        cmd.extend(inputs)
        cmd.extend([
            "-filter_complex", filter_complex,
            "-map", "[outv]" if not captions_path else "[outsub]",
            "-map", f"{audio_input_idx}:a",
            "-c:v", "h264_nvenc" if self._check_nvenc() else "h264",
            "-b:v", bitrate,
            "-maxrate", bitrate,
            "-bufsize", "2M",
            "-c:a", "aac",
            "-b:a", "192k",
            "-vf", f"fps={fps}",
            "-shortest",
            "-profile:v", "main",
            "-level", "4.2",
            "-movflags", "+faststart",
            "output.mp4"
        ])
        
        return cmd
    
    def _check_nvenc(self) -> bool:
        """Check if NVIDIA encoder (NVENC) is available"""
        try:
            result = subprocess.run(
                ["ffmpeg", "-hide_banner", "-codecs"],
                capture_output=True,
                text=True
            )
            return "h264_nvenc" in result.stdout
        except Exception:
            return False
    
    async def create_text_overlay(self, text: str, duration: float, style: str = "minimal") -> str:
        """Create text overlay video"""
        try:
            output_path = os.path.join(
                self.video_dir,
                f"text_{abs(hash(text)) % 10000}.mp4"
            )
            
            cmd = [
                "ffmpeg", "-y",
                "-f", "lavfi", "-i", "color=c=black:s=1080x1920:d=10",
                "-vf", f"drawtext=text='{text}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2:borderw=2:bordercolor=black:box=1:boxcolor=black@0.5",
                "-c:v", "h264",
                "-b:v", "5M",
                "-t", str(duration),
                "-pix_fmt", "yuv420p",
                output_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                return output_path
            else:
                raise Exception(f"Text overlay creation failed: {result.stderr}")
                
        except Exception as e:
            logger.error(f"Text overlay creation failed: {str(e)}")
            raise
    
    async def create_transition(self, transition_type: str, duration: float = 1.0) -> str:
        """Create transition effect video"""
        try:
            output_path = os.path.join(
                self.video_dir,
                f"transition_{transition_type}_{abs(hash(transition_type + str(duration))) % 10000}.mp4"
            )
            
            if transition_type == "crossfade":
                cmd = [
                    "ffmpeg", "-y",
                    "-f", "lavfi", "-i", "color=c=black:s=1080x1920:d=1",
                    "-f", "lavfi", "-i", "color=c=white:s=1080x1920:d=1",
                    "-filter_complex",
                    f"fade=t=in:st=0:d=0.5,fade=t=out:st={duration-0.5}:d=0.5",
                    "-c:v", "h264",
                    "-t", str(duration),
                    output_path
                ]
            else:
                # Default to fade transition
                cmd = [
                    "ffmpeg", "-y",
                    "-f", "lavfi", "-i", f"color=c=black:s=1080x1920:d={duration}",
                    "-c:v", "h264",
                    output_path
                ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                logger.info(f"Transition created: {output_path}")
                return output_path
            else:
                raise Exception(f"Transition creation failed: {result.stderr}")
                
        except Exception as e:
            logger.error(f"Transition creation failed: {str(e)}")
            raise

# Example usage
async def test_video_engine():
    """Test the video engine"""
    from types import SimpleNamespace
    engine = VideoEngine()
    
    settings = SimpleNamespace(
        platform="youtube-shorts",
        resolution="1080x1920",
        fps=30,
        codec="h.264",
        bit_rate="8M"
    )
    
    video_clips = []
    audio_path = "assets/audio/test.wav"
    
    try:
        result = await engine.export_video(settings, video_clips, audio_path)
        print(f"Exported video: {result}")
    except Exception as e:
        print(f"Expected failure (no audio file): {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_video_engine())
