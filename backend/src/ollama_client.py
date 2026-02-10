#!/usr/bin/env python3
"""
Ollama Client for Local LLM Processing
Interacts with local Ollama instance for script generation
"""

import os
import json
import asyncio
import logging
from typing import Optional, List, Dict, Any
import aiohttp

logger = logging.getLogger("ollama-client")

class OllamaClient:
    def __init__(
        self, 
        base_url: str = "http://localhost:11434",
        model_name: str = "llama3.2:latest",
        context_size: int = 4096
    ):
        self.base_url = base_url
        self.model_name = model_name
        self.context_size = context_size
        self.session = None
        self.is_model_loaded = False
        
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
            
    async def list_models(self) -> List[Dict[str, Any]]:
        """List available models from Ollama"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.base_url}/api/tags") as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get("models", [])
        except Exception as e:
            logger.error(f"Failed to list models: {str(e)}")
            return []
        return []
    
    async def load_model(self, model_name: str = None) -> bool:
        """Load model into VRAM"""
        try:
            if model_name:
                self.model_name = model_name
            
            # Create a simple request to load the model
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/api/generate",
                    json={
                        "model": self.model_name,
                        "prompt": "A",
                        "stream": False,
                        "options": {"num_predict": 1}
                    }
                ) as response:
                    if response.status == 200:
                        self.is_model_loaded = True
                        logger.info(f"Model loaded: {self.model_name}")
                        return True
                    else:
                        self.is_model_loaded = False
                        return False
        except Exception as e:
            logger.error(f"Failed to load model: {str(e)}")
            self.is_model_loaded = False
            return False
    
    def unload_model(self) -> bool:
        """Unload model from VRAM"""
        try:
            # For Ollama, model unloading happens automatically
            # but we can clear our state
            self.is_model_loaded = False
            logger.info(f"Model unloaded: {self.model_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to unload model: {str(e)}")
            return False
    
    async def generate_script(self, request) -> Dict[str, Any]:
        """Generate script from topic"""
        try:
            if not self.is_model_loaded:
                await self.load_model()
            
            # Calculate target word count (approx 150 words/minute for speaking pace)
            target_words = request.target_duration_seconds * 150 / 60
            
            # Create system prompt for script generation
            system_prompt = """
            You are a scriptwriter for engaging YouTube Shorts and TikTok videos.
            Your scripts should be conversational, highlight the main point quickly, 
            and be exactly the target duration. Break the script into 
            clear scenes with visual suggestions.
            """
            
            # Create user prompt
            user_prompt = f"""
            Write a script for a {request.target_duration_seconds}-second vertical short about "{request.topic}".
            
            Requirements:
            - Tone: {request.tone}
            - Style: {request.style}
            - Target duration: {request.target_duration_seconds} seconds
            - Include 3-5 scenes with visual suggestions
            - Total word count: ~{int(target_words)} words
            
            Format the output as JSON with:
            - title: Brief title for the video
            - scenes: Array of scenes, each with:
              - duration: seconds
              - visual: description of what to show
              - voiceover: what to say
            - hashtags: 3-5 relevant hashtags
            """
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/api/generate",
                    json={
                        "model": self.model_name,
                        "prompt": f"system\n{system_prompt}\nuser\n{user_prompt}\nassistant",
                        "stream": False,
                        "options": {
                            "num_predict": 1024,
                            "temperature": 0.7,
                            "top_p": 0.9
                        }
                    }
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        response_text = data.get("response", "")
                        
                        # Try to parse JSON from response
                        try:
                            # Extract JSON from response if it's wrapped in markdown
                            json_start = response_text.find("{")
                            if json_start != -1:
                                json_end = response_text.rfind("}") + 1
                                if json_end > json_start:
                                    json_str = response_text[json_start:json_end]
                                    return json.loads(json_str)
                        except json.JSONDecodeError:
                            # If JSON parsing fails, return raw text
                            return {
                                "title": f"Video about {request.topic}",
                                "scenes": [{"duration": request.target_duration_seconds, "visual": "Generic visual", "voiceover": response_text}],
                                "hashtags": ["#shorts", "#video", "#ai"]
                            }
                    else:
                        raise Exception(f"Ollama API returned status {response.status}")
                        
            return None
    
        except Exception as e:
            logger.error(f"Script generation failed: {str(e)}")
            raise
    
    async def refine_script(self, request) -> Dict[str, Any]:
        """Refine an existing script based on adjustments"""
        try:
            if not self.is_model_loaded:
                await self.load_model()
            
            system_prompt = """
            You are a script editor who specializes in short-form video content.
            Your job is to refine scripts to meet specific duration and tone requirements.
            """
            
            adjustments_str = "\n".join(f"- {adj}" for adj in request.adjustments)
            
            user_prompt = f"""
            Refine the following script to better meet the requirements:
            
            Target duration: {request.target_duration_seconds} seconds
            Current script length: ~{len(request.script.split())} words
            
            Adjustments requested:
            {adjustments_str}
            
            Requirements:
            - Shorten or expand to hit the target duration exactly
            - Maintain the core message and engaging tone
            - Keep the same scene structure but adjust content
            
            Return the refined script as JSON with:
            - title: Refined title
            - scenes: Array of scenes with adjusted content
            - hashtags: Updated hashtags
            """
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/api/generate",
                    json={
                        "model": self.model_name,
                        "prompt": f"system\n{system_prompt}\nuser\n{user_prompt}\nassistant",
                        "stream": False,
                        "options": {
                            "num_predict": 1024,
                            "temperature": 0.5
                        }
                    }
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        response_text = data.get("response", "")
                        
                        # Try to parse JSON from response
                        try:
                            json_start = response_text.find("{")
                            if json_start != -1:
                                json_end = response_text.rfind("}") + 1
                                if json_end > json_start:
                                    json_str = response_text[json_start:json_end]
                                    return json.loads(json_str)
                        except json.JSONDecodeError:
                            # If JSON parsing fails, return raw text
                            return {
                                "title": "Refined Video Script",
                                "scenes": [{"duration": request.target_duration_seconds, "visual": "Generic visual", "voiceover": request.script}],
                                "hashtags": ["#shorts", "#video"]
                            }
                    
            return None
    
        except Exception as e:
            logger.error(f"Script refinement failed: {str(e)}")
            raise

# Example usage function for testing
async def test_ollama():
    """Test the Ollama client with a simple script generation"""
    client = OllamaClient()
    
    # Test script generation
    from types import SimpleNamespace
    test_request = SimpleNamespace(
        topic="The Power of Daily Habits",
        target_duration_seconds=45,
        tone="inspiring",
        style="conversational"
    )
    
    try:
        result = await client.generate_script(test_request)
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_ollama())