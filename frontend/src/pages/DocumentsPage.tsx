import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  Search,
  FileText,
  Trash2,
  Tag,
  HardDrive,
  Grid,
  List,
} from "lucide-react";
import type { Document } from "../types";
import {
  listDocuments,
  uploadDocument,
  deleteDocument,
  getDocumentStats,
  searchDocuments,
} from "../lib/api";

export default function DocumentsPage(): React.ReactElement {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isDragging, setIsDragging] = useState(false);

  const { data: documents = [] } = useQuery({
    queryKey: ["documents"],
    queryFn: () => listDocuments(),
  });

  const { data: stats } = useQuery({
    queryKey: ["documentStats"],
    queryFn: () => getDocumentStats(),
  });

  const { data: searchResults } = useQuery({
    queryKey: ["documentSearch", searchQuery],
    queryFn: () => searchDocuments(searchQuery),
    enabled: searchQuery.length > 2,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadDocument(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["documentStats"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["documentStats"] });
    },
  });

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      files.forEach((file) => uploadMutation.mutate(file));
    },
    [uploadMutation],
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => uploadMutation.mutate(file));
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-muted-foreground">
            {stats?.total_documents || 0} documents ·{" "}
            {formatBytes(stats?.total_size_bytes || 0)} ·{" "}
            {stats?.total_chunks || 0} chunks
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={18}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="pl-10 pr-4 py-2 bg-muted rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-nexus-500"
            />
          </div>

          <div className="flex items-center bg-muted rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded ${viewMode === "grid" ? "bg-background shadow" : ""}`}
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded ${viewMode === "list" ? "bg-background shadow" : ""}`}
            >
              <List size={18} />
            </button>
          </div>

          <label className="bg-nexus-500 text-white rounded-lg px-4 py-2 flex items-center gap-2 cursor-pointer hover:bg-nexus-600 transition-colors">
            <Upload size={18} />
            Upload
            <input
              type="file"
              multiple
              onChange={handleFileInput}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Search Results */}
      {searchQuery.length > 2 && searchResults && searchResults.length > 0 && (
        <div className="mb-6 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-medium mb-2">Search Results</h3>
          <div className="space-y-2">
            {searchResults.slice(0, 5).map((result, idx) => (
              <div key={idx} className="p-3 bg-background rounded border">
                <div className="font-medium text-sm">{result.title}</div>
                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {result.chunk_content}
                </div>
                <div className="text-xs text-nexus-500 mt-1">
                  Relevance: {(result.relevance_score * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drop Zone / Document Grid */}
      <div
        className={`flex-1 overflow-auto rounded-xl border-2 border-dashed transition-colors ${
          isDragging ? "border-nexus-500 bg-nexus-500/5" : "border-border"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {documents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <HardDrive size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium">No documents yet</p>
            <p className="text-sm">Drag and drop files here or click Upload</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-4 gap-4 p-4">
            {documents.map((doc: Document) => (
              <div
                key={doc.id}
                className="group bg-card border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-nexus-500/10 flex items-center justify-center">
                    <FileText className="text-nexus-500" size={20} />
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(doc.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-opacity"
                  >
                    <Trash2 size={14} className="text-destructive" />
                  </button>
                </div>
                <h3 className="font-medium text-sm truncate" title={doc.title}>
                  {doc.title}
                </h3>
                <div className="text-xs text-muted-foreground mt-1">
                  {doc.file_type} · {formatBytes(doc.size_bytes)}
                </div>
                {doc.tags.length > 0 && (
                  <div className="flex items-center gap-1 mt-2 flex-wrap">
                    <Tag size={10} className="text-muted-foreground" />
                    {doc.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-muted px-2 py-0.5 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y">
            {documents.map((doc: Document) => (
              <div
                key={doc.id}
                className="flex items-center gap-4 p-4 hover:bg-muted/50 group"
              >
                <FileText className="text-nexus-500" size={20} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{doc.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {doc.file_type} · {formatBytes(doc.size_bytes)} ·{" "}
                    {doc.chunk_count} chunks
                  </div>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(doc.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 hover:bg-destructive/10 rounded transition-opacity"
                >
                  <Trash2 size={16} className="text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
