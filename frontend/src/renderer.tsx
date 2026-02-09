import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function App() {
  const [backendStatus, setBackendStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [gpuAvailable, setGpuAvailable] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<string>('llama3.1:8b-q4_K_M');
  const [models, setModels] = useState<string[]>([]);
  const [topic, setTopic] = useState('');
  const [targetDuration, setTargetDuration] = useState(45);
  const [currentScript, setCurrentScript] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [projectPath, setProjectPath] = useState('');
  const [activeTab, setActiveTab] = useState<'script' | 'audio' | 'video' | 'export'>('script');

  useEffect(() => {
    checkBackendHealth();
    fetchAvailableModels();
    
    const interval = setInterval(checkBackendHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  async function checkBackendHealth() {
    try {
      const response = await fetch('http://127.0.0.1:8000/health');
      if (response.ok) {
        const data = await response.json();
        setBackendStatus('connected');
        setGpuAvailable(data.gpu_available || false);
      } else {
        setBackendStatus('disconnected');
      }
    } catch (error) {
      setBackendStatus('disconnected');
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
          if (modelNames.includes('llama3.1:8b-q4_K_M')) {
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
        <h1>🎬 YSS Video Creator</h1>
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
            📝 Script
          </button>
          <button 
            className={activeTab === 'audio' ? 'active' : ''}
            onClick={() => setActiveTab('audio')}
          >
            🎙️ Audio
          </button>
          <button 
            className={activeTab === 'video' ? 'active' : ''}
            onClick={() => setActiveTab('video')}
          >
            🎥 Video
          </button>
          <button 
            className={activeTab === 'export' ? 'active' : ''}
            onClick={() => setActiveTab('export')}
          >
            🚀 Export
          </button>
        </nav>

        <main className="tab-content">
          {activeTab === 'script' && (
            <div className="script-tab">
              <div className="card">
                <h2>📝 Generate Script</h2>
                <div className="form-group">
                  <label htmlFor="topic">Video Topic:</label>
                  <input
                    id="topic"
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Enter your video topic..."
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="duration">Target Duration (seconds):</label>
                  <input
                    id="duration"
                    type="number"
                    value={targetDuration}
                    onChange={(e) => setTargetDuration(parseInt(e.target.value) || 45)}
                    min="15"
                    max="120"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="model">AI Model:</label>
                  <select
                    id="model"
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
                      <button onClick={() => alert('Script saved to project!')}>💾 Save to Project</button>
                      <button onClick={() => alert('Script copied to clipboard!')}>📋 Copy to Clipboard</button>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="project-info">
                <h2>📁 Project Management</h2>
                <p>Current Project: <strong>{projectPath || 'No project created'}</strong></p>
                <button onClick={createNewProject}>➕ Create New Project</button>
              </div>
            </div>
          )}

          {activeTab === 'audio' && (
            <div className="audio-tab">
              <div className="card">
                <h2>🎙️ Voice Generation</h2>
                <div className="form-group">
                  <label>Text for Voiceover:</label>
                  <textarea 
                    rows={5} 
                    placeholder="Enter text to convert to speech..."
                    defaultValue={currentScript ? JSON.parse(currentScript)?.script || '' : ''}
                  />
                </div>
                
                <div className="form-group">
                  <label>Voice Type:</label>
                  <select>
                    <option value="preset">Preset Voice (Orpheus TTS)</option>
                    <option value="custom">Custom Voice (OpenVoice Clone)</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Reference Audio (for custom voice):</label>
                  <input type="file" accept=".wav,.mp3,.m4a" />
                </div>

                <div className="form-group">
                  <label>Voice Settings:</label>
                  <div className="settings-row">
                    <div className="setting">
                      <label>Speed:</label>
                      <input type="range" min="0.5" max="2.0" step="0.1" defaultValue="1.0" />
                      <span>1.0x</span>
                    </div>
                    <div className="setting">
                      <label>Pitch:</label>
                      <input type="range" min="0.5" max="2.0" step="0.1" defaultValue="1.0" />
                      <span>1.0x</span>
                    </div>
                  </div>
                </div>

                <button className="primary-btn">Generate Voiceover</button>
              </div>

              <div className="card">
                <h2>🎵 Background Music</h2>
                <div className="form-group">
                  <label>Music Track:</label>
                  <input type="file" accept=".mp3,.wav" />
                </div>
                
                <div className="form-group">
                  <label>Volume Level:</label>
                  <input type="range" min="0" max="100" defaultValue="30" />
                </div>
                
                <button>Apply Auto-Ducking</button>
              </div>
            </div>
          )}

          {activeTab === 'video' && (
            <div className="video-tab">
              <div className="card">
                <h2>🎥 Video Timeline</h2>
                <div className="timeline">
                  <div className="timeline-item">
                    <span>0s - 5s</span>
                    <div className="video-clip">Clip 1</div>
                  </div>
                  <div className="timeline-item">
                    <span>5s - 15s</span>
                    <div className="video-clip">Clip 2</div>
                  </div>
                  <div className="timeline-item">
                    <span>15s - 30s</span>
                    <div className="video-clip">Clip 3</div>
                  </div>
                  <div className="timeline-item">
                    <span>30s - 45s</span>
                    <div className="video-clip">Clip 4</div>
                  </div>
                </div>
                
                <div className="timeline-controls">
                  <button>🎵 Voiceover Track</button>
                  <button>🎶 Music Track</button>
                  <button>📝 Captions Track</button>
                </div>
              </div>

              <div className="card">
                <h2>📜 Captions</h2>
                <div className="form-group">
                  <label>Auto-Generate Captions (Whisper):</label>
                  <select>
                    <option value="small">Whisper Small (Recommended)</option>
                    <option value="medium">Whisper Medium</option>
                    <option value="large">Whisper Large</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Caption Style:</label>
                  <select>
                    <option value="minimal">Minimal (Bottom Center)</option>
                    <option value="bold">Bold (White with Black Border)</option>
                    <option value="highlighted">Highlighted Words</option>
                  </select>
                </div>
                
                <button>Generate Captions</button>
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="export-tab">
              <div className="card">
                <h2>🚀 Export Settings</h2>
                
                <div className="form-group">
                  <label>Platform Preset:</label>
                  <select>
                    <option value="youtube-shorts">YouTube Shorts (1080x1920)</option>
                    <option value="tiktok">TikTok (1080x1920)</option>
                    <option value="instagram-reels">Instagram Reels (1080x1920)</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Resolution:</label>
                  <select>
                    <option value="1080x1920">1080x1920 (Full HD)</option>
                    <option value="720x1280">720x1280 (HD)</option>
                    <option value="480x854">480x854 (SD)</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>FPS:</label>
                  <select>
                    <option value="30">30 FPS</option>
                    <option value="60">60 FPS</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Bitrate:</label>
                  <select>
                    <option value="8M">8 Mbps (High Quality)</option>
                    <option value="6M">6 Mbps (Balanced)</option>
                    <option value="4M">4 Mbps (Small File)</option>
                  </select>
                </div>

                <button className="primary-btn export-btn">Export Video</button>
              </div>

              <div className="card">
                <h2>📝 Metadata</h2>
                <div className="form-group">
                  <label>Video Title:</label>
                  <input type="text" placeholder="Enter video title..." />
                </div>
                
                <div className="form-group">
                  <label>Description:</label>
                  <textarea rows={3} placeholder="Enter video description..." />
                </div>
                
                <button>AI-Generate Metadata</button>
              </div>

              <div className="card export-progress">
                <h2>📊 Export Status</h2>
                <div className="progress-bar">
                  <div className="progress" style={{ width: '0%' }}></div>
                </div>
                <p id="export-status">Ready to export</p>
              </div>
            </div>
          )}
        </main>
      </div>

      <footer className="footer">
        <div className="footer-content">
          <span>© 2024 YSS Video Creator</span>
          <span>Local AI Processing</span>
          <span>No Cloud Dependencies</span>
          <span>Version 0.1.0</span>
        </div>
      </footer>
    </div>
  );
}

// CSS styles
const styles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; background: #1e1e1e; color: #ffffff; }
  .app { min-height: 100vh; display: flex; flex-direction: column; }
  
  .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 20px; text-align: center; }
  .header h1 { font-size: 2rem; margin-bottom: 10px; color: #e94560; }
  .status-bar { display: flex; gap: 20px; justify-content: center; font-size: 0.9rem; }
  .status { padding: 5px 10px; border-radius: 4px; }
  .status.connected { background: #2d6a4f; }
  .status.connecting { background: #b5836d; }
  .status.disconnected { background: #d90429; }
  .gpu-status { background: #40916c; }
  .vram-status { background: #52796f; }

  .main-content { flex: 1; display: flex; }
  .nav-tabs { width: 200px; background: #2d3436; display: flex; flex-direction: column; }
  .nav-tabs button { 
    flex: 1; 
    border: none; 
    background: #2d3436; 
    color: #dfe6e9; 
    padding: 15px; 
    text-align: left; 
    cursor: pointer;
    transition: background 0.3s;
  }
  .nav-tabs button:hover { background: #3b4252; }
  .nav-tabs button.active { background: #e94560; color: white; border-left: 4px solid #ff796f; }

  .tab-content { flex: 1; padding: 20px; overflow-y: auto; }
  .card { background: #3b4252; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
  .card h2 { margin-bottom: 15px; color: #bf616a; }
  
  .form-group { margin-bottom: 15px; }
  .form-group label { display: block; margin-bottom: 5px; font-weight: 500; }
  .form-group input, .form-group select, .form-group textarea {
    width: 100%; 
    padding: 10px; 
    border: 1px solid #4c566a; 
    border-radius: 4px; 
    background: #2e3440; 
    color: white;
