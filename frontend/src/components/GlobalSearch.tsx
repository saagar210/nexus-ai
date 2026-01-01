import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  MessageSquare,
  FileText,
  Brain,
  FolderOpen,
  Clock,
  Loader2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { searchDocuments, searchMemories, listSessions } from "../lib/api";
import type { Session, DocumentSearchResult, Memory } from "../types";

interface SearchResult {
  id: string;
  type: "session" | "document" | "memory";
  title: string;
  snippet: string;
  timestamp?: string;
  score?: number;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (result: SearchResult) => void;
}

export default function GlobalSearch({
  isOpen,
  onClose,
  onSelectResult,
}: GlobalSearchProps): React.ReactElement | null {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<
    "all" | "chats" | "docs" | "memory"
  >("all");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Search sessions
  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => listSessions(),
    enabled: isOpen,
  });

  // Search documents
  const { data: documentResults = [], isLoading: isSearchingDocs } = useQuery({
    queryKey: ["searchDocs", query],
    queryFn: () => searchDocuments(query, 10),
    enabled: isOpen && query.length >= 2,
  });

  // Search memories
  const { data: memoryResults = [], isLoading: isSearchingMemory } = useQuery({
    queryKey: ["searchMemory", query],
    queryFn: () => searchMemories(query),
    enabled: isOpen && query.length >= 2,
  });

  // Combine and filter results
  const allResults: SearchResult[] = [];

  // Filter sessions by query
  if (activeTab === "all" || activeTab === "chats") {
    const filteredSessions = sessions
      .filter((s: Session) =>
        s.title.toLowerCase().includes(query.toLowerCase()),
      )
      .slice(0, 5)
      .map((s: Session) => ({
        id: s.id,
        type: "session" as const,
        title: s.title,
        snippet: `${s.message_count} messages`,
        timestamp: s.updated_at,
      }));
    allResults.push(...filteredSessions);
  }

  // Add document results
  if (activeTab === "all" || activeTab === "docs") {
    const docResults = documentResults
      .slice(0, 5)
      .map((d: DocumentSearchResult) => ({
        id: d.document_id,
        type: "document" as const,
        title: d.title,
        snippet: d.chunk_content.slice(0, 150) + "...",
        score: d.relevance_score,
      }));
    allResults.push(...docResults);
  }

  // Add memory results
  if (activeTab === "all" || activeTab === "memory") {
    const memResults = memoryResults.slice(0, 5).map((m: Memory) => ({
      id: m.id,
      type: "memory" as const,
      title: m.category || "Memory",
      snippet: m.content.slice(0, 150) + (m.content.length > 150 ? "..." : ""),
      timestamp: m.created_at,
    }));
    allResults.push(...memResults);
  }

  const isLoading = isSearchingDocs || isSearchingMemory;

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery("");
      setSelectedIndex(0);
      setActiveTab("all");
    }
  }, [isOpen]);

  // Reset selection on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeTab]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, allResults.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (allResults[selectedIndex]) {
            onSelectResult(allResults[selectedIndex]);
            onClose();
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
        case "Tab":
          e.preventDefault();
          const tabs: Array<"all" | "chats" | "docs" | "memory"> = [
            "all",
            "chats",
            "docs",
            "memory",
          ];
          const currentIdx = tabs.indexOf(activeTab);
          const nextIdx = e.shiftKey
            ? (currentIdx - 1 + tabs.length) % tabs.length
            : (currentIdx + 1) % tabs.length;
          setActiveTab(tabs[nextIdx]);
          break;
      }
    },
    [allResults, selectedIndex, activeTab, onSelectResult, onClose],
  );

  // Scroll selected into view
  useEffect(() => {
    const selectedElement = listRef.current?.querySelector(
      `[data-index="${selectedIndex}"]`,
    );
    selectedElement?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!isOpen) return null;

  const getTypeIcon = (type: string): React.ReactNode => {
    switch (type) {
      case "session":
        return <MessageSquare size={16} className="text-blue-500" />;
      case "document":
        return <FileText size={16} className="text-green-500" />;
      case "memory":
        return <Brain size={16} className="text-purple-500" />;
      default:
        return <FolderOpen size={16} className="text-muted-foreground" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Search Panel */}
      <div className="relative w-full max-w-2xl bg-card rounded-xl shadow-2xl border border-border overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search size={20} className="text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search everything..."
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
          />
          {isLoading && (
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
          )}
          <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded border border-border">
            ESC
          </kbd>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-muted/30">
          {[
            { id: "all", label: "All" },
            { id: "chats", label: "Chats" },
            { id: "docs", label: "Documents" },
            { id: "memory", label: "Memory" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                activeTab === tab.id
                  ? "bg-nexus-500 text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">
            Tab to switch
          </span>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[400px] overflow-y-auto">
          {query.length < 2 && (
            <div className="py-8 text-center text-muted-foreground">
              Type at least 2 characters to search
            </div>
          )}

          {query.length >= 2 && allResults.length === 0 && !isLoading && (
            <div className="py-8 text-center text-muted-foreground">
              No results found for "{query}"
            </div>
          )}

          {allResults.map((result, idx) => (
            <button
              key={`${result.type}-${result.id}`}
              data-index={idx}
              onClick={() => {
                onSelectResult(result);
                onClose();
              }}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
                selectedIndex === idx ? "bg-nexus-500/10" : "hover:bg-muted"
              }`}
            >
              <div className="mt-0.5">{getTypeIcon(result.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{result.title}</div>
                <div className="text-sm text-muted-foreground line-clamp-2">
                  {result.snippet}
                </div>
              </div>
              {result.timestamp && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock size={12} />
                  {new Date(result.timestamp).toLocaleDateString()}
                </div>
              )}
              {result.score !== undefined && (
                <div className="text-xs text-muted-foreground">
                  {Math.round(result.score * 100)}%
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/50 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 font-mono bg-muted rounded">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 font-mono bg-muted rounded">↵</kbd>
              select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 font-mono bg-muted rounded">Tab</kbd>
              switch tabs
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
