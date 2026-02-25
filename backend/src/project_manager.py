#!/usr/bin/env python3
"""
Project Manager for .yss Project Files
Handles saving, loading, and managing video projects
"""

import os
import json
import zipfile
import shutil
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime
import yaml

logger = logging.getLogger("project-manager")

class ProjectManager:
    """Manages .yss project files (ZIP containers with YAML manifest)"""
    
    def __init__(self, projects_dir: str = "projects"):
        self.projects_dir = Path(projects_dir)
        self.projects_dir.mkdir(parents=True, exist_ok=True)
        
    def create_project(
        self,
        name: str,
        description: str = "",
        target_platform: str = "youtube-shorts",
        duration_seconds: int = 45
    ) -> Dict[str, Any]:
        """Create a new project with default structure"""
        project_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        project_dir = self.projects_dir / f"{project_id}_{name.replace(' ', '_')}"
        project_dir.mkdir(parents=True, exist_ok=True)
        
        # Create asset directories
        (project_dir / "assets" / "scripts").mkdir(parents=True, exist_ok=True)
        (project_dir / "assets" / "audio").mkdir(parents=True, exist_ok=True)
        (project_dir / "assets" / "video").mkdir(parents=True, exist_ok=True)
        (project_dir / "assets" / "captions").mkdir(parents=True, exist_ok=True)
        
        # Create manifest
        manifest = {
            "version": "1.0",
            "id": project_id,
            "name": name,
            "description": description,
            "created_at": datetime.now().isoformat(),
            "last_modified": datetime.now().isoformat(),
            "duration_seconds": duration_seconds,
            "target_platform": target_platform,
            "assets": {
                "scripts": [],
                "audio": [],
                "video": [],
                "captions": []
            },
            "timeline": {
                "resolution": "1080x1920",
                "fps": 30,
                "aspect_ratio": "9:16",
                "clips": []
            },
            "ai_settings": {
                "llm_model": "llama3.1:8b-q4_K_M",
                "whisper_model": "small",
                "tts_engine": "orpheus",
                "voice_id": "default"
            },
            "export_settings": {
                "output_format": "mp4",
                "codec": "h.264",
                "bitrate": "8M",
                "audio_bitrate": "192k"
            }
        }
        
        manifest_path = project_dir / "manifest.yml"
        with open(manifest_path, "w") as f:
            yaml.dump(manifest, f, default_flow_style=False)
        
        logger.info(f"Created project: {name} ({project_id})")
        return {
            "id": project_id,
            "name": name,
            "path": str(project_dir),
            "manifest": manifest
        }
    
    def list_projects(self) -> List[Dict[str, Any]]:
        """List all available projects"""
        projects = []
        
        for item in self.projects_dir.iterdir():
            if item.is_dir():
                manifest_path = item / "manifest.yml"
                if manifest_path.exists():
                    try:
                        with open(manifest_path, "r") as f:
                            manifest = yaml.safe_load(f)
                        projects.append({
                            "id": manifest.get("id", item.name),
                            "name": manifest.get("name", item.name),
                            "path": str(item),
                            "last_modified": manifest.get("last_modified"),
                            "duration_seconds": manifest.get("duration_seconds")
                        })
                    except Exception as e:
                        logger.error(f"Failed to load project {item}: {e}")
        
        # Sort by last modified
        projects.sort(key=lambda x: x.get("last_modified", ""), reverse=True)
        return projects
    
    def load_project(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Load a project by ID"""
        for item in self.projects_dir.iterdir():
            if item.is_dir() and item.name.startswith(project_id):
                manifest_path = item / "manifest.yml"
                if manifest_path.exists():
                    with open(manifest_path, "r") as f:
                        manifest = yaml.safe_load(f)
                    return {
                        "id": project_id,
                        "path": str(item),
                        "manifest": manifest
                    }
        return None
    
    def save_project(self, project_id: str, manifest: Dict[str, Any]) -> bool:
        """Save project manifest"""
        for item in self.projects_dir.iterdir():
            if item.is_dir() and item.name.startswith(project_id):
                manifest["last_modified"] = datetime.now().isoformat()
                manifest_path = item / "manifest.yml"
                with open(manifest_path, "w") as f:
                    yaml.dump(manifest, f, default_flow_style=False)
                logger.info(f"Saved project: {project_id}")
                return True
        return False
    
    def export_project(self, project_id: str, output_path: str) -> str:
        """Export project as .yss file (ZIP archive)"""
        project = self.load_project(project_id)
        if not project:
            raise ValueError(f"Project not found: {project_id}")
        
        project_dir = Path(project["path"])
        output_file = Path(output_path)
        if not output_file.suffix:
            output_file = output_file.with_suffix(".yss")
        
        with zipfile.ZipFile(output_file, 'w', zipfile.ZIP_DEFLATED) as zf:
            for file_path in project_dir.rglob("*"):
                if file_path.is_file():
                    arcname = file_path.relative_to(project_dir)
                    zf.write(file_path, arcname)
        
        logger.info(f"Exported project to: {output_file}")
        return str(output_file)
    
    def import_project(self, yss_file: str) -> Dict[str, Any]:
        """Import project from .yss file"""
        with zipfile.ZipFile(yss_file, 'r') as zf:
            # Read manifest first
            manifest_data = zf.read("manifest.yml")
            manifest = yaml.safe_load(manifest_data)
            
            # Create project directory
            project_id = manifest.get("id", datetime.now().strftime("%Y%m%d_%H%M%S"))
            name = manifest.get("name", "imported")
            project_dir = self.projects_dir / f"{project_id}_{name.replace(' ', '_')}"
            project_dir.mkdir(parents=True, exist_ok=True)
            
            # Extract all files
            zf.extractall(project_dir)
        
        logger.info(f"Imported project: {name} ({project_id})")
        return {
            "id": project_id,
            "name": name,
            "path": str(project_dir),
            "manifest": manifest
        }
    
    def delete_project(self, project_id: str) -> bool:
        """Delete a project"""
        for item in self.projects_dir.iterdir():
            if item.is_dir() and item.name.startswith(project_id):
                shutil.rmtree(item)
                logger.info(f"Deleted project: {project_id}")
                return True
        return False
    
    def add_asset(
        self,
        project_id: str,
        asset_type: str,
        file_path: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """Add an asset to a project"""
        project = self.load_project(project_id)
        if not project:
            raise ValueError(f"Project not found: {project_id}")
        
        project_dir = Path(project["path"])
        assets_dir = project_dir / "assets" / asset_type
        assets_dir.mkdir(parents=True, exist_ok=True)
        
        # Copy file to project
        src_path = Path(file_path)
        dest_path = assets_dir / src_path.name
        shutil.copy2(src_path, dest_path)
        
        # Update manifest
        manifest = project["manifest"]
        asset_entry = {
            "path": f"assets/{asset_type}/{src_path.name}",
            "added_at": datetime.now().isoformat(),
            **(metadata or {})
        }
        
        if asset_type not in manifest["assets"]:
            manifest["assets"][asset_type] = []
        manifest["assets"][asset_type].append(asset_entry)
        
        self.save_project(project_id, manifest)
        
        return str(dest_path)