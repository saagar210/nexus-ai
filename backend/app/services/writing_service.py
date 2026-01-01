"""Writing studio service for drafting emails, resumes, and creative content"""
from typing import List, Optional, Dict, Any
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..models.database import WritingDraft, Memory
from ..models.schemas import WritingMode, WritingRequest, WritingResponse, MemoryType
from ..core.config import settings
from .ollama_service import ollama_service
from .memory_service import memory_service


class WritingService:
    """Service for AI-assisted writing"""

    # Mode-specific prompts
    MODE_PROMPTS = {
        WritingMode.EMAIL_RESPONSE: """You are helping draft a professional email response.

Guidelines:
- Match the tone of the original email (formal/casual)
- Be concise and clear
- Include appropriate greeting and sign-off
- Address all points raised in the original email

{style_context}

{user_input}

Draft a professional email response:""",

        WritingMode.COVER_LETTER: """You are helping write a cover letter for a job application.

Guidelines:
- Be professional and enthusiastic
- Highlight relevant experience and skills
- Show knowledge of the company/role
- Keep it concise (3-4 paragraphs)
- End with a call to action

{style_context}

User background: {user_background}

{user_input}

Write a compelling cover letter:""",

        WritingMode.RESUME: """You are helping improve or draft resume content.

Guidelines:
- Use action verbs (led, developed, implemented)
- Quantify achievements where possible
- Be concise - bullet points preferred
- Focus on impact and results
- Tailor to the target role if specified

{style_context}

{user_input}

Provide the resume content:""",

        WritingMode.CREATIVE: """You are a creative writing assistant.

Guidelines:
- Be imaginative and engaging
- Match the requested tone and style
- Create vivid descriptions
- Develop compelling narratives

{style_context}

{user_input}

Write the creative content:""",

        WritingMode.GENERAL: """You are a writing assistant helping with general writing tasks.

Guidelines:
- Be clear and concise
- Match the appropriate tone
- Ensure logical flow
- Proofread for clarity

{style_context}

{user_input}

Provide the written content:"""
    }

    async def get_user_style_context(self, db: AsyncSession) -> str:
        """Get user's writing style preferences from memory"""
        # Get writing style memories
        result = await db.execute(
            select(Memory).where(
                Memory.memory_type == MemoryType.WRITING_STYLE,
                Memory.is_deleted == False
            )
        )
        styles = result.scalars().all()

        if not styles:
            return "No specific writing style preferences learned yet."

        style_notes = ["User's writing style preferences:"]
        for style in styles:
            style_notes.append(f"- {style.content}")

        return "\n".join(style_notes)

    async def get_user_background(self, db: AsyncSession) -> str:
        """Get user's professional background from memory"""
        profile = await memory_service.get_user_profile(db)

        parts = []
        if profile.name:
            parts.append(f"Name: {profile.name}")
        if profile.job:
            parts.append(f"Current role: {profile.job}")
        if profile.location:
            parts.append(f"Location: {profile.location}")
        if profile.background:
            parts.append(f"Background: {profile.background}")

        return "\n".join(parts) if parts else "No background information available."

    async def generate_drafts(
        self,
        db: AsyncSession,
        request: WritingRequest,
        num_drafts: int = 2
    ) -> WritingResponse:
        """Generate writing drafts based on the request"""
        # Get style context
        style_context = await self.get_user_style_context(db)
        user_background = await self.get_user_background(db)

        # Build the prompt
        base_prompt = self.MODE_PROMPTS.get(request.mode, self.MODE_PROMPTS[WritingMode.GENERAL])

        user_input = request.input_text
        if request.context:
            user_input = f"Context: {request.context}\n\nRequest: {request.input_text}"
        if request.additional_instructions:
            user_input += f"\n\nAdditional instructions: {request.additional_instructions}"

        prompt = base_prompt.format(
            style_context=style_context,
            user_background=user_background,
            user_input=user_input
        )

        # Use quality model for writing tasks
        model = settings.MODELS['quality']

        drafts = []
        for i in range(num_drafts):
            # Vary temperature slightly for different drafts
            temperature = 0.7 + (i * 0.1)

            result = await ollama_service.generate(
                model=model,
                prompt=prompt,
                options={"temperature": temperature}
            )

            draft_content = result.get('response', '')
            drafts.append(draft_content)

            # Save draft to database
            draft = WritingDraft(
                mode=request.mode,
                input_text=request.input_text,
                context=request.context,
                draft_content=draft_content,
                model_used=model,
                style_notes=style_context if i == 0 else None
            )
            db.add(draft)

        await db.commit()

        return WritingResponse(
            drafts=drafts,
            model_used=model,
            style_notes=style_context
        )

    async def refine_draft(
        self,
        db: AsyncSession,
        draft: str,
        feedback: str,
        mode: WritingMode
    ) -> WritingResponse:
        """Refine a draft based on user feedback"""
        prompt = f"""You are refining a piece of writing based on user feedback.

Original draft:
{draft}

User feedback:
{feedback}

Please revise the draft to address the feedback while maintaining the overall quality and purpose.

Revised version:"""

        model = settings.MODELS['quality']

        result = await ollama_service.generate(
            model=model,
            prompt=prompt,
            options={"temperature": 0.6}
        )

        refined = result.get('response', '')

        # Save refined draft
        refined_draft = WritingDraft(
            mode=mode,
            input_text=f"Refinement of: {draft[:100]}...",
            context=f"Feedback: {feedback}",
            draft_content=refined,
            model_used=model,
            revision_number=2  # Could track actual revision numbers
        )
        db.add(refined_draft)
        await db.commit()

        return WritingResponse(
            drafts=[refined],
            model_used=model
        )

    async def expand_bullets(
        self,
        db: AsyncSession,
        bullets: List[str],
        mode: WritingMode,
        context: Optional[str] = None
    ) -> WritingResponse:
        """Expand bullet points into full prose"""
        bullet_text = "\n".join(f"- {b}" for b in bullets)

        prompt = f"""Expand these bullet points into well-written prose.

Bullet points:
{bullet_text}

{f'Context: {context}' if context else ''}

Write a coherent, well-structured piece based on these points:"""

        model = settings.MODELS['quality']

        result = await ollama_service.generate(
            model=model,
            prompt=prompt,
            options={"temperature": 0.7}
        )

        expanded = result.get('response', '')

        return WritingResponse(
            drafts=[expanded],
            model_used=model
        )

    async def draft_email_response(
        self,
        db: AsyncSession,
        email_thread: str,
        instructions: Optional[str] = None
    ) -> WritingResponse:
        """Generate a response to an email thread"""
        style_context = await self.get_user_style_context(db)

        prompt = f"""You are helping draft a reply to the following email thread.

{style_context}

Email thread:
{email_thread}

{f'User instructions: {instructions}' if instructions else 'Write a professional and appropriate response.'}

Draft email response:"""

        model = settings.MODELS['quality']

        # Generate two variations
        drafts = []
        for temp in [0.6, 0.8]:
            result = await ollama_service.generate(
                model=model,
                prompt=prompt,
                options={"temperature": temp}
            )
            drafts.append(result.get('response', ''))

        return WritingResponse(
            drafts=drafts,
            model_used=model,
            style_notes=style_context
        )

    async def learn_writing_style(
        self,
        db: AsyncSession,
        sample_text: str,
        text_type: str = "general"
    ) -> Dict[str, Any]:
        """Analyze a text sample to learn user's writing style"""
        prompt = f"""Analyze this writing sample and identify the author's writing style characteristics.

Sample text:
{sample_text}

Identify:
1. Tone (formal, casual, professional, friendly, etc.)
2. Vocabulary level (simple, technical, academic, etc.)
3. Sentence structure preferences (short and punchy, long and flowing, etc.)
4. Common phrases or patterns
5. Overall style description

Provide your analysis in a clear, structured format:"""

        model = settings.MODELS['document']

        result = await ollama_service.generate(
            model=model,
            prompt=prompt,
            options={"temperature": 0.3}
        )

        analysis = result.get('response', '')

        # Store as writing style memory
        style_memory = Memory(
            content=f"Writing style ({text_type}): {analysis[:500]}",
            memory_type=MemoryType.WRITING_STYLE,
            category=text_type,
            source="Writing sample analysis",
            confidence=0.8
        )
        db.add(style_memory)
        await db.commit()

        return {
            "analysis": analysis,
            "stored": True,
            "memory_id": style_memory.id
        }

    async def get_recent_drafts(
        self,
        db: AsyncSession,
        mode: Optional[WritingMode] = None,
        limit: int = 20
    ) -> List[WritingDraft]:
        """Get recent writing drafts"""
        stmt = select(WritingDraft).order_by(WritingDraft.created_at.desc())

        if mode:
            stmt = stmt.where(WritingDraft.mode == mode)

        stmt = stmt.limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def favorite_draft(
        self,
        db: AsyncSession,
        draft_id: str,
        favorite: bool = True
    ) -> bool:
        """Mark a draft as favorite"""
        draft = await db.get(WritingDraft, draft_id)
        if not draft:
            return False

        draft.is_favorite = favorite
        await db.commit()
        return True


# Singleton instance
writing_service = WritingService()
