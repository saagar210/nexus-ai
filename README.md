# Nexus AI

**Your Personal AI Operating System** — A fully local, privacy-first AI assistant with persistent memory, document intelligence, and smart model routing.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-macOS-lightgrey.svg)
![Python](https://img.shields.io/badge/python-3.11+-blue.svg)

## Features

### 🧠 Persistent Conversational AI
- **Long-term Memory**: Nexus remembers details about you across conversations
- **Context-Aware**: Automatically recalls relevant information from past interactions
- **Memory Browser**: View, search, and edit what Nexus knows about you

### 📚 Document Intelligence (RAG)
- **Smart Indexing**: Automatically indexes documents in your watched folders
- **Semantic Search**: Find information across all your documents using natural language
- **Source Citations**: See exactly which documents informed each response
- **Supported Formats**: PDF, DOCX, Markdown, HTML, TXT, and code files

### 🔀 Smart Model Routing
- **Automatic Selection**: Chooses the optimal model for each task
- **Task Detection**: Recognizes question types, writing tasks, code, and more
- **Model Profiles**:
  - `llama3.1:8b` — Fast chat and simple questions
  - `mistral:7b` — Balanced for general tasks
  - `qwen2.5:14b` — Document analysis and RAG
  - `llama3.1:70b-q4` — High-quality writing and complex reasoning

### ✍️ AI Writing Studio
- **Email Drafting**: Respond to email threads professionally
- **Cover Letters**: Job application letters with your context
- **Resume Content**: Tailored bullet points and descriptions
- **Creative Writing**: Stories, poems, and creative content
- **Iterative Refinement**: Refine drafts with feedback

### 🌐 Browser Companion
- **Bookmarklet**: Save any webpage with one click
- **Smart Extraction**: Pulls article content cleanly
- **Auto-Summary**: Generates summaries and key points
- **Searchable Archive**: All captured content is indexed

### 📊 Project Tracker
- **AI Ideation**: Brainstorm and refine project ideas
- **Requirement Extraction**: AI helps define requirements and goals
- **Progress Tracking**: Track project status through stages
- **Document Linking**: Connect relevant documents to projects

## Requirements

- **macOS** 14+ (Sonoma or later recommended)
- **Apple Silicon** Mac (M1/M2/M3/M4) with 16GB+ RAM
- **Ollama** installed and running
- **Python 3.11+**
- **Node.js 20+**
- **Rust** (for Tauri desktop app)

## Quick Start

### 1. Install Ollama

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull required models
ollama pull llama3.1:8b
ollama pull qwen2.5:14b

# Optional: additional models for better performance
ollama pull mistral:7b
ollama pull llama3.1:70b-q4  # Requires ~48GB RAM
```

### 2. Clone and Setup

```bash
git clone https://github.com/yourusername/nexus-ai.git
cd nexus-ai

# Setup backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Setup frontend
cd ../frontend
npm install
```

### 3. Run Nexus AI

```bash
# Start Ollama (if not already running)
ollama serve

# Option A: Use the start script
./start.sh

# Option B: Run manually
# Terminal 1 - Backend
cd backend && source venv/bin/activate && uvicorn app.main:app --port 8420

# Terminal 2 - Frontend
cd frontend && npm run dev
```

### 4. Open Nexus AI

- **Web**: http://localhost:5173
- **API Docs**: http://localhost:8420/docs

## Desktop App (Tauri)

Build the native macOS app:

```bash
cd frontend
npm run tauri:build
```

The app will be in `frontend/src-tauri/target/release/bundle/`.

## Configuration

Nexus AI stores data in `~/.nexus-ai/`:

```
~/.nexus-ai/
├── nexus.db          # SQLite database
├── chroma/           # Vector embeddings
├── documents/        # Uploaded documents
└── exports/          # Data exports
```

### Watch Folders

Configure folders to auto-index in **Settings → Watch Folders**:
- Documents folder
- Notes folder
- Any project directories

### Model Routing

Customize model selection in `backend/app/core/config.py`:

```python
MODEL_ROUTING = {
    "fast": "llama3.1:8b",      # Quick responses
    "balanced": "mistral:7b",   # General tasks
    "document": "qwen2.5:14b",  # RAG queries
    "quality": "llama3.1:70b-q4"  # Best quality
}
```

## Browser Bookmarklet

1. Go to **Settings → Browser Companion**
2. Drag the bookmarklet to your bookmarks bar
3. Click it on any webpage to save to Nexus

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat/stream` | POST | Stream chat responses |
| `/api/documents/upload` | POST | Upload documents |
| `/api/documents/search` | POST | Search documents |
| `/api/memory/` | GET | List memories |
| `/api/projects/` | GET/POST | Manage projects |
| `/api/writing/generate` | POST | Generate drafts |

Full API documentation: http://localhost:8420/docs

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Tauri Desktop App                    │
│  ┌─────────────────────────────────────────────────────┐│
│  │              React Frontend (Vite)                   ││
│  │  Chat │ Documents │ Projects │ Writing │ Settings   ││
│  └───────────────────────┬─────────────────────────────┘│
└──────────────────────────│──────────────────────────────┘
                           │ HTTP/SSE
┌──────────────────────────▼──────────────────────────────┐
│                   FastAPI Backend                        │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────────┐  │
│  │   Ollama    │ │   ChromaDB   │ │     SQLite       │  │
│  │   Service   │ │  (Vectors)   │ │   (Metadata)     │  │
│  └──────┬──────┘ └──────────────┘ └──────────────────┘  │
│         │                                                │
│  ┌──────▼──────┐ ┌──────────────┐ ┌──────────────────┐  │
│  │   Model     │ │     RAG      │ │     Memory       │  │
│  │   Router    │ │   Service    │ │    Service       │  │
│  └─────────────┘ └──────────────┘ └──────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                    Ollama (Local)                        │
│  llama3.1:8b │ mistral:7b │ qwen2.5:14b │ llama3.1:70b  │
└─────────────────────────────────────────────────────────┘
```

## Privacy & Security

- **100% Local**: All processing happens on your Mac
- **No Cloud**: No data leaves your machine
- **Open Source**: Audit the code yourself
- **Your Data**: Export or delete anytime

## Troubleshooting

### Ollama Not Connecting
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Restart Ollama
killall ollama && ollama serve
```

### Models Not Loading
```bash
# List installed models
ollama list

# Re-pull if needed
ollama pull llama3.1:8b
```

### Database Issues
```bash
# Reset database (WARNING: deletes all data)
rm ~/.nexus-ai/nexus.db
# Restart backend to recreate
```

## Contributing

Contributions welcome! Please read our contributing guidelines first.

## License

MIT License - see LICENSE file for details.

---

Built with ❤️ for privacy-conscious AI enthusiasts.
