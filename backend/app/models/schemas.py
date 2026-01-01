"""Pydantic schemas for API request/response models"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# Base config to allow model_ prefix fields
class BaseSchema(BaseModel):
    model_config = ConfigDict(protected_namespaces=())


# === Enums ===

class TaskType(str, Enum):
    CHAT = "chat"
    QUESTION = "question"
    DOCUMENT_ANALYSIS = "document_analysis"
    RAG_QUERY = "rag_query"
    WRITING = "writing"
    CREATIVE = "creative"
    EMAIL = "email"
    RESUME = "resume"
    CODE = "code"
    SUMMARY = "summary"


class WritingMode(str, Enum):
    EMAIL_RESPONSE = "email_response"
    COVER_LETTER = "cover_letter"
    RESUME = "resume"
    CREATIVE = "creative"
    GENERAL = "general"


class ProjectStatus(str, Enum):
    IDEATION = "ideation"
    IN_PROGRESS = "in_progress"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class MemoryType(str, Enum):
    FACT = "fact"
    PREFERENCE = "preference"
    INTERACTION = "interaction"
    WRITING_STYLE = "writing_style"
    TOPIC = "topic"


# === Chat Schemas ===

class ChatMessage(BaseSchema):
    role: str = Field(..., description="Role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")
    timestamp: Optional[datetime] = None
    model_used: Optional[str] = None
    task_type: Optional[TaskType] = None


class ChatRequest(BaseSchema):
    message: str = Field(..., description="User message")
    session_id: Optional[str] = None
    model_override: Optional[str] = None
    include_documents: bool = True
    include_memory: bool = True
    project_context: Optional[str] = None
    system_prompt: Optional[str] = Field(None, description="Custom system prompt")


class ChatResponse(BaseSchema):
    response: str
    session_id: str
    model_used: str
    task_type: TaskType
    routing_reason: str
    documents_used: List[str] = []
    memory_context: Optional[str] = None


class StreamChunk(BaseSchema):
    content: str
    done: bool = False
    model_used: Optional[str] = None
    task_type: Optional[TaskType] = None


# === Session Schemas ===

class SessionCreate(BaseModel):
    title: Optional[str] = None


class SessionResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int


class SessionDetail(SessionResponse):
    messages: List[ChatMessage]


# === Document Schemas ===

class DocumentCreate(BaseModel):
    file_path: Optional[str] = None
    url: Optional[str] = None
    content: Optional[str] = None
    title: Optional[str] = None
    tags: List[str] = []


class DocumentResponse(BaseModel):
    id: str
    title: str
    file_path: Optional[str]
    file_type: str
    size_bytes: int
    created_at: datetime
    indexed_at: Optional[datetime]
    tags: List[str]
    chunk_count: int


class DocumentSearch(BaseModel):
    query: str
    top_k: int = 5
    filter_tags: List[str] = []
    file_types: List[str] = []


class DocumentSearchResult(BaseModel):
    document_id: str
    title: str
    chunk_content: str
    relevance_score: float
    metadata: Dict[str, Any]


# === Project Schemas ===

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    requirements: List[str] = []
    goals: List[str] = []


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    requirements: Optional[List[str]] = None
    goals: Optional[List[str]] = None
    notes: Optional[str] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    status: ProjectStatus
    requirements: List[str]
    goals: List[str]
    notes: Optional[str]
    related_documents: List[str]
    created_at: datetime
    updated_at: datetime


class ProjectIteration(BaseModel):
    project_id: str
    message: str
    include_documents: bool = True


# === Memory Schemas ===

class MemoryCreate(BaseModel):
    content: str
    memory_type: MemoryType
    source: Optional[str] = None
    confidence: float = 1.0


class MemoryUpdate(BaseModel):
    content: Optional[str] = None
    memory_type: Optional[MemoryType] = None
    confidence: Optional[float] = None


class MemoryResponse(BaseModel):
    id: str
    content: str
    memory_type: MemoryType
    source: Optional[str]
    confidence: float
    created_at: datetime
    updated_at: datetime


class MemorySearch(BaseModel):
    query: Optional[str] = None
    memory_types: List[MemoryType] = []
    min_confidence: float = 0.0


class UserProfile(BaseModel):
    name: str
    age: Optional[int] = None
    job: Optional[str] = None
    location: Optional[str] = None
    background: Optional[str] = None
    interests: List[str] = []
    preferences: Dict[str, Any] = {}


# === Writing Studio Schemas ===

class WritingRequest(BaseModel):
    mode: WritingMode
    input_text: str
    context: Optional[str] = None
    style_hints: Optional[str] = None
    additional_instructions: Optional[str] = None


class WritingResponse(BaseSchema):
    drafts: List[str]
    model_used: str
    style_notes: Optional[str] = None


class WritingRefine(BaseModel):
    draft: str
    feedback: str
    mode: WritingMode


# === Web Capture Schemas ===

class WebCapture(BaseModel):
    url: str
    title: str
    content: str
    captured_at: Optional[datetime] = None


class WebCaptureResponse(BaseModel):
    id: str
    url: str
    title: str
    summary: str
    key_points: List[str]
    tags: List[str]
    indexed: bool


# === Settings Schemas ===

class WatchFolder(BaseModel):
    path: str
    enabled: bool = True
    recursive: bool = True


class SettingsUpdate(BaseSchema):
    watch_folders: Optional[List[WatchFolder]] = None
    default_model: Optional[str] = None
    model_routing: Optional[Dict[str, str]] = None


class SettingsResponse(BaseSchema):
    watch_folders: List[WatchFolder]
    available_models: List[str]
    model_routing: Dict[str, str]
    user_profile: UserProfile


# === Model Info ===

class ModelInfo(BaseModel):
    name: str
    size: str
    available: bool
    description: str


class ModelStatus(BaseModel):
    models: List[ModelInfo]
    ollama_running: bool
