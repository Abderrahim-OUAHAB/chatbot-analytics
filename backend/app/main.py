from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from datetime import datetime
import os

from app.schemas import GitHubQuery
from app.services.ai_service import AIService
from app.services.memory_service import get_conversation_state
from app.config import (
    GEMINI_MODEL_NAME,
    VECTOR_STORE_PATH,
    RATE_LIMIT,
    API_VERSION
)
from app.github_vectors_creator import generate_vector_store

# Timing du démarrage
app_start_time = datetime.utcnow()

# Générer le vecteur FAISS si absent
index_file_path = os.path.join(VECTOR_STORE_PATH, "index.faiss")
if not os.path.exists(index_file_path):
    print("🚀 Index FAISS absent, génération du vector store en cours...")
    generate_vector_store()
    print("✅ Vector store généré avec succès !")

# Initialisation du service AI
ai_service = AIService()

# Initialisation FastAPI
app = FastAPI(
    title="GitHub Analytics API",
    description="API for analyzing GitHub data using Gemini and vector search",
    version=API_VERSION
)

# Configuration CORS sécurisée
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    max_age=600
)

@app.post("/analyze")
async def generate_text(query: GitHubQuery) -> dict:
    try:
        return await ai_service.generate_response(query)  # Use the instance method
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": str(e),
                "type": type(e).__name__,
                "suggestion": "Please rephrase your query"
            }
        )


@app.get("/health")
async def health_check():
    """Service health check"""
    return {
        "status": "ready",
        "model": GEMINI_MODEL_NAME,
        "vector_store": os.path.exists(VECTOR_STORE_PATH),
        "data_ready": bool(ai_service.vector_store),
        "rate_limit": "60 requests/minute"
    }

@app.get("/available_metrics")
async def list_metrics():
    """List all available metrics for validation"""
    from config import AVAILABLE_METRICS
    return {"metrics": AVAILABLE_METRICS}

@app.get("/")
async def root():
    """API root endpoint with documentation"""
    return {
        "message": "School Analytics API with Semantic Search",
        "endpoints": {
            "POST /generate": {
                "description": "Analyze school data with natural language",
                "example_body": {"prompt": "Compare schools in Casablanca by success rate"}
            },
            "GET /available_metrics": "List all available metrics for queries",
            "GET /health": "Check API status and dependencies"
        },
        "features": [
            "Semantic search powered by Gemini Embeddings",
            "JSON-formatted responses with visualizations",
            "Conversational memory"
        ]
    }