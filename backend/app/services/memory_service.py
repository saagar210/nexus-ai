"""Persistent memory and knowledge management service"""
import re
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, func

from ..models.database import Memory, Message, Session, UserSettings
from ..models.schemas import MemoryType, MemoryResponse, UserProfile
from ..core.config import settings
from .ollama_service import ollama_service


class MemoryService:
    """Service for managing persistent memory and user knowledge"""

    # Patterns for extracting facts from conversations
    FACT_PATTERNS = [
        # Personal info
        (r"my name is (\w+)", "name", MemoryType.FACT),
        (r"i(?:'m| am) (\d+) years? old", "age", MemoryType.FACT),
        (r"i(?:'m| am) a ([^.]+?) (?:at|for|in)", "job", MemoryType.FACT),
        (r"i work (?:at|for|as) ([^.]+)", "work", MemoryType.FACT),
        (r"i live in ([^.]+)", "location", MemoryType.FACT),
        (r"i(?:'m| am) from ([^.]+)", "origin", MemoryType.FACT),

        # Preferences
        (r"i (?:like|love|enjoy|prefer) ([^.]+)", None, MemoryType.PREFERENCE),
        (r"i (?:don't like|hate|dislike) ([^.]+)", None, MemoryType.PREFERENCE),
        (r"my favorite ([^.]+) is ([^.]+)", None, MemoryType.PREFERENCE),

        # Topics of interest
        (r"i(?:'m| am) (?:interested in|curious about|learning) ([^.]+)", None, MemoryType.TOPIC),
        (r"i(?:'m| am) working on ([^.]+)", None, MemoryType.TOPIC),
    ]

    def __init__(self):
        self._user_profile: Optional[UserProfile] = None

    async def initialize_default_profile(self, db: AsyncSession):
        """Initialize with default user profile if empty"""
        # Check if we already have memories
        result = await db.execute(select(func.count(Memory.id)))
        count = result.scalar()

        if count == 0:
            # Load default profile
            profile = settings.DEFAULT_USER_PROFILE

            # Create memory entries for default profile
            memories = [
                Memory(
                    content=f"User's name is {profile['name']}",
                    memory_type=MemoryType.FACT,
                    category="personal",
                    source="initial_setup",
                    confidence=1.0
                ),
                Memory(
                    content=f"User is {profile['age']} years old",
                    memory_type=MemoryType.FACT,
                    category="personal",
                    source="initial_setup",
                    confidence=1.0
                ),
                Memory(
                    content=f"User works as a {profile['job']}",
                    memory_type=MemoryType.FACT,
                    category="professional",
                    source="initial_setup",
                    confidence=1.0
                ),
                Memory(
                    content=f"User is located in {profile['location']}",
                    memory_type=MemoryType.FACT,
                    category="personal",
                    source="initial_setup",
                    confidence=1.0
                ),
                Memory(
                    content=f"User has a {profile['background']}",
                    memory_type=MemoryType.FACT,
                    category="professional",
                    source="initial_setup",
                    confidence=1.0
                ),
            ]

            # Add interests
            for interest in profile.get('interests', []):
                memories.append(Memory(
                    content=f"User is interested in {interest}",
                    memory_type=MemoryType.TOPIC,
                    category="interests",
                    source="initial_setup",
                    confidence=1.0
                ))

            # Add preferences
            for key, value in profile.get('preferences', {}).items():
                memories.append(Memory(
                    content=f"User preference: {key} = {value}",
                    memory_type=MemoryType.PREFERENCE,
                    category="preferences",
                    source="initial_setup",
                    confidence=1.0
                ))

            for memory in memories:
                db.add(memory)

            await db.commit()

    async def extract_and_store_from_message(
        self,
        db: AsyncSession,
        message: str,
        session_id: str,
        role: str = "user"
    ) -> List[Memory]:
        """Extract facts from a message and store them"""
        if role != "user":
            return []

        extracted = []
        message_lower = message.lower()

        for pattern, category, memory_type in self.FACT_PATTERNS:
            matches = re.finditer(pattern, message_lower)
            for match in matches:
                content = match.group(0)

                # Check for duplicates
                existing = await db.execute(
                    select(Memory).where(
                        Memory.content.ilike(f"%{content}%"),
                        Memory.is_deleted == False
                    )
                )
                if existing.scalar_one_or_none():
                    continue

                memory = Memory(
                    content=content.capitalize(),
                    memory_type=memory_type,
                    category=category or "general",
                    source=f"Extracted from conversation",
                    source_session_id=session_id,
                    confidence=0.8
                )
                db.add(memory)
                extracted.append(memory)

        if extracted:
            await db.commit()

        return extracted

    async def extract_facts_with_llm(
        self,
        db: AsyncSession,
        message: str,
        response: str,
        session_id: str
    ) -> List[Memory]:
        """Use LLM to extract facts from conversation (for deeper analysis)"""
        prompt = f"""Analyze this conversation and extract any new facts about the user.
Return ONLY a JSON array of facts. Each fact should be a simple statement.
If no facts are found, return an empty array [].

User message: {message}
Assistant response: {response}

Extract facts about:
- Personal information (name, age, location, job)
- Preferences and likes/dislikes
- Skills and expertise
- Current projects or interests
- Writing style observations

Return ONLY valid JSON array, nothing else."""

        try:
            result = await ollama_service.generate(
                model=settings.MODELS['fast'],
                prompt=prompt,
                options={"temperature": 0.1}
            )

            response_text = result.get('response', '[]')
            # Try to parse JSON
            import json
            facts = json.loads(response_text)

            extracted = []
            for fact in facts:
                if isinstance(fact, str) and len(fact) > 5:
                    memory = Memory(
                        content=fact,
                        memory_type=MemoryType.FACT,
                        category="extracted",
                        source="LLM extraction",
                        source_session_id=session_id,
                        confidence=0.6
                    )
                    db.add(memory)
                    extracted.append(memory)

            if extracted:
                await db.commit()
            return extracted

        except Exception:
            return []

    async def get_relevant_context(
        self,
        db: AsyncSession,
        query: str,
        limit: int = 10
    ) -> str:
        """Get relevant memory context for a query"""
        # Search memories by relevance
        memories = await self.search(db, query=query, limit=limit)

        if not memories:
            return ""

        # Build context string
        context_parts = ["What I know about you:"]
        for memory in memories:
            context_parts.append(f"- {memory.content}")

        return "\n".join(context_parts)

    async def get_user_profile(self, db: AsyncSession) -> UserProfile:
        """Build user profile from memories"""
        result = await db.execute(
            select(Memory).where(
                Memory.memory_type == MemoryType.FACT,
                Memory.is_deleted == False
            ).order_by(Memory.confidence.desc())
        )
        facts = result.scalars().all()

        # Parse facts into profile
        profile_data = {
            "name": "",
            "age": None,
            "job": None,
            "location": None,
            "background": None,
            "interests": [],
            "preferences": {}
        }

        for fact in facts:
            content = fact.content.lower()
            if "name is" in content:
                match = re.search(r"name is (\w+)", content)
                if match:
                    profile_data["name"] = match.group(1).capitalize()
            elif "years old" in content or "is old" in content:
                match = re.search(r"(\d+)", content)
                if match:
                    profile_data["age"] = int(match.group(1))
            elif "works as" in content or "job" in content:
                profile_data["job"] = fact.content
            elif "located in" in content or "lives in" in content:
                match = re.search(r"(?:in|at) (.+)$", content)
                if match:
                    profile_data["location"] = match.group(1).strip()

        # Get interests
        result = await db.execute(
            select(Memory).where(
                Memory.memory_type == MemoryType.TOPIC,
                Memory.is_deleted == False
            )
        )
        topics = result.scalars().all()
        for topic in topics:
            if "interested in" in topic.content.lower():
                match = re.search(r"interested in (.+)$", topic.content, re.I)
                if match:
                    profile_data["interests"].append(match.group(1).strip())
            else:
                profile_data["interests"].append(topic.content)

        # Get preferences
        result = await db.execute(
            select(Memory).where(
                Memory.memory_type == MemoryType.PREFERENCE,
                Memory.is_deleted == False
            )
        )
        prefs = result.scalars().all()
        for pref in prefs:
            profile_data["preferences"][pref.content] = True

        return UserProfile(**profile_data)

    async def search(
        self,
        db: AsyncSession,
        query: Optional[str] = None,
        memory_types: List[MemoryType] = None,
        categories: List[str] = None,
        min_confidence: float = 0.0,
        limit: int = 50
    ) -> List[Memory]:
        """Search memories"""
        stmt = select(Memory).where(Memory.is_deleted == False)

        if query:
            stmt = stmt.where(Memory.content.ilike(f"%{query}%"))

        if memory_types:
            stmt = stmt.where(Memory.memory_type.in_(memory_types))

        if categories:
            stmt = stmt.where(Memory.category.in_(categories))

        if min_confidence > 0:
            stmt = stmt.where(Memory.confidence >= min_confidence)

        stmt = stmt.order_by(Memory.confidence.desc(), Memory.created_at.desc())
        stmt = stmt.limit(limit)

        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def add_memory(
        self,
        db: AsyncSession,
        content: str,
        memory_type: MemoryType,
        category: Optional[str] = None,
        source: Optional[str] = None,
        confidence: float = 1.0
    ) -> Memory:
        """Add a new memory"""
        memory = Memory(
            content=content,
            memory_type=memory_type,
            category=category,
            source=source,
            confidence=confidence
        )
        db.add(memory)
        await db.commit()
        return memory

    async def update_memory(
        self,
        db: AsyncSession,
        memory_id: str,
        content: Optional[str] = None,
        memory_type: Optional[MemoryType] = None,
        confidence: Optional[float] = None
    ) -> Optional[Memory]:
        """Update an existing memory"""
        memory = await db.get(Memory, memory_id)
        if not memory:
            return None

        if content is not None:
            memory.content = content
        if memory_type is not None:
            memory.memory_type = memory_type
        if confidence is not None:
            memory.confidence = confidence

        memory.updated_at = datetime.utcnow()
        await db.commit()
        return memory

    async def delete_memory(self, db: AsyncSession, memory_id: str) -> bool:
        """Soft delete a memory"""
        memory = await db.get(Memory, memory_id)
        if not memory:
            return False

        memory.is_deleted = True
        await db.commit()
        return True

    async def get_timeline(
        self,
        db: AsyncSession,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get timeline of memories and interactions"""
        # Get memories
        memories_result = await db.execute(
            select(Memory)
            .where(Memory.is_deleted == False)
            .order_by(Memory.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        memories = memories_result.scalars().all()

        timeline = []
        for memory in memories:
            timeline.append({
                "type": "memory",
                "id": memory.id,
                "content": memory.content,
                "memory_type": memory.memory_type.value,
                "category": memory.category,
                "confidence": memory.confidence,
                "source": memory.source,
                "timestamp": memory.created_at.isoformat()
            })

        return sorted(timeline, key=lambda x: x["timestamp"], reverse=True)

    async def export_all(self, db: AsyncSession) -> Dict[str, Any]:
        """Export all memories as JSON"""
        memories = await self.search(db, limit=10000)

        return {
            "exported_at": datetime.utcnow().isoformat(),
            "memories": [
                {
                    "id": m.id,
                    "content": m.content,
                    "type": m.memory_type.value,
                    "category": m.category,
                    "source": m.source,
                    "confidence": m.confidence,
                    "created_at": m.created_at.isoformat(),
                    "updated_at": m.updated_at.isoformat() if m.updated_at else None
                }
                for m in memories
            ]
        }


# Singleton instance
memory_service = MemoryService()
