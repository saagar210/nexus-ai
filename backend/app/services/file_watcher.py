"""File system watcher for auto-indexing documents"""
import asyncio
from pathlib import Path
from typing import Set, Dict, Any
from datetime import datetime
import logging

from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileSystemEvent

from ..core.config import settings
from .document_processor import document_processor

logger = logging.getLogger(__name__)


class DocumentEventHandler(FileSystemEventHandler):
    """Handle file system events for document indexing"""

    def __init__(self, callback):
        self.callback = callback
        self.pending_events: Dict[str, datetime] = {}
        self.debounce_seconds = 2.0

    def _should_process(self, path: str) -> bool:
        """Check if file should be processed"""
        p = Path(path)

        # Skip hidden files and directories
        if any(part.startswith('.') for part in p.parts):
            return False

        # Check supported extensions
        if p.suffix.lower() not in document_processor.SUPPORTED_EXTENSIONS:
            return False

        return True

    def _debounce_event(self, path: str) -> bool:
        """Debounce events to avoid processing the same file multiple times"""
        now = datetime.now()
        last_event = self.pending_events.get(path)

        if last_event and (now - last_event).total_seconds() < self.debounce_seconds:
            return False

        self.pending_events[path] = now
        return True

    def on_created(self, event: FileSystemEvent):
        if event.is_directory:
            return
        if self._should_process(event.src_path) and self._debounce_event(event.src_path):
            logger.info(f"New file detected: {event.src_path}")
            asyncio.create_task(self.callback("created", event.src_path))

    def on_modified(self, event: FileSystemEvent):
        if event.is_directory:
            return
        if self._should_process(event.src_path) and self._debounce_event(event.src_path):
            logger.info(f"File modified: {event.src_path}")
            asyncio.create_task(self.callback("modified", event.src_path))

    def on_deleted(self, event: FileSystemEvent):
        if event.is_directory:
            return
        if self._should_process(event.src_path):
            logger.info(f"File deleted: {event.src_path}")
            asyncio.create_task(self.callback("deleted", event.src_path))


class FileWatcherService:
    """Service for watching folders and auto-indexing documents"""

    def __init__(self):
        self.observer: Observer = None
        self.watched_paths: Set[str] = set()
        self._running = False
        self._index_callback = None

    def set_index_callback(self, callback):
        """Set callback for indexing events"""
        self._index_callback = callback

    async def _handle_event(self, event_type: str, path: str):
        """Handle file system event"""
        if self._index_callback:
            try:
                await self._index_callback(event_type, path)
            except Exception as e:
                logger.error(f"Error handling {event_type} event for {path}: {e}")

    def start(self, paths: list = None):
        """Start watching specified paths"""
        if self._running:
            return

        self.observer = Observer()
        handler = DocumentEventHandler(self._handle_event)

        watch_paths = paths or settings.WATCH_FOLDERS
        watch_paths = [str(settings.DOCUMENTS_DIR)] + watch_paths

        for path in watch_paths:
            path_obj = Path(path)
            if path_obj.exists() and path_obj.is_dir():
                self.observer.schedule(handler, str(path_obj), recursive=True)
                self.watched_paths.add(str(path_obj))
                logger.info(f"Watching folder: {path_obj}")

        self.observer.start()
        self._running = True
        logger.info("File watcher started")

    def stop(self):
        """Stop watching"""
        if self.observer and self._running:
            self.observer.stop()
            self.observer.join()
            self._running = False
            self.watched_paths.clear()
            logger.info("File watcher stopped")

    def add_watch_folder(self, path: str) -> bool:
        """Add a new folder to watch"""
        path_obj = Path(path)
        if not path_obj.exists() or not path_obj.is_dir():
            return False

        if str(path_obj) in self.watched_paths:
            return True

        if self._running:
            handler = DocumentEventHandler(self._handle_event)
            self.observer.schedule(handler, str(path_obj), recursive=True)
            self.watched_paths.add(str(path_obj))
            logger.info(f"Added watch folder: {path_obj}")

        return True

    def remove_watch_folder(self, path: str) -> bool:
        """Remove a folder from watching"""
        if path in self.watched_paths:
            self.watched_paths.discard(path)
            # Note: watchdog doesn't support unscheduling individual paths easily
            # Would need to restart observer to fully remove
            return True
        return False

    def get_watched_folders(self) -> list:
        """Get list of watched folders"""
        return list(self.watched_paths)

    def is_running(self) -> bool:
        """Check if watcher is running"""
        return self._running


# Singleton instance
file_watcher = FileWatcherService()
