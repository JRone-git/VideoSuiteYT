import React, { useState, useEffect } from 'react';

interface Project {
  id: string;
  name: string;
  path: string;
  last_modified?: string;
  duration_seconds?: number;
}

interface ProjectListProps {
  onSelectProject: (projectId: string) => void;
  onCreateProject: (name: string, platform: string) => void;
  onDeleteProject: (projectId: string) => void;
}

export function ProjectList({ onSelectProject, onCreateProject, onDeleteProject }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectPlatform, setNewProjectPlatform] = useState('youtube-shorts');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/projects/list');
      const data = await response.json();
      if (data.success) {
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    if (newProjectName.trim()) {
      onCreateProject(newProjectName.trim(), newProjectPlatform);
      setNewProjectName('');
      setShowNewProject(false);
      fetchProjects();
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="project-list">
      <div className="project-list-header">
        <h2>📁 Projects</h2>
        <button 
          className="btn-primary"
          onClick={() => setShowNewProject(!showNewProject)}
        >
          + New Project
        </button>
      </div>

      {showNewProject && (
        <div className="new-project-form">
          <input
            type="text"
            placeholder="Project name..."
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <select
            value={newProjectPlatform}
            onChange={(e) => setNewProjectPlatform(e.target.value)}
          >
            <option value="youtube-shorts">YouTube Shorts</option>
            <option value="tiktok">TikTok</option>
            <option value="instagram-reels">Instagram Reels</option>
          </select>
          <div className="form-actions">
            <button className="btn-secondary" onClick={() => setShowNewProject(false)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleCreate}>
              Create
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📂</div>
          <p>No projects yet</p>
          <p className="hint">Create your first video project to get started</p>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map((project) => (
            <div
              key={project.id}
              className="project-card"
              onClick={() => onSelectProject(project.id)}
            >
              <div className="project-thumbnail">
                <span className="duration-badge">{formatDuration(project.duration_seconds)}</span>
              </div>
              <div className="project-info">
                <h3>{project.name}</h3>
                <p className="project-date">{formatDate(project.last_modified)}</p>
              </div>
              <button
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Delete this project?')) {
                    onDeleteProject(project.id);
                    fetchProjects();
                  }
                }}
                title="Delete project"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}