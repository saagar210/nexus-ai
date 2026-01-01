"""RAG (Retrieval Augmented Generation) service"""
import os
import hashlib
from pathlib import Path
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime
import asyncio

import chromadb
from chromadb.config import Settings as ChromaSettings
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..core.config import settings
from ..models.database import Document
from ..models.schemas import DocumentSearchResult
from .document_processor import document_processor


class RAGService:
    """Service for RAG document indexing and retrieval"""

    def __init__(self):
        self._client: Optional[chromadb.Client] = None
        self._collection: Optional[chromadb.Collection] = None
        self._embedding_model = "nomic-embed-text"  # Good local embedding model

    @property
    def client(self) -> chromadb.Client:
        """Get or create ChromaDB client"""
        if self._client is None:
            self._client = chromadb.Client(ChromaSettings(
                chroma_db_impl="duckdb+parquet",
                persist_directory=str(settings.CHROMADB_DIR),
                anonymized_telemetry=False
            ))
        return self._client

    @property
    def collection(self) -> chromadb.Collection:
        """Get or create the documents collection"""
        if self._collection is None:
            self._collection = self.client.get_or_create_collection(
                name="nexus_documents",
                metadata={"hnsw:space": "cosine"}
            )
        return self._collection

    def _compute_hash(self, content: str) -> str:
        """Compute content hash for change detection"""
        return hashlib.sha256(content.encode()).hexdigest()

    def _chunk_text(
        self,
        text: str,
        chunk_size: int = None,
        overlap: int = None
    ) -> List[Tuple[str, int, int]]:
        """
        Split text into overlapping chunks.
        Returns list of (chunk_text, start_pos, end_pos)
        """
        chunk_size = chunk_size or settings.CHUNK_SIZE
        overlap = overlap or settings.CHUNK_OVERLAP

        chunks = []
        start = 0
        text_len = len(text)

        while start < text_len:
            end = start + chunk_size

            # Try to break at sentence or paragraph boundary
            if end < text_len:
                # Look for paragraph break
                para_break = text.rfind('\n\n', start, end)
                if para_break > start + chunk_size // 2:
                    end = para_break + 2
                else:
                    # Look for sentence break
                    for punct in ['. ', '! ', '? ', '.\n', '!\n', '?\n']:
                        sent_break = text.rfind(punct, start, end)
                        if sent_break > start + chunk_size // 2:
                            end = sent_break + len(punct)
                            break

            chunk = text[start:end].strip()
            if chunk:
                chunks.append((chunk, start, min(end, text_len)))

            start = end - overlap

        return chunks

    async def index_document(
        self,
        db: AsyncSession,
        file_path: Optional[str] = None,
        content: Optional[str] = None,
        title: Optional[str] = None,
        tags: List[str] = None,
        source_url: Optional[str] = None,
        metadata: Dict[str, Any] = None
    ) -> Document:
        """Index a document into the RAG system"""
        tags = tags or []
        metadata = metadata or {}

        # Process file if path provided
        if file_path:
            path = Path(file_path)
            if not path.exists():
                raise FileNotFoundError(f"File not found: {file_path}")

            # Extract content and metadata
            doc_data = await document_processor.process_file(path)
            content = doc_data['content']
            title = title or doc_data.get('title', path.stem)
            file_type = doc_data['file_type']
            size_bytes = path.stat().st_size
            metadata.update(doc_data.get('metadata', {}))
        else:
            if not content:
                raise ValueError("Either file_path or content must be provided")
            title = title or "Untitled Document"
            file_type = "text"
            size_bytes = len(content.encode())

        # Compute content hash
        content_hash = self._compute_hash(content)

        # Check if document already exists with same hash
        existing = await db.execute(
            select(Document).where(Document.content_hash == content_hash)
        )
        if existing.scalar_one_or_none():
            # Document already indexed, return existing
            return existing.scalar_one()

        # Create document record
        doc = Document(
            title=title,
            file_path=file_path,
            file_type=file_type,
            size_bytes=size_bytes,
            content_hash=content_hash,
            tags=tags,
            metadata=metadata,
            source_url=source_url
        )
        db.add(doc)
        await db.flush()

        # Chunk the content
        chunks = self._chunk_text(content)
        doc.chunk_count = len(chunks)

        # Prepare for ChromaDB
        ids = [f"{doc.id}_chunk_{i}" for i in range(len(chunks))]
        documents = [chunk[0] for chunk in chunks]
        metadatas = [
            {
                "document_id": doc.id,
                "title": title,
                "chunk_index": i,
                "start_pos": chunk[1],
                "end_pos": chunk[2],
                "file_type": file_type,
                "file_path": file_path or "",
                "tags": ",".join(tags)
            }
            for i, chunk in enumerate(chunks)
        ]

        # Add to ChromaDB
        self.collection.add(
            ids=ids,
            documents=documents,
            metadatas=metadatas
        )

        doc.indexed_at = datetime.utcnow()
        await db.commit()

        return doc

    async def search(
        self,
        query: str,
        top_k: int = None,
        filter_tags: List[str] = None,
        file_types: List[str] = None,
        document_ids: List[str] = None
    ) -> List[DocumentSearchResult]:
        """Search for relevant documents"""
        top_k = top_k or settings.TOP_K_RESULTS

        # Build where clause
        where = None
        where_conditions = []

        if filter_tags:
            # ChromaDB doesn't support array contains, so we use string matching
            for tag in filter_tags:
                where_conditions.append({"tags": {"$contains": tag}})

        if file_types:
            where_conditions.append({"file_type": {"$in": file_types}})

        if document_ids:
            where_conditions.append({"document_id": {"$in": document_ids}})

        if len(where_conditions) == 1:
            where = where_conditions[0]
        elif len(where_conditions) > 1:
            where = {"$and": where_conditions}

        # Query ChromaDB
        results = self.collection.query(
            query_texts=[query],
            n_results=top_k,
            where=where,
            include=["documents", "metadatas", "distances"]
        )

        # Format results
        search_results = []
        if results['ids'] and results['ids'][0]:
            for i, chunk_id in enumerate(results['ids'][0]):
                metadata = results['metadatas'][0][i]
                search_results.append(DocumentSearchResult(
                    document_id=metadata['document_id'],
                    title=metadata['title'],
                    chunk_content=results['documents'][0][i],
                    relevance_score=1 - results['distances'][0][i],  # Convert distance to similarity
                    metadata=metadata
                ))

        return search_results

    async def get_context_for_query(
        self,
        query: str,
        max_tokens: int = 2000,
        top_k: int = None
    ) -> Tuple[str, List[str]]:
        """
        Get relevant context for a query to inject into LLM prompt.
        Returns (context_string, list_of_document_titles)
        """
        results = await self.search(query, top_k=top_k)

        if not results:
            return "", []

        context_parts = []
        documents_used = set()
        current_tokens = 0

        for result in results:
            # Rough token estimate (4 chars per token)
            chunk_tokens = len(result.chunk_content) // 4
            if current_tokens + chunk_tokens > max_tokens:
                break

            context_parts.append(
                f"[From: {result.title}]\n{result.chunk_content}"
            )
            documents_used.add(result.title)
            current_tokens += chunk_tokens

        context = "\n\n---\n\n".join(context_parts)
        return context, list(documents_used)

    async def delete_document(self, db: AsyncSession, document_id: str):
        """Delete a document and its chunks"""
        # Delete from ChromaDB
        # Get all chunk IDs for this document
        self.collection.delete(
            where={"document_id": document_id}
        )

        # Mark as deleted in database
        doc = await db.get(Document, document_id)
        if doc:
            doc.is_deleted = True
            await db.commit()

    async def reindex_document(
        self,
        db: AsyncSession,
        document_id: str
    ) -> Optional[Document]:
        """Reindex an existing document"""
        doc = await db.get(Document, document_id)
        if not doc or not doc.file_path:
            return None

        # Delete old chunks
        self.collection.delete(
            where={"document_id": document_id}
        )

        # Reindex
        return await self.index_document(
            db,
            file_path=doc.file_path,
            title=doc.title,
            tags=doc.tags
        )

    def get_stats(self) -> Dict[str, Any]:
        """Get RAG system statistics"""
        return {
            "total_chunks": self.collection.count(),
            "persist_directory": str(settings.CHROMADB_DIR)
        }


# Singleton instance
rag_service = RAGService()
