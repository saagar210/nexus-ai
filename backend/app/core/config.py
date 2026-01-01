"""Application configuration"""
import os
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment or defaults"""

    # Application
    APP_NAME: str = "Nexus AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Server
    HOST: str = "127.0.0.1"
    PORT: int = 8420

    # Paths
    BASE_DIR: Path = Path(__file__).parent.parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    DOCUMENTS_DIR: Path = DATA_DIR / "documents"
    CHROMADB_DIR: Path = DATA_DIR / "chromadb"
    SQLITE_DIR: Path = DATA_DIR / "sqlite"

    # Database
    DATABASE_URL: str = ""

    # Ollama
    OLLAMA_HOST: str = "http://localhost:11434"

    # Model configuration
    MODELS: dict = {
        "fast": "llama3.1:8b",
        "balanced": "mistral:7b",
        "document": "qwen2.5:14b",
        "quality": "llama3.1:70b-q4"
    }

    # Default model for each task type
    MODEL_ROUTING: dict = {
        "chat": "fast",
        "question": "fast",
        "document_analysis": "document",
        "rag_query": "document",
        "writing": "quality",
        "creative": "quality",
        "email": "quality",
        "resume": "quality",
        "code": "fast",
        "summary": "document"
    }

    # RAG settings
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200
    TOP_K_RESULTS: int = 5

    # Watch folders (user configurable)
    WATCH_FOLDERS: List[str] = []

    # User profile (pre-populated for testing)
    DEFAULT_USER_PROFILE: dict = {
        "name": "Saagar",
        "age": 30,
        "job": "Senior IT Support Engineer",
        "location": "SF Bay Area",
        "background": "CS degree, background in programming, now in IT",
        "interests": ["AI", "vibe coding", "learning and creating"],
        "preferences": {
            "ask_clarifying_questions": True
        }
    }

    class Config:
        env_file = ".env"
        extra = "allow"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Set database URL after BASE_DIR is resolved
        if not self.DATABASE_URL:
            self.DATABASE_URL = f"sqlite+aiosqlite:///{self.SQLITE_DIR}/nexus.db"

        # Ensure directories exist
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)
        self.DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)
        self.CHROMADB_DIR.mkdir(parents=True, exist_ok=True)
        self.SQLITE_DIR.mkdir(parents=True, exist_ok=True)


settings = Settings()
