import React, { useState, useEffect } from 'react';

interface SettingsProps {
  health: {
    gpu_available: boolean;
    vram_total?: number;
    vram_used?: number;
    ollama_connected: boolean;
    models_loaded: string[];
  } | null;
  models: { name: string; size?: string }[];
  selectedModel: string;
  onModelChange: (model: string) => void;
}

export function Settings({ health, models, selectedModel, onModelChange }: SettingsProps) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="settings-panel">
      <div 
        className="settings-header"
        onClick={() => setExpanded(!expanded)}
      >
        <h3>⚙️ Settings</h3>
        <span className="expand-icon">{expanded ? '▼' : '▶'}</span>
      </div>
      
      {expanded && (
        <div className="settings-content">
          {/* System Status */}
          <div className="settings-section">
            <h4>System Status</h4>
            <div className="status-grid">
              <div className="status-item">
                <span className="status-label">GPU:</span>
                <span className={`status-value ${health?.gpu_available ? 'ok' : 'warning'}`}>
                  {health?.gpu_available ? '✅ Available' : '⚠️ Not detected'}
                </span>
              </div>
              {health?.gpu_available && (
                <div className="status-item">
                  <span className="status-label">VRAM:</span>
                  <span className="status-value">
                    {health.vram_used?.toFixed(1) || 0}GB / {health.vram_total?.toFixed(1) || 12}GB
                  </span>
                  <div className="vram-bar">
                    <div 
                      className="vram-used"
                      style={{ 
                        width: `${((health.vram_used || 0) / (health.vram_total || 12)) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              )}
              <div className="status-item">
                <span className="status-label">Ollama:</span>
                <span className={`status-value ${health?.ollama_connected ? 'ok' : 'error'}`}>
                  {health?.ollama_connected ? '✅ Connected' : '❌ Not connected'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Model Selection */}
          <div className="settings-section">
            <h4>AI Model</h4>
            <div className="model-selector">
              <label htmlFor="model-select">LLM Model:</label>
              <select
n                id="model-select"
                value={selectedModel}
                onChange={(e) => onModelChange(e.target.value)}
                className="model-dropdown"
              >
                {models.length > 0 ? (
                  models.map((model) => (
                    <option key={model.name} value={model.name}>
                      {model.name} {model.size ? `(${model.size})` : ''}
                    </option>
                  ))
                ) : (
                  <option value="">No models available</option>
                )}
              </select>
              <button 
                className="refresh-btn"
                onClick={() => window.dispatchEvent(new CustomEvent('refresh-models'))}
                title="Refresh models"
              >
                🔄
              </button>
            </div>
            <p className="hint">
              Models are managed through Ollama. Run <code>ollama pull llama3.1</code> to download.
            </p>
          </div>
          
          {/* Performance Settings */}
          <div className="settings-section">
            <h4>Performance</h4>
            <div className="checkbox-group">
              <label>
                <input type="checkbox" defaultChecked />
                Use GPU acceleration
              </label>
            </div>
            <div className="checkbox-group">
              <label>
                <input type="checkbox" defaultChecked />
                Auto-unload models after use
              </label>
            </div>
            <div className="slider-group">
              <label>Max VRAM usage:</label>
              <input 
                type="range" 
                min="4" 
                max="12" 
                defaultValue="10" 
                className="slider"
              />
              <span>10 GB</span>
            </div>
          </div>
          
          {/* Export Defaults */}
          <div className="settings-section">
            <h4>Export Defaults</h4>
            <div className="select-group">
              <label>Default Platform:</label>
              <select defaultValue="youtube-shorts">
                <option value="youtube-shorts">YouTube Shorts</option>
                <option value="tiktok">TikTok</option>
                <option value="instagram-reels">Instagram Reels</option>
              </select>
            </div>
            <div className="select-group">
              <label>Video Quality:</label>
              <select defaultValue="high">
                <option value="low">Low (720p, 4Mbps)</option>
                <option value="medium">Medium (1080p, 6Mbps)</option>
                <option value="high">High (1080p, 8Mbps)</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}