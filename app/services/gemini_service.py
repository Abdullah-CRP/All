import json
import logging
from typing import Dict, Any, Optional
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

class GeminiService:
    """
    Communicates with the Gemini API for contextual RAG schema enrichment
    and deep semantic synthetic text generation.
    """
    
    @staticmethod
    async def generate_with_gemini(
        prompt: str,
        system_instruction: Optional[str] = None,
        api_key: Optional[str] = None,
        model: Optional[str] = None
    ) -> Optional[str]:
        key = api_key or settings.GEMINI_API_KEY
        if not key:
            return None
            
        model_name = model or settings.GEMINI_MODEL
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={key}"
        
        payload: Dict[str, Any] = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.7,
            }
        }
        
        if system_instruction:
            payload["systemInstruction"] = {
                "parts": [{"text": system_instruction}]
            }
            
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            return parts[0].get("text", "")
                else:
                    logger.warning(f"Gemini API returned status {res.status_code}: {res.text}")
                    return None
        except Exception as e:
            logger.error(f"Error calling Gemini API: {e}")
            return None
            
        return None
