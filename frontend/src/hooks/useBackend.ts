import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = 'http://127.0.0.1:8000';
const WS_URL = 'ws://127.0.0.1:8000/ws';

export interface HealthStatus {
  status: string;
  gpu_available: boolean;
  vram_total?: number;
  vram_used?: number;
  ollama_connected: boolean;
  models_loaded: string[];
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
}

export function useBackend() {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [tasks, setTasks] = useState<Record<string, TaskProgress>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // HTTP API calls
  const api = useCallback(async <T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return response.json();
  }, []);

  // Check backend health
  const checkHealth = useCallback(async () => {
    try {
      const data = await api<HealthStatus>('/health');
      setHealth(data);
      setStatus('connected');
      return data;
    } catch (error) {
      setStatus('disconnected');
      return null;
    }
  }, [api]);

  // Fetch available models
  const fetchModels = useCallback(async () => {
    try {
      const data = await api<{ success: boolean; models: ModelInfo[] }>('/models/list');
      if (data.success && data.models) {
        setModels(data.models);
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
    }
  }, [api]);

  // WebSocket connection for real-time progress
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const msg: ProgressMessage = JSON.parse(event.data);
        
        switch (msg.type) {
          case 'progress':
            if (msg.task_id) {
              setTasks(prev => ({
                ...prev,
                [msg.task_id!]: {
                  progress: msg.progress || 0,
                  stage: msg.stage || '',
                  message: msg.message || '',
                },
              }));
            }
            break;
          case 'complete':
            if (msg.task_id) {
              setTasks(prev => {
                const updated = { ...prev };
                delete updated[msg.task_id!];
                return updated;
              });
            }
            break;
          case 'state':
            if (msg.tasks) {
              setTasks(msg.tasks);
            }
            break;
          case 'error':
            console.error('Task error:', msg.error);
            break;
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected, reconnecting...');
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, []);

  // Initialize
  useEffect(() => {
    checkHealth();
    fetchModels();
    connectWebSocket();

    const healthInterval = setInterval(checkHealth, 10000);

    return () => {
      clearInterval(healthInterval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [checkHealth, fetchModels, connectWebSocket]);

  // API methods
  const generateScript = useCallback(async (
    topic: string,
    duration: number,
    model: string
  ): Promise<{ success: boolean; script?: string; error?: string }> => {
    return api('/script/generate', {
      method: 'POST',
      body: JSON.stringify({
        topic,
        target_duration_seconds: duration,
        tone: 'engaging',
        style: 'conversational',
        model_name: model,
      }),
    });
  }, [api]);

  const generateAudio = useCallback(async (
    text: string,
    voiceId: string = 'default'
  ): Promise<{ success: boolean; audio_path?: string; error?: string }> => {
    return api('/audio/generate', {
      method: 'POST',
      body: JSON.stringify({
        text,
        voice_settings: {
          voice_type: 'preset',
          voice_id: voiceId,
          speed: 1.0,
          pitch: 1.0,
        },
      }),
    });
  }, [api]);

  const generateCaptions = useCallback(async (
    audioPath: string,
    modelSize: string = 'small'
  ): Promise<{ success: boolean; captions?: string; error?: string }> => {
    return api('/captions/generate', {
      method: 'POST',
      body: JSON.stringify({
        audio_path: audioPath,
        model_size: modelSize,
        use_gpu: true,
      }),
    });
  }, [api]);

  const exportVideo = useCallback(async (
    projectPath: string,
    outputPath: string,
    platform: string = 'youtube-shorts'
  ): Promise<{ success: boolean; output_path?: string; error?: string }> => {
    return api('/video/export', {
      method: 'POST',
      body: JSON.stringify({
        project_path: projectPath,
        output_path: outputPath,
        platform,
      }),
    });
  }, [api]);

  return {
    status,
    health,
    models,
    tasks,
    api,
    checkHealth,
    fetchModels,
    generateScript,
    generateAudio,
    generateCaptions,
    exportVideo,
  };
}