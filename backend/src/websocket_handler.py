#!/usr/bin/env python3
"""
WebSocket Handler for Real-time Progress Updates
"""

import asyncio
import json
import logging
from typing import Dict, Set, Optional, Any
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger("websocket")

class ConnectionManager:
    """Manages WebSocket connections and broadcasts"""
    
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.task_progress: Dict[str, Dict[str, Any]] = {}
        
    async def connect(self, websocket: WebSocket):
        """Accept new WebSocket connection"""
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket connected. Total: {len(self.active_connections)}")
        
        # Send current state
        if self.task_progress:
            await websocket.send_json({
                "type": "state",
                "tasks": self.task_progress,
                "timestamp": datetime.now().isoformat()
            })
    
    def disconnect(self, websocket: WebSocket):
        """Remove WebSocket connection"""
        self.active_connections.discard(websocket)
        logger.info(f"WebSocket disconnected. Total: {len(self.active_connections)}")
    
    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast message to all connected clients"""
        if not self.active_connections:
            return
            
        message["timestamp"] = datetime.now().isoformat()
        disconnected = set()
        
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send: {e}")
                disconnected.add(connection)
        
        for conn in disconnected:
            self.active_connections.discard(conn)
    
    async def send_progress(self, task_id: str, progress: float, stage: str, message: str, **extra):
        """Send progress update for a task"""
        self.task_progress[task_id] = {
            "progress": progress,
            "stage": stage,
            "message": message,
            **extra
        }
        
        await self.broadcast({
            "type": "progress",
            "task_id": task_id,
            "progress": progress,
            "stage": stage,
            "message": message,
            **extra
        })
    
    async def send_complete(self, task_id: str, result: Any = None, **extra):
        """Send task completion notification"""
        if task_id in self.task_progress:
            del self.task_progress[task_id]
        
        await self.broadcast({
            "type": "complete",
            "task_id": task_id,
            "result": result,
            **extra
        })
    
    async def send_error(self, task_id: str, error: str, **extra):
        """Send error notification"""
        if task_id in self.task_progress:
            del self.task_progress[task_id]
        
        await self.broadcast({
            "type": "error",
            "task_id": task_id,
            "error": error,
            **extra
        })
    
    async def send_log(self, level: str, message: str, **extra):
        """Send log message"""
        await self.broadcast({
            "type": "log",
            "level": level,
            "message": message,
            **extra
        })

# Global connection manager
manager = ConnectionManager()

# Progress stages
PROGRESS_STAGES = {
    "script_generation": {
        "start": 0,
        "generating": 0.3,
        "refining": 0.6,
        "complete": 1.0
    },
    "audio_generation": {
        "start": 0,
        "tts": 0.5,
        "normalization": 0.8,
        "complete": 1.0
    },
    "caption_generation": {
        "start": 0,
        "transcribing": 0.7,
        "formatting": 0.9,
        "complete": 1.0
    },
    "video_export": {
        "start": 0,
        "preparing": 0.1,
        "encoding": 0.5,
        "finalizing": 0.9,
        "complete": 1.0
    }
}

async def create_progress_callback(task_id: str, stage: str):
    """Create a progress callback for long-running tasks"""
    async def callback(progress: float, message: str = "", **extra):
        await manager.send_progress(task_id, progress, stage, message, **extra)
    return callback