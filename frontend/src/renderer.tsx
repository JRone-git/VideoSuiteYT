import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './components.css';
import { useBackend } from './hooks/useBackend';
import { Settings, Timeline, Preview, ProjectList } from './components';

// Types
interface TimelineClip {
  id: string;
  type: 'video' | 'audio' | 'caption';
  start: number;
  duration: number;
  label: string;
}

function App() {
  const {
    status: backendStatus,
    health,
    models,
    tasks,
    generateScript: apiGenerateScript,
    generateAudio: apiGenerateAudio,
    generateCaptions: apiGenerateCaptions,
    exportVideo: apiExportVideo,
  } = useBackend();

  const [selectedModel, setSelectedModel] = useState('llama3.1:8b-q4_K_M');
  const [topic, setTopic] = useState('');
  const [targetDuration, setTargetDuration] = useState(45);
  const [currentScript, setCurrentScript] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'script' | 'audio' | 'video' | 'export'>('script');
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [timelineClips, setTimelineClips] = useState<TimelineClip[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [audioPath, setAudioPath] = useState<string | null>(null);
  const [captions, setCaptions] = useState<string | null>(null);
  const [videoPath, setVideoPath] = useState<string | null>(null);

  // Get model names for selector
  const modelNames = models.map(m => m.name);

  // Generate script
  async function generateScript() {
    if (!topic.trim()) {
      alert('Please enter a topic');
      return;
    }
    setLoading(true);
    try {
      const result = await apiGenerateScript(topic, targetDuration, selectedModel);
      if (result.success && result.script) {
        setCurrentScript(result.script);
        // Add to timeline
        setTimelineClips(prev => [...prev, {
          id: 'script-' + Date.now(),
          type: 'audio' as const,
          start: 0,
          duration: result.estimated_duration || targetDuration,
          label: 'Generated Script'
        }]);
      } else {
        alert('Failed to generate script: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Error: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // Generate audio from script
  async function generateAudio() {
    if (!currentScript) {
      alert('Please generate a script first');
      return;
    }
    setLoading(true);
    try {
      const result = await apiGenerateAudio(currentScript);
      if (result.success && result.audio_path) {
        setAudioPath(result.audio_path);
        alert('Audio generated successfully!');
      } else {
        alert('Failed to generate audio: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Error: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // Generate captions
  async function handleGenerateCaptions() {
    if (!audioPath) {
      alert('Please generate audio first');
      return;
    }
    setLoading(true);
    try {
      const result = await apiGenerateCaptions(audioPath);
      if (result.success && result.captions) {
        setCaptions(result.captions);
        alert('Captions generated!');
      } else {
        alert('Failed to generate captions: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Error: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // Export video
  async function handleExport() {
    if (!currentProjectId) {
      alert('No project to export');
      return;
    }
    setLoading(true);
    try {
      const result = await apiExportVideo(currentProjectId, `output_${Date.now()}.mp4`);
      if (result.success && result.output_path) {
        setVideoPath(result.output_path);
        alert('Video exported successfully!');
      } else {
        alert('Failed to export: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Error: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // Handle project creation
  const handleCreateProject = useCallback(async (name: string, platform: string) => {
    try {
      const response = await fetch('http://127.0.0.1:8000/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, target_platform: platform }),
      });
      const data = await response.json();
      if (data.id) {
        setCurrentProjectId(data.id);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  }, []);

  // Handle project selection
  const handleSelectProject = useCallback((projectId: string) => {
    setCurrentProjectId(projectId);
  }, []);

  // Handle project deletion
  const handleDeleteProject = useCallback(async (projectId: string) => {
    try {
      await fetch(`http://127.0.0.1:8000/projects/${projectId}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  }, []);

  // Get active task progress
  const activeTask = Object.entries(tasks)[0];

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <h1>🎬 VideoSuiteYT</h1>
          <span className="subtitle">Local AI Video Creator</span>
        </div>
        <div className="header-center">
          <div className="status-bar">
            <span className={`status-dot ${backendStatus}`}></span>
            <span className="status-text">
              {backendStatus === 'connecting' ? 'Connecting...' : backendStatus === 'connected' ? 'Connected' : 'Disconnected'}
            </span>
            {health?.gpu_available && <span className="gpu-badge">GPU</span>}
          </div>
        </div>
        <div className="header-right">
          <button className="btn-icon" onClick={() => setShowSettings(!showSettings)}>
            ⚙️
          </button>
        </div>
      </header>

      <div className="main-container">
        {/* Sidebar - Project List */}
        <aside className="sidebar">
          <ProjectList
            onSelectProject={handleSelectProject}
            onCreateProject={handleCreateProject}
            onDeleteProject={handleDeleteProject}
          />
        </aside>

        {/* Main Content */}
        <main className="content">
          {/* Settings Panel */}
          {showSettings && (
            <Settings
              health={health}
              models={models}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
            />
          )}

          {/* Progress Bar */}
          {activeTask && (
            <div className="progress-container">
              <div className="progress-info">
                <span>{activeTask[1].stage}</span>
                <span>{activeTask[1].message}</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${activeTask[1].progress * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <nav className="tabs">
            <button
              className={`tab ${activeTab === 'script' ? 'active' : ''}`}
              onClick={() => setActiveTab('script')}
            >
              📝 Script
            </button>
            <button
              className={`tab ${activeTab === 'audio' ? 'active' : ''}`}
              onClick={() => setActiveTab('audio')}
              disabled={!currentScript}
            >
              🎙️ Audio
            </button>
            <button
              className={`tab ${activeTab === 'video' ? 'active' : ''}`}
              onClick={() => setActiveTab('video')}
              disabled={!audioPath}
            >
              🎬 Video
            </button>
            <button
              className={`tab ${activeTab === 'export' ? 'active' : ''}`}
              onClick={() => setActiveTab('export')}
              disabled={!audioPath}
            >
              📤 Export
            </button>
          </nav>

          {/* Tab Content */}
          <div className="tab-content">
            {/* Script Tab */}
            {activeTab === 'script' && (
              <div className="panel">
                <div className="form-group">
                  <label>Topic</label>
                  <input
                    type="text"
                    placeholder="Enter your video topic..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="input"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Duration (seconds)</label>
                    <input
                      type="number"
                      min={15}
                      max={60}
                      value={targetDuration}
                      onChange={(e) => setTargetDuration(parseInt(e.target.value))}
                      className="input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Model</label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="select"
                    >
                      {modelNames.length > 0 ? (
                        modelNames.map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))
                      ) : (
                        <option value="">No models available</option>
                      )}
                    </select>
                  </div>
                </div>
                <button
                  className="btn-primary btn-large"
                  onClick={generateScript}
                  disabled={loading || backendStatus !== 'connected'}
                >
                  {loading ? 'Generating...' : 'Generate Script'}
                </button>
                {currentScript && (
                  <div className="script-output">
                    <h3>Generated Script</h3>
                    <textarea
                      value={currentScript}
                      onChange={(e) => setCurrentScript(e.target.value)}
                      className="textarea"
                      rows={12}
                    />
                    <div className="script-actions">
                      <button className="btn-secondary" onClick={() => navigator.clipboard.writeText(currentScript)}>
                        📋 Copy
                      </button>
                      <button className="btn-primary" onClick={() => setActiveTab('audio')}>
                        Continue to Audio →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Audio Tab */}
            {activeTab === 'audio' && (
              <div className="panel">
                <h3>🎙️ Voice Generation</h3>
                <p className="hint">Generate voiceover from your script using local TTS.</p>
                <div className="form-group">
                  <label>Voice</label>
                  <select className="select">
                    <option value="default">Default Voice</option>
                    <option value="male-1">Male Voice 1</option>
                    <option value="female-1">Female Voice 1</option>
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Speed</label>
                    <input type="range" min="0.5" max="2" step="0.1" defaultValue="1" className="slider" />
                  </div>
                  <div className="form-group">
                    <label>Pitch</label>
                    <input type="range" min="0.5" max="2" step="0.1" defaultValue="1" className="slider" />
                  </div>
                </div>
                <button
                  className="btn-primary"
                  onClick={generateAudio}
                  disabled={loading || !currentScript}
                >
                  {loading ? 'Generating...' : 'Generate Audio'}
                </button>
                {audioPath && (
                  <div className="audio-preview">
                    <p>✅ Audio generated: {audioPath}</p>
                    <button className="btn-secondary" onClick={handleGenerateCaptions}>
                      Generate Captions
                    </button>
                  </div>
                )}
                {captions && (
                  <div className="captions-preview">
                    <h4>Captions</h4>
                    <pre>{captions}</pre>
                  </div>
                )}
              </div>
            )}

            {/* Video Tab */}
            {activeTab === 'video' && (
              <div className="panel">
                <Preview
                  videoPath={videoPath || undefined}
                  currentTime={currentTime}
                  onTimeUpdate={setCurrentTime}
                />
              </div>
            )}

            {/* Export Tab */}
            {activeTab === 'export' && (
              <div className="panel">
                <h3>📤 Export Video</h3>
                <div className="form-group">
                  <label>Platform</label>
                  <select className="select">
                    <option value="youtube-shorts">YouTube Shorts</option>
                    <option value="tiktok">TikTok</option>
                    <option value="instagram-reels">Instagram Reels</option>
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Resolution</label>
                    <select className="select" defaultValue="1080x1920">
                      <option value="720x1280">720p (HD)</option>
                      <option value="1080x1920">1080p (Full HD)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Bitrate</label>
                    <select className="select" defaultValue="8M">
                      <option value="4M">4 Mbps</option>
                      <option value="6M">6 Mbps</option>
                      <option value="8M">8 Mbps</option>
                    </select>
                  </div>
                </div>
                <button
                  className="btn-primary btn-large"
                  onClick={handleExport}
                  disabled={loading || !currentProjectId}
                >
                  {loading ? 'Exporting...' : 'Export Video'}
                </button>
              </div>
            )}
          </div>

          {/* Timeline */}
          <Timeline
            clips={timelineClips}
            duration={targetDuration}
            currentTime={currentTime}
            onClipSelect={setSelectedClipId}
            onTimeSeek={setCurrentTime}
            selectedClipId={selectedClipId || undefined}
          />
        </main>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);