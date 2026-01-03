import { useState, useCallback } from "react";
import {
  Search,
  FileText,
  MessageSquare,
  Clock,
  X,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Types for search results
export interface SearchResult {
  id: string;
  type: "message" | "document" | "memory";
  title: string;
  content: string;
  relevanceScore: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  highlights?: string[];
}

interface SemanticSearchProps {
  onSearch: (query: string) => Promise<SearchResult[]>;
  onResultClick?: (result: SearchResult) => void;
  placeholder?: string;
  className?: string;
}

export default function SemanticSearch({
  onSearch,
  onResultClick,
  placeholder = "Search conversations and documents...",
  className = "",
}: SemanticSearchProps): React.ReactElement {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const searchResults = await onSearch(searchQuery);
        setResults(searchResults);
        setIsOpen(true);
      } catch (error) {
        console.error("Search failed:", error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [onSearch],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);

      // Debounced search
      const timeoutId = setTimeout(() => {
        handleSearch(value);
      }, 300);

      return () => clearTimeout(timeoutId);
    },
    [handleSearch],
  );

  const handleResultSelect = useCallback(
    (result: SearchResult) => {
      onResultClick?.(result);
      setIsOpen(false);
      setQuery("");
    },
    [onResultClick],
  );

  const getTypeIcon = (type: SearchResult["type"]): React.ReactNode => {
    switch (type) {
      case "message":
        return <MessageSquare size={14} />;
      case "document":
        return <FileText size={14} />;
      case "memory":
        return <Clock size={14} />;
      default:
        return <FileText size={14} />;
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-9 pr-9 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500"
        />
        {isSearching && (
          <Loader2
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin"
          />
        )}
        {query && !isSearching && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && results.length > 0 && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl z-20 max-h-96 overflow-y-auto">
            {results.map((result) => (
              <button
                key={result.id}
                onClick={() => handleResultSelect(result)}
                className="w-full flex items-start gap-3 p-3 hover:bg-muted text-left border-b border-border last:border-0"
              >
                <div className="mt-0.5 text-muted-foreground">
                  {getTypeIcon(result.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">
                      {result.title}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDistanceToNow(result.timestamp, {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {result.highlights?.[0] || result.content.slice(0, 150)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted capitalize">
                      {result.type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(result.relevanceScore * 100)}% match
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* No results */}
      {isOpen && query && !isSearching && results.length === 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl z-20 p-4 text-center text-sm text-muted-foreground">
          No results found for "{query}"
        </div>
      )}
    </div>
  );
}

// Hook for semantic search functionality
export function useSemanticSearch(): {
  search: (query: string, options?: SearchOptions) => Promise<SearchResult[]>;
  searchHistory: string[];
  addToHistory: (query: string) => void;
  clearHistory: () => void;
} {
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Simple local search implementation
  const search = useCallback(
    async (
      _query: string,
      options?: SearchOptions,
    ): Promise<SearchResult[]> => {
      // This would normally call a backend API with vector search
      // For now, we'll simulate with basic text matching

      // Options unused in placeholder - will be used in real implementation
      void options;

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 200));

      // In a real implementation, this would:
      // 1. Convert query to embeddings
      // 2. Search vector database
      // 3. Return ranked results

      return [];
    },
    [],
  );

  const addToHistory = useCallback((query: string) => {
    setSearchHistory((prev) => {
      const filtered = prev.filter((q) => q !== query);
      return [query, ...filtered].slice(0, 10);
    });
  }, []);

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
  }, []);

  return { search, searchHistory, addToHistory, clearHistory };
}

interface SearchOptions {
  sources?: Array<"messages" | "documents" | "memories">;
  limit?: number;
  dateRange?: { start: Date; end: Date };
}

// Search filters component
interface SearchFiltersProps {
  filters: {
    types: Array<"message" | "document" | "memory">;
    dateRange: { start: Date | null; end: Date | null };
  };
  onFiltersChange: (filters: SearchFiltersProps["filters"]) => void;
}

export function SearchFilters({
  filters,
  onFiltersChange,
}: SearchFiltersProps): React.ReactElement {
  const typeOptions: Array<{
    value: "message" | "document" | "memory";
    label: string;
  }> = [
    { value: "message", label: "Messages" },
    { value: "document", label: "Documents" },
    { value: "memory", label: "Memories" },
  ];

  const toggleType = (type: "message" | "document" | "memory"): void => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    onFiltersChange({ ...filters, types: newTypes });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {typeOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => toggleType(option.value)}
          className={`px-2 py-1 rounded text-xs transition-colors ${
            filters.types.includes(option.value)
              ? "bg-nexus-500 text-white"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
