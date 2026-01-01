"""Document processing and text extraction"""
import os
from pathlib import Path
from typing import Dict, Any, Optional
import asyncio
from datetime import datetime

# Document processing libraries
import markdown
from bs4 import BeautifulSoup
import html2text


class DocumentProcessor:
    """Process various document formats and extract text"""

    SUPPORTED_EXTENSIONS = {
        '.txt': 'text',
        '.md': 'markdown',
        '.markdown': 'markdown',
        '.html': 'html',
        '.htm': 'html',
        '.pdf': 'pdf',
        '.docx': 'docx',
        '.doc': 'docx',
        '.py': 'code',
        '.js': 'code',
        '.ts': 'code',
        '.jsx': 'code',
        '.tsx': 'code',
        '.java': 'code',
        '.cpp': 'code',
        '.c': 'code',
        '.h': 'code',
        '.css': 'code',
        '.scss': 'code',
        '.json': 'code',
        '.yaml': 'code',
        '.yml': 'code',
        '.xml': 'code',
        '.sql': 'code',
        '.sh': 'code',
        '.bash': 'code',
        '.rs': 'code',
        '.go': 'code',
        '.rb': 'code',
        '.php': 'code',
        '.swift': 'code',
        '.kt': 'code',
        '.scala': 'code',
        '.r': 'code',
        '.csv': 'data',
        '.tsv': 'data',
    }

    def __init__(self):
        self.html_converter = html2text.HTML2Text()
        self.html_converter.ignore_links = False
        self.html_converter.ignore_images = True
        self.html_converter.body_width = 0

    async def process_file(self, path: Path) -> Dict[str, Any]:
        """
        Process a file and extract its content.

        Returns dict with:
            - content: extracted text content
            - file_type: type category
            - title: document title if found
            - metadata: additional metadata
        """
        ext = path.suffix.lower()
        file_type = self.SUPPORTED_EXTENSIONS.get(ext, 'unknown')

        if file_type == 'unknown':
            # Try to read as text anyway
            try:
                content = await self._read_text_file(path)
                return {
                    'content': content,
                    'file_type': 'text',
                    'title': path.stem,
                    'metadata': {'original_extension': ext}
                }
            except Exception:
                raise ValueError(f"Unsupported file type: {ext}")

        # Route to appropriate processor
        processors = {
            'text': self._process_text,
            'markdown': self._process_markdown,
            'html': self._process_html,
            'pdf': self._process_pdf,
            'docx': self._process_docx,
            'code': self._process_code,
            'data': self._process_data,
        }

        processor = processors.get(file_type, self._process_text)
        return await processor(path)

    async def _read_text_file(self, path: Path) -> str:
        """Read a text file with encoding detection"""
        encodings = ['utf-8', 'utf-16', 'latin-1', 'cp1252']

        for encoding in encodings:
            try:
                return path.read_text(encoding=encoding)
            except (UnicodeDecodeError, LookupError):
                continue

        raise ValueError(f"Could not decode file: {path}")

    async def _process_text(self, path: Path) -> Dict[str, Any]:
        """Process plain text file"""
        content = await self._read_text_file(path)
        return {
            'content': content,
            'file_type': 'text',
            'title': path.stem,
            'metadata': {}
        }

    async def _process_markdown(self, path: Path) -> Dict[str, Any]:
        """Process Markdown file"""
        content = await self._read_text_file(path)

        # Extract title from first heading if present
        title = path.stem
        lines = content.split('\n')
        for line in lines:
            if line.startswith('# '):
                title = line[2:].strip()
                break

        # Convert to HTML then to plain text for better chunking
        html = markdown.markdown(content)
        plain_text = self.html_converter.handle(html)

        return {
            'content': plain_text,
            'file_type': 'markdown',
            'title': title,
            'metadata': {'has_frontmatter': content.startswith('---')}
        }

    async def _process_html(self, path: Path) -> Dict[str, Any]:
        """Process HTML file"""
        content = await self._read_text_file(path)
        soup = BeautifulSoup(content, 'html.parser')

        # Extract title
        title = path.stem
        title_tag = soup.find('title')
        if title_tag:
            title = title_tag.get_text().strip()

        # Remove script and style elements
        for element in soup(['script', 'style', 'nav', 'footer', 'header']):
            element.decompose()

        # Get main content
        main_content = soup.find('main') or soup.find('article') or soup.find('body') or soup

        plain_text = self.html_converter.handle(str(main_content))

        return {
            'content': plain_text,
            'file_type': 'html',
            'title': title,
            'metadata': {}
        }

    async def _process_pdf(self, path: Path) -> Dict[str, Any]:
        """Process PDF file"""
        try:
            from PyPDF2 import PdfReader

            reader = PdfReader(str(path))
            text_parts = []

            for page in reader.pages:
                text = page.extract_text()
                if text:
                    text_parts.append(text)

            content = '\n\n'.join(text_parts)

            # Try to get title from metadata
            title = path.stem
            if reader.metadata and reader.metadata.title:
                title = reader.metadata.title

            return {
                'content': content,
                'file_type': 'pdf',
                'title': title,
                'metadata': {
                    'page_count': len(reader.pages),
                    'author': reader.metadata.author if reader.metadata else None
                }
            }
        except Exception as e:
            raise ValueError(f"Could not process PDF: {e}")

    async def _process_docx(self, path: Path) -> Dict[str, Any]:
        """Process Word document"""
        try:
            from docx import Document

            doc = Document(str(path))
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            content = '\n\n'.join(paragraphs)

            # Try to get title from properties
            title = path.stem
            if doc.core_properties.title:
                title = doc.core_properties.title

            return {
                'content': content,
                'file_type': 'docx',
                'title': title,
                'metadata': {
                    'author': doc.core_properties.author,
                    'created': doc.core_properties.created.isoformat() if doc.core_properties.created else None
                }
            }
        except Exception as e:
            raise ValueError(f"Could not process DOCX: {e}")

    async def _process_code(self, path: Path) -> Dict[str, Any]:
        """Process code file"""
        content = await self._read_text_file(path)

        # Add file info as header
        header = f"File: {path.name}\nLanguage: {path.suffix[1:]}\n\n"

        return {
            'content': header + content,
            'file_type': 'code',
            'title': path.name,
            'metadata': {
                'language': path.suffix[1:],
                'line_count': len(content.split('\n'))
            }
        }

    async def _process_data(self, path: Path) -> Dict[str, Any]:
        """Process data files (CSV, TSV, etc.)"""
        content = await self._read_text_file(path)

        # For data files, we keep the raw content but note it's structured
        return {
            'content': content,
            'file_type': 'data',
            'title': path.name,
            'metadata': {
                'row_count': len(content.split('\n')),
                'format': path.suffix[1:]
            }
        }

    def process_web_content(self, html: str, url: str, title: Optional[str] = None) -> Dict[str, Any]:
        """Process captured web content"""
        soup = BeautifulSoup(html, 'html.parser')

        # Extract title
        if not title:
            title_tag = soup.find('title')
            title = title_tag.get_text().strip() if title_tag else url

        # Remove unwanted elements
        for element in soup(['script', 'style', 'nav', 'footer', 'header',
                           'aside', 'iframe', 'noscript', 'form']):
            element.decompose()

        # Try to find main content area
        main_content = (
            soup.find('article') or
            soup.find('main') or
            soup.find(class_=['content', 'article', 'post', 'entry']) or
            soup.find('body') or
            soup
        )

        plain_text = self.html_converter.handle(str(main_content))

        # Clean up excessive whitespace
        lines = [line.strip() for line in plain_text.split('\n')]
        lines = [line for line in lines if line]
        clean_text = '\n\n'.join(lines)

        return {
            'content': clean_text,
            'title': title,
            'url': url
        }


# Singleton instance
document_processor = DocumentProcessor()
