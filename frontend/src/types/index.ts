// Shared TypeScript types for VideoSuiteYT

export interface Project {
  id: string;
  name: string;
  path: string;
  manifest: ProjectManifest;
}

export interface ProjectManifest {
  version: string;
  id: string;
  name: string;
  description: string;
  created_at: string;
  last_modified: string;
  duration_seconds: number;
  target_platform: string;
  assets: {
    scripts: ScriptAsset[];
    audio: AudioAsset[];
    video: VideoAsset[];
    captions: CaptionAsset[];
  };
  timeline: TimelineConfig;
  ai_settings: AISettings;
  export_settings: ExportSettings;
}

export interface ScriptAsset {
  path: string;
  version: string;
  source: string;
  content?: string;
}

export interface AudioAsset {
  path: string;
  type: 'voiceover' | 'background' | 'effect';
  duration: number;
  loudness: number;
}

export interface VideoAsset {
  path: string;
  type: 'video_clips' | 'image';
  duration: number;
  start_time: number;
}

export interface CaptionAsset {
  path: string;
  type: 'srt' | 'vtt';
  language: string;
  generated_by: string;
  model_size: string;
}

export interface TimelineConfig {
  resolution: string;
  fps: number;
  aspect_ratio: string;
  clips: TimelineClip[];
}

export interface TimelineClip {
  id: string;
  type: 'video' | 'audio' | 'caption';
  start: number;
  duration: number;
  source: string;
}

export interface AISettings {
  llm_model: string;
  whisper_model: string;
  tts_engine: string;
  voice_id: string;
}

export interface ExportSettings {
  output_format: string;
  codec: string;
  bitrate: string;
  audio_bitrate: string;
}

// API types
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  gpu_available: boolean;
  vram_total?: number;
  vram_used?: number;
  ollama_connected: boolean;
  models_loaded: string[];
}

export interface ScriptGenerationRequest {
  topic: string;
  target_duration_seconds: number;
  tone: string;
  style: string;
  model_name: string;
}

export interface ScriptGenerationResponse {
  success: boolean;
  script?: string;
  word_count?: number;
  estimated_duration?: number;
  error?: string;
}

export interface AudioGenerationRequest {
  text: string;
  voice_type: 'preset' | 'custom';
  voice_id: string;
  speed: number;
  pitch: number;
}

export interface ProgressMessage {
  type: 'progress' | 'complete' | 'error' | 'log' | 'state';
  task_id?: string;
  progress?: number;
  stage?: string;
  message?: string;
  result?: unknown;
  error?: string;
  tasks?: Record<string, TaskProgress>;
  timestamp: string;
}

export interface TaskProgress {
  progress: number;
  stage: string;
  message: string;
}

export interface ModelInfo {
  name: string;
  size?: string;
  modified?: string;
}

export type Platform = 'youtube-shorts' | 'tiktok' | 'instagram-reels';

export const PLATFORM_PRESETS: Record<Platform, { resolution: string; fps: number; max_duration: number }> = {
  'youtube-shorts': { resolution: '1080x1920', fps: 30, max_duration: 60 },
  'tiktok': { resolution: '1080x1920', fps: 30, max_duration: 60 },
  'instagram-reels': { resolution: '1080x1920', fps: 30, max_duration: 90 },
};