"""SQLAlchemy database models"""
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, DateTime, JSON,
    ForeignKey, Enum as SQLEnum, Index
)
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from ..core.database import Base
from .schemas import ProjectStatus, MemoryType, WritingMode


def generate_uuid():
    """Generate a new UUID string"""
    return str(uuid.uuid4())


class Session(Base):
    """Chat session/conversation"""
    __tablename__ = "sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False, default="New Conversation")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_archived = Column(Boolean, default=False)

    # Relationships
    messages = relationship("Message", back_populates="session", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_sessions_updated", "updated_at"),
    )


class Message(Base):
    """Individual chat message"""
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("sessions.id"), nullable=False)
    role = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    model_used = Column(String(100))
    task_type = Column(String(50))
    routing_reason = Column(Text)
    documents_used = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    session = relationship("Session", back_populates="messages")

    __table_args__ = (
        Index("idx_messages_session", "session_id"),
        Index("idx_messages_created", "created_at"),
    )


class Document(Base):
    """Indexed document"""
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(500), nullable=False)
    file_path = Column(String(1000))
    file_type = Column(String(50), nullable=False)
    size_bytes = Column(Integer, default=0)
    content_hash = Column(String(64))  # For change detection
    tags = Column(JSON, default=list)
    doc_metadata = Column(JSON, default=dict)
    chunk_count = Column(Integer, default=0)
    source_url = Column(String(2000))  # For web captures
    created_at = Column(DateTime, default=datetime.utcnow)
    indexed_at = Column(DateTime)
    is_deleted = Column(Boolean, default=False)

    __table_args__ = (
        Index("idx_documents_path", "file_path"),
        Index("idx_documents_type", "file_type"),
        Index("idx_documents_hash", "content_hash"),
    )


class DocumentChunk(Base):
    """Document chunks for RAG"""
    __tablename__ = "document_chunks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    document_id = Column(String(36), ForeignKey("documents.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    embedding_id = Column(String(100))  # ID in ChromaDB
    chunk_metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_chunks_document", "document_id"),
    )


class Project(Base):
    """Project/task tracker"""
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(SQLEnum(ProjectStatus), default=ProjectStatus.IDEATION)
    requirements = Column(JSON, default=list)
    goals = Column(JSON, default=list)
    notes = Column(Text)
    related_documents = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_archived = Column(Boolean, default=False)

    # Relationships
    iterations = relationship("ProjectIteration", back_populates="project", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_projects_status", "status"),
    )


class ProjectIteration(Base):
    """Project iteration/conversation"""
    __tablename__ = "project_iterations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    user_message = Column(Text, nullable=False)
    ai_response = Column(Text)
    model_used = Column(String(100))
    documents_referenced = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="iterations")


class Memory(Base):
    """Persistent memory/knowledge about user"""
    __tablename__ = "memories"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    content = Column(Text, nullable=False)
    memory_type = Column(SQLEnum(MemoryType), nullable=False)
    category = Column(String(100))  # e.g., "personal", "work", "preferences"
    source = Column(Text)  # Where this memory came from
    source_session_id = Column(String(36))
    confidence = Column(Float, default=1.0)
    access_count = Column(Integer, default=0)
    last_accessed = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_deleted = Column(Boolean, default=False)

    __table_args__ = (
        Index("idx_memories_type", "memory_type"),
        Index("idx_memories_category", "category"),
        Index("idx_memories_confidence", "confidence"),
    )


class WritingDraft(Base):
    """Writing studio drafts"""
    __tablename__ = "writing_drafts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    mode = Column(SQLEnum(WritingMode), nullable=False)
    input_text = Column(Text, nullable=False)
    context = Column(Text)
    draft_content = Column(Text, nullable=False)
    revision_number = Column(Integer, default=1)
    model_used = Column(String(100))
    style_notes = Column(Text)
    is_favorite = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_drafts_mode", "mode"),
    )


class WebCapture(Base):
    """Captured web articles"""
    __tablename__ = "web_captures"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    url = Column(String(2000), nullable=False)
    title = Column(String(500))
    raw_content = Column(Text)
    clean_content = Column(Text)
    summary = Column(Text)
    key_points = Column(JSON, default=list)
    tags = Column(JSON, default=list)
    document_id = Column(String(36), ForeignKey("documents.id"))
    captured_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime)

    __table_args__ = (
        Index("idx_webcaptures_url", "url"),
    )


class UserSettings(Base):
    """User settings and preferences"""
    __tablename__ = "user_settings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(JSON)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ModelUsageLog(Base):
    """Track model usage for learning routing preferences"""
    __tablename__ = "model_usage_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    task_type = Column(String(50), nullable=False)
    auto_selected_model = Column(String(100))
    user_override_model = Column(String(100))
    was_override = Column(Boolean, default=False)
    user_feedback = Column(String(50))  # 'good', 'bad', 'neutral'
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_modelusage_task", "task_type"),
    )
