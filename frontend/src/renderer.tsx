import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function App() {
  const [backendStatus, setBackendStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [gpuAvailable, setGpuAvailable] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<string>('llama3.2:latest');
  const [models, setModels] = useState<string[]>([]);
  const [topic, setTopic] = useState('');
  const [targetDuration, setTargetDuration] = useState(45);
  const [currentScript, setCurrentScript] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [projectPath, setProjectPath] = useState('');
  const [activeTab, setActiveTab] = useState<'script' | 'audio' | 'video' | 'export'>('script');

  // Cleanup flag to prevent state updates after unmount
  const isUnmounted = React.useRef(false);

  useEffect(() => {
    isUnmounted.current = false;
    checkBackendHealth();
    fetchAvailableModels();
    
    const interval = setInterval(checkBackendHealth, 5000);
    return () => {
      isUnmounted.current = true;
      clearInterval(interval);
    };
  }, []);

  // Updated functions with unmount check
  async function checkBackendHealth() {
    if (isUnmounted.current) return;
    try {
      const response = await fetch('http://127.0.0.1:8000/health');
      if (response.ok) {
        const data = await response.json();
        if (!isUnmounted.current) {
          setBackendStatus('connected');
          setGpuAvailable(data.gpu_available || false);
        }
      } else {
        if (!isUnmounted.current) setBackendStatus('disconnected');
      }
    } catch (error) {
      if (!isUnmounted.current) setBackendStatus('disconnected');
    }
  }

  async function fetchAvailableModels() {
    try {
      const response = await fetch('http://127.0.0.1:8000/models/list');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.models) {
          const modelNames = data.models.map((m: any) => m.name);
          setModels(modelNames);
          if (modelNames.includes('llama3.2:latest')) {
            setSelectedModel('llama3.2:latest');
          } else if (modelNames.includes('llama3.1:8b-q4_K_M')) {
            setSelectedModel('llama3.1:8b-q4_K_M');
          } else if (modelNames.length > 0) {
            setSelectedModel(modelNames[0]);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
    }
  }

  async function generateScript() {
    if (!topic) {
      alert('Please enter a topic');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/script/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: topic,
          target_duration_seconds: targetDuration,
          tone: 'engaging',
          style: 'conversational',
          model_name: selectedModel
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCurrentScript(JSON.stringify(data.script, null, 2));
          alert(`Script generated successfully! (${data.token_count} tokens)`);
        } else {
          alert(`Error: ${data.error}`);
        }
      }
    } catch (error) {
      alert(`Failed to generate script: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function createNewProject() {
    const projectName = prompt('Enter project name:', 'my-video-project');
    if (!projectName) return;

    try {
      const response = await fetch('http://127.0.0.1:8000/project/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_name: projectName,
          directory: 'projects'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setProjectPath(data.project_path);
          alert(`Project created at: ${data.project_path}`);
        }
      }
    } catch (error) {
      alert(`Failed to create project: ${error.message}`);
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Pulse Studio</h1>
        <div className="status-bar">
          <span className={`status ${backendStatus}`}>
            {backendStatus === 'connected' ? 'Backend: Connected' : 
             backendStatus === 'connecting' ? 'Backend: Connecting...' : 
             'Backend: Disconnected'}
          </span>
          <span className="gpu-status">{gpuAvailable ? 'GPU: Available' : 'GPU: Not Available'}</span>
          <span className="vram-status">VRAM: 12GB (RTX 3060)</span>
        </div>
      </header>

      <div className="main-content">
        <nav className="nav-tabs">
          <button 
            className={activeTab === 'script' ? 'active' : ''}
            onClick={() => setActiveTab('script')}
          >
            Script
          </button>
          <button 
            className={activeTab === 'audio' ? 'active' : ''}
            onClick={() => setActiveTab('audio')}
          >
            Audio
          </button>
          <button 
            className={activeTab === 'video' ? 'active' : ''}
            onClick={() => setActiveTab('video')}
          >
            Video
          </button>
          <button 
            className={activeTab === 'export' ? 'active' : ''}
            onClick={() => setActiveTab('export')}
          >
            Export
          </button>
        </nav>

        <main className="tab-content">
          {activeTab === 'script' && (
            <div className="script-tab">
              <div className="card">
                <h2>Generate Script</h2>
                <div className="form-group">
                  <label>Video Topic:</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Enter your video topic..."
                  />
                </div>
                
                <div className="form-group">
                  <label>Target Duration (seconds):</label>
                  <input
                    type="number"
                    value={targetDuration}
                    onChange={(e) => setTargetDuration(parseInt(e.target.value) || 45)}
                    min="15"
                    max="120"
                  />
                </div>
                
                <div className="form-group">
                  <label>AI Model:</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                  >
                    {models.map((model) => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>

                <button 
                  className="primary-btn"
                  onClick={generateScript}
                  disabled={loading}
                >
                  {loading ? 'Generating Script...' : 'Generate Script'}
                </button>

                {currentScript && (
                  <div className="script-output">
                    <h3>Generated Script:</h3>
                    <pre>{currentScript}</pre>
                    <div className="script-actions">
                      <button onClick={() => alert('Script saved to project!')}>Save to Project</button>
                      <button onClick={() => alert('Script copied to clipboard!')}>Copy to Clipboard</button>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="project-info">
                <h2>Project Management</h2>
                <p>Current Project: <strong>{projectPath || 'No project created'}</strong></p>
                <button onClick={createNewProject}>Create New Project</button>
              </div>
            </div>
          )}

          {activeTab === 'audio' && (
            <div className="audio-tab">
              <div className="card">
                <h2>Voice Generation</h2>
                <div className="form-group">
                  <label>Text for Voiceover:</label>
                  <textarea 
                    rows={5} 
                    placeholder="Enter text to convert to speech..."
                  />
                </div>
                
                <div className="form-group">
                  <label>Voice Type:</label>
                  <select>
                    <option value="preset">Preset Voice (Orpheus TTS)</option>
                    <option value="custom">Custom Voice (OpenVoice Clone)</option>
                  </select>
                </div>

                <button className="primary-btn">Generate Voiceover</button>
              </div>

              <div className="card">
                <h2>Background Music</h2>
                <div className="form-group">
                  <label>Music Track:</label>
                  <input type="file" accept=".mp3,.wav" />
                </div>
                <button>Apply Auto-Ducking</button>
              </div>
            </div>
          )}

          {activeTab === 'video' && (
            <div className="video-tab">
              <div className="card">
                <h2>Video Timeline</h2>
                <div className="timeline">
                  <div className="timeline-item">
                    <span>0s - 15s</span>
                    <div className="video-clip">Clip 1</div>
                  </div>
                  <div className="timeline-item">
                    <span>15s - 30s</span>
                    <div className="video-clip">Clip 2</div>
                  </div>
                  <div className="timeline-item">
                    <span>30s - 45s</span>
                    <div className="video-clip">Clip 3</div>
                  </div>
                </div>
                
                <div className="timeline-controls">
                  <button>Voiceover Track</button>
                  <button>Music Track</button>
                  <button>Captions Track</button>
                </div>
              </div>

              <div className="card">
                <h2>Captions</h2>
                <div className="form-group">
                  <label>Auto-Generate Captions (Whisper):</label>
                  <select>
                    <option value="small">Whisper Small</option>
                    <option value="medium">Whisper Medium</option>
                    <option value="large">Whisper Large</option>
                  </select>
                </div>
                <button>Generate Captions</button>
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="export-tab">
              <div className="card">
                <h2>Export Settings</h2>
                
                <div className="form-group">
                  <label>Platform Preset:</label>
                  <select>
                    <option value="youtube-shorts">YouTube Shorts (1080x1920)</option>
                    <option value="tiktok">TikTok (1080x1920)</option>
                    <option value="instagram-reels">Instagram Reels (1080x1920)</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>FPS:</label>
                  <select>
                    <option value="30">30 FPS</option>
                    <option value="60">60 FPS</option>
                  </select>
                </div>

                <button className="primary-btn export-btn">Export Video</button>
              </div>

              <div className="card export-progress">
                <h2>Export Status</h2>
                <div className="progress-bar">
                  <div className="progress" style={{ width: '0%' }}></div>
                </div>
                <p>Ready to export</p>
              </div>
            </div>
          )}
        </main>
      </div>

      <footer className="footer">
        <div className="footer-content">
          <span>© 2025 Pulse Studio</span>
          <span>Local AI Processing</span>
          <span>No Cloud Dependencies</span>
          <span>Version 0.1.0</span>
        </div>
      </footer>
    </div>
  );
}

// Mount the app
const root = createRoot(document.getElementById('root')!);
root.render(<App />);
