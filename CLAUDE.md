# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nexus AI is a personal AI operating system that runs entirely locally on macOS. It provides:

- **Persistent conversational AI** with long-term memory extraction
- **RAG-powered document intelligence** using ChromaDB for vector storage
- **Smart model routing** that automatically selects optimal local LLMs
- **AI writing assistant** for emails, cover letters, resumes, and creative content
- **Browser companion** via bookmarklet for saving and processing web articles
- **Project tracker** with AI-assisted ideation and iteration

## Tech Stack

- **Backend**: Python 3.11+ with FastAPI, SQLAlchemy (async), ChromaDB
- **Frontend**: React 19 + TypeScript + Vite + TailwindCSS
- **Desktop**: Tauri v1 (Rust-based wrapper)
- **AI**: Ollama for local LLM inference (llama3.1:8b, mistral:7b, qwen2.5:14b, llama3.1:70b-q4)

## Commands

### Quick Start

```bash
./start.sh  # Starts backend and frontend (requires Ollama running)
```

### Backend

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8420
```

### Frontend

```bash
cd frontend
npm install
npm run dev        # Development server at http://localhost:5173
npm run build      # Production build
npm run tauri:dev  # Run as Tauri desktop app
npm run tauri:build # Build desktop app
```

### Linting

```bash
cd frontend && npm run lint
```

## Architecture

### Directory Structure

```
NEXUS/
├── backend/
│   └── app/
│       ├── core/          # Config, database setup
│       ├── models/        # SQLAlchemy + Pydantic schemas
│       ├── services/      # Business logic
│       │   ├── ollama_service.py     # Ollama API wrapper
│       │   ├── model_router.py       # Smart model selection
│       │   ├── rag_service.py        # ChromaDB vector store
│       │   ├── document_processor.py # Text extraction
│       │   ├── memory_service.py     # Persistent memory
│       │   ├── chat_service.py       # Chat with RAG + memory
│       │   ├── writing_service.py    # Writing assistant
│       │   └── project_service.py    # Project tracking
│       └── api/           # FastAPI route handlers
├── frontend/
│   ├── src/
│   │   ├── pages/         # React page components
│   │   ├── lib/api.ts     # API client
│   │   └── types/         # TypeScript types
│   └── src-tauri/         # Tauri configuration
└── start.sh               # Convenience start script
```

### Key Design Decisions

1. **Smart Model Routing**: The `model_router.py` analyzes task complexity and type to select the optimal model (fast/balanced/quality/document)

2. **Memory Extraction**: After each conversation, the system extracts and stores facts about the user for future context

3. **Streaming Responses**: Chat uses Server-Sent Events for real-time token streaming

4. **RAG Pipeline**: Documents are chunked, embedded via Ollama, and stored in ChromaDB for semantic search

### API Endpoints (port 8420)

- `POST /api/chat/stream` - Streaming chat with RAG + memory
- `POST /api/documents/upload` - Upload and index documents
- `GET /api/memory/` - List extracted memories
- `POST /api/projects/{id}/iterate` - AI iteration on projects
- `POST /api/writing/generate` - Generate writing drafts
- `POST /api/webcapture/` - Capture web content (bookmarklet)

## Environment

- macOS 15.1 on MacBook Pro M4 Pro with 48GB RAM
- Ollama must be running (`ollama serve`)
- Default data stored in `~/.nexus-ai/`
