"""Chat and conversation management service"""
from typing import AsyncGenerator, Optional, List, Dict, Any, Tuple
from datetime import datetime
import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from ..models.database import Session as ChatSession, Message
from ..models.schemas import ChatMessage, TaskType, ChatResponse
from ..core.config import settings
from .ollama_service import ollama_service
from .model_router import model_router
from .rag_service import rag_service
from .memory_service import memory_service


class ChatService:
    """Service for managing chat conversations"""

    SYSTEM_PROMPT = """You are Nexus AI, a helpful personal AI assistant. You have access to the user's documents and memories, and you maintain context across conversations.

Key behaviors:
- Be concise but thorough
- Remember context from our conversation
- Reference relevant documents when helpful
- Ask clarifying questions when the user's request is ambiguous
- Adapt your communication style to match the user's preferences

{memory_context}

{document_context}
"""

    async def create_session(
        self,
        db: AsyncSession,
        title: Optional[str] = None
    ) -> ChatSession:
        """Create a new chat session"""
        session = ChatSession(
            title=title or f"Conversation {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        )
        db.add(session)
        await db.commit()
        return session

    async def get_session(
        self,
        db: AsyncSession,
        session_id: str
    ) -> Optional[ChatSession]:
        """Get a session by ID"""
        return await db.get(ChatSession, session_id)

    async def get_or_create_session(
        self,
        db: AsyncSession,
        session_id: Optional[str] = None
    ) -> ChatSession:
        """Get existing session or create new one"""
        if session_id:
            session = await self.get_session(db, session_id)
            if session:
                return session

        return await self.create_session(db)

    async def list_sessions(
        self,
        db: AsyncSession,
        limit: int = 50,
        include_archived: bool = False
    ) -> List[ChatSession]:
        """List chat sessions"""
        stmt = select(ChatSession)
        if not include_archived:
            stmt = stmt.where(ChatSession.is_archived == False)
        stmt = stmt.order_by(ChatSession.updated_at.desc()).limit(limit)

        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_session_messages(
        self,
        db: AsyncSession,
        session_id: str,
        limit: int = 100
    ) -> List[Message]:
        """Get messages for a session"""
        stmt = (
            select(Message)
            .where(Message.session_id == session_id)
            .order_by(Message.created_at.asc())
            .limit(limit)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def add_message(
        self,
        db: AsyncSession,
        session_id: str,
        role: str,
        content: str,
        model_used: Optional[str] = None,
        task_type: Optional[TaskType] = None,
        routing_reason: Optional[str] = None,
        documents_used: List[str] = None
    ) -> Message:
        """Add a message to a session"""
        message = Message(
            session_id=session_id,
            role=role,
            content=content,
            model_used=model_used,
            task_type=task_type.value if task_type else None,
            routing_reason=routing_reason,
            documents_used=documents_used or []
        )
        db.add(message)

        # Update session timestamp
        session = await db.get(ChatSession, session_id)
        if session:
            session.updated_at = datetime.utcnow()

        await db.commit()
        return message

    def _build_messages_for_llm(
        self,
        history: List[Message],
        current_message: str,
        max_history: int = 20
    ) -> List[Dict[str, str]]:
        """Build message list for LLM API"""
        messages = []

        # Add recent history
        for msg in history[-max_history:]:
            messages.append({
                "role": msg.role,
                "content": msg.content
            })

        # Add current message
        messages.append({
            "role": "user",
            "content": current_message
        })

        return messages

    async def chat(
        self,
        db: AsyncSession,
        message: str,
        session_id: Optional[str] = None,
        model_override: Optional[str] = None,
        include_documents: bool = True,
        include_memory: bool = True,
        project_context: Optional[str] = None
    ) -> ChatResponse:
        """Process a chat message and generate response"""
        # Get or create session
        session = await self.get_or_create_session(db, session_id)

        # Analyze query and route to appropriate model
        task_type, auto_model, routing_reason = model_router.analyze_query(message)
        model = model_override or auto_model

        # Log override if applicable
        if model_override and model_override != auto_model:
            await model_router.learn_from_override(
                db, task_type, auto_model, model_override
            )
            routing_reason = f"User selected {model_override} (auto-suggested: {auto_model})"

        # Get memory context
        memory_context = ""
        if include_memory:
            memory_context = await memory_service.get_relevant_context(db, message)

        # Get document context via RAG
        document_context = ""
        documents_used = []
        if include_documents:
            doc_context, doc_titles = await rag_service.get_context_for_query(message)
            if doc_context:
                document_context = f"\nRelevant documents:\n{doc_context}"
                documents_used = doc_titles

        # Add project context if provided
        if project_context:
            document_context += f"\n\nCurrent project context:\n{project_context}"

        # Build system prompt
        system_prompt = self.SYSTEM_PROMPT.format(
            memory_context=memory_context if memory_context else "No specific user context available.",
            document_context=document_context if document_context else "No relevant documents found."
        )

        # Get conversation history
        history = await self.get_session_messages(db, session.id)

        # Build messages
        messages = self._build_messages_for_llm(history, message)

        # Save user message
        await self.add_message(db, session.id, "user", message)

        # Extract memories from user message
        await memory_service.extract_and_store_from_message(db, message, session.id)

        # Generate response
        result = await ollama_service.chat(
            model=model,
            messages=messages,
            system=system_prompt,
            options={"temperature": 0.7}
        )

        response_text = result.get("message", {}).get("content", "")

        # Save assistant message
        await self.add_message(
            db,
            session.id,
            "assistant",
            response_text,
            model_used=model,
            task_type=task_type,
            routing_reason=routing_reason,
            documents_used=documents_used
        )

        # Update session title if it's the first message
        if len(history) == 0:
            # Generate a title from the first message
            session.title = message[:50] + "..." if len(message) > 50 else message
            await db.commit()

        return ChatResponse(
            response=response_text,
            session_id=session.id,
            model_used=model,
            task_type=task_type,
            routing_reason=routing_reason,
            documents_used=documents_used,
            memory_context=memory_context if memory_context else None
        )

    async def chat_stream(
        self,
        db: AsyncSession,
        message: str,
        session_id: Optional[str] = None,
        model_override: Optional[str] = None,
        include_documents: bool = True,
        include_memory: bool = True,
        system_prompt: Optional[str] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream chat response"""
        # Get or create session
        session = await self.get_or_create_session(db, session_id)

        # Analyze query
        task_type, auto_model, routing_reason = model_router.analyze_query(message)
        model = model_override or auto_model

        # Get contexts
        memory_context = ""
        if include_memory:
            memory_context = await memory_service.get_relevant_context(db, message)

        document_context = ""
        documents_used = []
        if include_documents:
            doc_context, doc_titles = await rag_service.get_context_for_query(message)
            if doc_context:
                document_context = f"\nRelevant documents:\n{doc_context}"
                documents_used = doc_titles

        # Build system prompt - use custom if provided, otherwise default
        if system_prompt:
            # Append context to custom system prompt
            context_addon = ""
            if memory_context:
                context_addon += f"\n\nUser Context:\n{memory_context}"
            if document_context:
                context_addon += f"\n{document_context}"
            final_system_prompt = system_prompt + context_addon
        else:
            final_system_prompt = self.SYSTEM_PROMPT.format(
                memory_context=memory_context if memory_context else "No specific user context available.",
                document_context=document_context if document_context else "No relevant documents found."
            )

        # Get history and build messages
        history = await self.get_session_messages(db, session.id)
        messages = self._build_messages_for_llm(history, message)

        # Save user message
        await self.add_message(db, session.id, "user", message)

        # Yield initial metadata
        yield {
            "type": "metadata",
            "session_id": session.id,
            "model_used": model,
            "task_type": task_type.value,
            "routing_reason": routing_reason,
            "documents_used": documents_used
        }

        # Stream response
        full_response = ""
        async for chunk in ollama_service.chat_stream(
            model=model,
            messages=messages,
            system=final_system_prompt,
            options={"temperature": 0.7}
        ):
            if "message" in chunk and "content" in chunk["message"]:
                content = chunk["message"]["content"]
                full_response += content
                yield {
                    "type": "content",
                    "content": content,
                    "done": chunk.get("done", False)
                }

        # Save assistant message
        await self.add_message(
            db,
            session.id,
            "assistant",
            full_response,
            model_used=model,
            task_type=task_type,
            routing_reason=routing_reason,
            documents_used=documents_used
        )

        yield {"type": "done", "full_response": full_response}

    async def delete_session(self, db: AsyncSession, session_id: str) -> bool:
        """Delete a session and all its messages"""
        session = await db.get(ChatSession, session_id)
        if not session:
            return False

        await db.delete(session)
        await db.commit()
        return True

    async def archive_session(self, db: AsyncSession, session_id: str) -> bool:
        """Archive a session"""
        session = await db.get(ChatSession, session_id)
        if not session:
            return False

        session.is_archived = True
        await db.commit()
        return True


# Singleton instance
chat_service = ChatService()
