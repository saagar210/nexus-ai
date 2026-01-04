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

## Recent Development History

### January 2026 - Major Feature Integration

**Feature Components Added** (23 new components):

- Chat enhancements: AgentModeToggle, ModelSelector, SmartRouting, PromptLibrary, SessionManagement, ConversationSearch
- Writing tools: WritingAssistant, GrammarChecker, StyleImprover, ToneAdjuster, TemplateLibrary
- Developer tools: APIPlayground, SystemLogs, DatabaseViewer, PerformanceMonitor
- Analytics: UsageStats, ModelPerformance, TopicAnalysis, ResponseTimeChart, TokenUsage
- UI/UX: ThemeSwitcher, KeyboardShortcuts, CommandPalette, GlobalSearch, OnboardingFlow

**Pages Implemented**:

- **ChatPage**: Full conversational UI with sidebar, message list, smart routing, model selection
- **DocumentsPage**: Document upload, grid/list views, search, empty states
- **ProjectsPage**: Project management with creation and tracking
- **WritingPage**: Multi-mode writing assistant (Email, Cover Letter, Resume, Creative, General)
- **MemoryPage**: Memory browser with categories (Personal, Professional, Preferences, etc.)
- **AnalyticsPage**: Dashboard with usage stats, charts (Messages Over Time, Model Usage, Top Topics)
- **DeveloperPage**: API Playground with 5 endpoints, System Logs, Database, Performance tabs
- **SettingsPage**: Model management, Watch Folders, Profile, Appearance, Security, Data Management

**Bug Fixes**:

- Fixed SQLAlchemy async `MissingGreenlet` error in session listing by adding `selectinload(ChatSession.messages)`
- This prevents lazy loading outside async context when accessing `session.messages`

**Commit History**:

```
ba71708 - Fix SQLAlchemy async MissingGreenlet error in session listing
4bf0697 - Integrate 23 feature components into main app
ae0fdf9 - Add 23 new feature components for enhanced AI chat experience
```

### Testing Status

All pages verified working:

- ✅ Chat: Conversation list, smart routing, model selection
- ✅ Documents: Upload, search, grid/list views
- ✅ Projects: Project creation and management
- ✅ Writing: 5 writing modes with draft generation
- ✅ Memory: 9 memories with category filters
- ✅ Analytics: Stats dashboard with 3 charts
- ✅ Developer: API playground with 5 endpoints
- ✅ Settings: 5 AI models, configuration options
