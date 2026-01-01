"""Nexus AI - Personal AI Operating System - Main Application"""
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from .core.config import settings
from .core.database import init_db, close_db
from .services.memory_service import memory_service
from .services.file_watcher import file_watcher
from .services.rag_service import rag_service
from .services.ollama_service import ollama_service

# Import API routers
from .api import chat, documents, memory, projects, writing, webcapture, settings as settings_api


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    print(f"\n{'='*50}")
    print(f"  Nexus AI v{settings.APP_VERSION}")
    print(f"  Personal AI Operating System")
    print(f"{'='*50}\n")

    # Initialize database
    print("Initializing database...")
    await init_db()

    # Initialize default user profile
    from .core.database import async_session_maker
    async with async_session_maker() as db:
        await memory_service.initialize_default_profile(db)
        print("User profile initialized")

    # Check Ollama connection
    print("Checking Ollama connection...")
    ollama_ok = await ollama_service.check_health()
    if ollama_ok:
        print("Ollama connected successfully")
        models = await ollama_service.list_models()
        print(f"Available models: {[m['name'] for m in models]}")
    else:
        print("WARNING: Ollama not running! Start Ollama to use AI features.")

    # Setup file watcher callback
    async def handle_file_event(event_type: str, path: str):
        async with async_session_maker() as db:
            if event_type in ("created", "modified"):
                try:
                    await rag_service.index_document(db, file_path=path)
                    print(f"Indexed: {path}")
                except Exception as e:
                    print(f"Error indexing {path}: {e}")
            elif event_type == "deleted":
                # Would need to look up document by path and delete
                print(f"File deleted: {path}")

    file_watcher.set_index_callback(handle_file_event)

    # Start file watcher
    print("Starting file watcher...")
    file_watcher.start()

    print(f"\nServer running at http://{settings.HOST}:{settings.PORT}")
    print(f"API docs at http://{settings.HOST}:{settings.PORT}/docs")
    print(f"\n{'='*50}\n")

    yield

    # Shutdown
    print("\nShutting down...")
    file_watcher.stop()
    await close_db()
    print("Goodbye!")


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Personal AI Operating System with RAG, Memory, and Smart Model Routing",
    lifespan=lifespan
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(chat.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(memory.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(writing.router, prefix="/api")
app.include_router(webcapture.router, prefix="/api")
app.include_router(settings_api.router, prefix="/api")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs"
    }


@app.get("/api/status")
async def status():
    """Quick status check"""
    ollama_ok = await ollama_service.check_health()
    return {
        "status": "ok",
        "ollama": "connected" if ollama_ok else "disconnected",
        "file_watcher": "running" if file_watcher.is_running() else "stopped"
    }


# Mount static files for frontend (when built)
frontend_dist = Path(__file__).parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/app", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")


def run():
    """Run the application"""
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )


if __name__ == "__main__":
    run()
