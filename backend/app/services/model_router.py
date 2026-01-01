"""Smart model routing service"""
import re
from typing import Tuple, Optional, List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from ..models.schemas import TaskType
from ..models.database import ModelUsageLog
from ..core.config import settings
from .ollama_service import ollama_service


class ModelRouter:
    """
    Intelligent model routing based on query analysis.
    Selects the optimal model for each task type.
    """

    # Keywords and patterns for task classification
    TASK_PATTERNS = {
        TaskType.CODE: [
            r'\bcode\b', r'\bfunction\b', r'\bclass\b', r'\bpython\b',
            r'\bjavascript\b', r'\bprogram\b', r'\bdebug\b', r'\bfix\s+this\b',
            r'\bimport\b', r'\bdef\b', r'\breturn\b', r'\bfor\s+loop\b',
            r'\bsyntax\b', r'\bcompile\b', r'\bscript\b'
        ],
        TaskType.EMAIL: [
            r'\bemail\b', r'\breply\b', r'\brespond\s+to\b', r'\bdraft\b',
            r'\bsubject\s+line\b', r'\bprofessional\s+message\b',
            r'\bdear\b.*letter', r'\bthank\s+you\s+note\b'
        ],
        TaskType.RESUME: [
            r'\bresume\b', r'\bcv\b', r'\bcover\s+letter\b', r'\bjob\s+application\b',
            r'\bwork\s+experience\b', r'\bqualifications\b', r'\bhiring\b'
        ],
        TaskType.CREATIVE: [
            r'\bstory\b', r'\bpoem\b', r'\bcreative\b', r'\bimagine\b',
            r'\bfiction\b', r'\bcharacter\b', r'\bplot\b', r'\bwrite\s+a\b',
            r'\bnarrative\b', r'\bdialogue\b', r'\bscene\b'
        ],
        TaskType.WRITING: [
            r'\bwrite\b', r'\bcompose\b', r'\barticle\b', r'\bblog\b',
            r'\bessay\b', r'\bparagraph\b', r'\brewrite\b', r'\bparaphrase\b',
            r'\bsummarize\b.*long', r'\bexpand\b', r'\belaborate\b'
        ],
        TaskType.DOCUMENT_ANALYSIS: [
            r'\bdocument\b', r'\bpdf\b', r'\bfile\b', r'\banalyze\b',
            r'\breview\b', r'\bextract\b', r'\bfrom\s+the\b.*\b(document|file|pdf)\b',
            r'\bwhat\s+does\s+(the|this)\b.*\bsay\b'
        ],
        TaskType.RAG_QUERY: [
            r'\bmy\s+(documents?|files?|notes?)\b', r'\bsearch\s+my\b',
            r'\bfind\s+in\b', r'\baccording\s+to\b', r'\bwhat\s+do\s+i\s+have\b',
            r'\bin\s+my\s+(files?|documents?)\b'
        ],
        TaskType.SUMMARY: [
            r'\bsummarize\b', r'\bsummary\b', r'\btl;?dr\b', r'\bkey\s+points\b',
            r'\bmain\s+ideas?\b', r'\boverview\b', r'\bbrief\b'
        ],
        TaskType.QUESTION: [
            r'^(what|who|where|when|why|how|can|could|would|should|is|are|do|does)\b',
            r'\?$', r'\bexplain\b', r'\btell\s+me\b', r'\bwhat\s+is\b'
        ]
    }

    # Task complexity indicators
    COMPLEXITY_INDICATORS = {
        'high': [
            r'\bdetailed\b', r'\bcomprehensive\b', r'\bin-depth\b',
            r'\bthorough\b', r'\bcomplete\b', r'\blong-form\b',
            r'\bprofessional\b', r'\bpolished\b'
        ],
        'low': [
            r'\bquick\b', r'\bbrief\b', r'\bsimple\b', r'\bshort\b',
            r'\bjust\b', r'\bonly\b', r'\bbasic\b'
        ]
    }

    def __init__(self):
        self.user_preferences: Dict[TaskType, str] = {}

    def analyze_query(self, query: str) -> Tuple[TaskType, str, str]:
        """
        Analyze a query and determine the best task type and model.

        Returns:
            Tuple of (TaskType, model_name, routing_reason)
        """
        query_lower = query.lower()

        # Score each task type
        scores: Dict[TaskType, int] = {task: 0 for task in TaskType}

        for task_type, patterns in self.TASK_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, query_lower):
                    scores[task_type] += 1

        # Get the highest scoring task type
        best_task = max(scores.items(), key=lambda x: x[1])

        # Default to CHAT if no patterns matched
        if best_task[1] == 0:
            task_type = TaskType.CHAT
            reason = "General conversation (no specific task patterns detected)"
        else:
            task_type = best_task[0]
            reason = f"Detected {task_type.value} task based on query patterns"

        # Check complexity for model selection
        complexity = self._assess_complexity(query_lower)

        # Determine model
        model = self._select_model(task_type, complexity)

        # Adjust reason based on complexity
        if complexity == 'high':
            reason += " - using high-quality model for detailed output"
        elif complexity == 'low' and task_type in [TaskType.WRITING, TaskType.CREATIVE]:
            reason += " - using fast model for quick draft"

        return task_type, model, reason

    def _assess_complexity(self, query: str) -> str:
        """Assess the complexity level requested"""
        high_score = sum(1 for p in self.COMPLEXITY_INDICATORS['high']
                        if re.search(p, query))
        low_score = sum(1 for p in self.COMPLEXITY_INDICATORS['low']
                       if re.search(p, query))

        if high_score > low_score:
            return 'high'
        elif low_score > high_score:
            return 'low'
        return 'normal'

    def _select_model(self, task_type: TaskType, complexity: str) -> str:
        """Select the best model for the task and complexity"""
        # Check user preferences first
        if task_type in self.user_preferences:
            return self.user_preferences[task_type]

        # High complexity always uses quality model
        if complexity == 'high':
            return settings.MODELS['quality']

        # Map task types to model tiers
        task_model_mapping = {
            TaskType.CHAT: 'fast',
            TaskType.QUESTION: 'fast',
            TaskType.CODE: 'fast',
            TaskType.SUMMARY: 'document',
            TaskType.DOCUMENT_ANALYSIS: 'document',
            TaskType.RAG_QUERY: 'document',
            TaskType.WRITING: 'quality' if complexity != 'low' else 'balanced',
            TaskType.CREATIVE: 'quality' if complexity != 'low' else 'balanced',
            TaskType.EMAIL: 'quality',
            TaskType.RESUME: 'quality'
        }

        tier = task_model_mapping.get(task_type, 'fast')
        return settings.MODELS[tier]

    async def learn_from_override(
        self,
        db: AsyncSession,
        task_type: TaskType,
        auto_model: str,
        user_model: str
    ):
        """Learn from user model override to improve future routing"""
        log = ModelUsageLog(
            task_type=task_type.value,
            auto_selected_model=auto_model,
            user_override_model=user_model,
            was_override=True
        )
        db.add(log)
        await db.commit()

        # Update preferences if user consistently overrides
        await self._update_preferences(db, task_type)

    async def _update_preferences(self, db: AsyncSession, task_type: TaskType):
        """Update learned preferences based on usage history"""
        # Get recent overrides for this task type
        query = select(ModelUsageLog).where(
            ModelUsageLog.task_type == task_type.value,
            ModelUsageLog.was_override == True
        ).order_by(ModelUsageLog.created_at.desc()).limit(10)

        result = await db.execute(query)
        logs = result.scalars().all()

        if len(logs) >= 3:
            # Check if user consistently uses same override model
            override_models = [log.user_override_model for log in logs]
            most_common = max(set(override_models), key=override_models.count)
            if override_models.count(most_common) >= 2:
                self.user_preferences[task_type] = most_common

    async def record_feedback(
        self,
        db: AsyncSession,
        task_type: TaskType,
        model: str,
        feedback: str
    ):
        """Record user feedback on model selection"""
        log = ModelUsageLog(
            task_type=task_type.value,
            auto_selected_model=model,
            was_override=False,
            user_feedback=feedback
        )
        db.add(log)
        await db.commit()

    def get_routing_explanation(self, task_type: TaskType, model: str) -> str:
        """Get a user-friendly explanation of the routing decision"""
        model_names = {v: k for k, v in settings.MODELS.items()}
        tier = model_names.get(model, 'unknown')

        explanations = {
            'fast': f"Using {model} for quick, responsive answers",
            'balanced': f"Using {model} for balanced speed and quality",
            'document': f"Using {model} for thorough document analysis",
            'quality': f"Using {model} for high-quality, detailed output"
        }

        return explanations.get(tier, f"Using {model}")


# Singleton instance
model_router = ModelRouter()
