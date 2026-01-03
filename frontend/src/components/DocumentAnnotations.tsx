import { useState, useCallback } from "react";
import {
  Highlighter,
  MessageSquare,
  Bookmark,
  Link2,
  Trash2,
  Edit2,
  Check,
  X,
  ChevronDown,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Types
export interface Annotation {
  id: string;
  type: "highlight" | "comment" | "bookmark" | "citation";
  documentId: string;
  startOffset: number;
  endOffset: number;
  selectedText: string;
  content?: string;
  color?: string;
  citationUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface DocumentAnnotationsProps {
  documentId: string;
  annotations: Annotation[];
  onAnnotationCreate: (
    annotation: Omit<Annotation, "id" | "createdAt" | "updatedAt">,
  ) => void;
  onAnnotationUpdate: (id: string, updates: Partial<Annotation>) => void;
  onAnnotationDelete: (id: string) => void;
  onAnnotationClick?: (annotation: Annotation) => void;
}

// Highlight colors
const HIGHLIGHT_COLORS = [
  { name: "Yellow", value: "#fef08a" },
  { name: "Green", value: "#bbf7d0" },
  { name: "Blue", value: "#bfdbfe" },
  { name: "Pink", value: "#fbcfe8" },
  { name: "Purple", value: "#ddd6fe" },
];

// Annotation type selector
function AnnotationTypeSelector({
  onSelect,
  onClose,
  position,
}: {
  onSelect: (type: Annotation["type"]) => void;
  onClose: () => void;
  position: { x: number; y: number };
}): React.ReactElement {
  const types: {
    type: Annotation["type"];
    icon: React.ReactNode;
    label: string;
  }[] = [
    { type: "highlight", icon: <Highlighter size={14} />, label: "Highlight" },
    { type: "comment", icon: <MessageSquare size={14} />, label: "Comment" },
    { type: "bookmark", icon: <Bookmark size={14} />, label: "Bookmark" },
    { type: "citation", icon: <Link2 size={14} />, label: "Citation" },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 bg-card border border-border rounded-lg shadow-xl p-1 flex gap-1"
        style={{ left: position.x, top: position.y }}
      >
        {types.map(({ type, icon, label }) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className="flex items-center gap-2 px-3 py-2 rounded hover:bg-muted text-sm"
            title={label}
          >
            {icon}
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    </>
  );
}

// Individual annotation card
function AnnotationCard({
  annotation,
  onUpdate,
  onDelete,
  onClick,
}: {
  annotation: Annotation;
  onUpdate: (updates: Partial<Annotation>) => void;
  onDelete: () => void;
  onClick?: () => void;
}): React.ReactElement {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(annotation.content || "");

  const handleSave = (): void => {
    onUpdate({ content: editContent });
    setIsEditing(false);
  };

  const getIcon = (): React.ReactNode => {
    switch (annotation.type) {
      case "highlight":
        return <Highlighter size={14} style={{ color: annotation.color }} />;
      case "comment":
        return <MessageSquare size={14} className="text-blue-500" />;
      case "bookmark":
        return <Bookmark size={14} className="text-yellow-500" />;
      case "citation":
        return <Link2 size={14} className="text-green-500" />;
    }
  };

  return (
    <div
      className="bg-card border border-border rounded-lg p-3 hover:border-muted-foreground transition-colors cursor-pointer"
      onClick={() => !isEditing && onClick?.()}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <div className="mt-0.5">{getIcon()}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm line-clamp-2 text-muted-foreground italic">
              "{annotation.selectedText}"
            </p>
            {isEditing ? (
              <div className="mt-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-2 bg-muted rounded text-sm resize-none"
                  rows={3}
                  autoFocus
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditing(false);
                    }}
                    className="p-1 hover:bg-muted rounded text-muted-foreground"
                  >
                    <X size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSave();
                    }}
                    className="p-1 hover:bg-muted rounded text-green-500"
                  >
                    <Check size={14} />
                  </button>
                </div>
              </div>
            ) : (
              annotation.content && (
                <p className="text-sm mt-2">{annotation.content}</p>
              )
            )}
            {annotation.citationUrl && (
              <a
                href={annotation.citationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-nexus-500 hover:underline mt-1 block"
                onClick={(e) => e.stopPropagation()}
              >
                {annotation.citationUrl}
              </a>
            )}
            <span className="text-xs text-muted-foreground mt-2 block">
              {formatDistanceToNow(annotation.createdAt, { addSuffix: true })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {(annotation.type === "comment" ||
            annotation.type === "citation") && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="p-1 hover:bg-muted rounded text-muted-foreground"
            >
              <Edit2 size={12} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 hover:bg-muted rounded text-red-500"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Main annotations panel
export default function DocumentAnnotations({
  annotations,
  onAnnotationUpdate,
  onAnnotationDelete,
  onAnnotationClick,
}: DocumentAnnotationsProps): React.ReactElement {
  const [filter, setFilter] = useState<Annotation["type"] | "all">("all");
  const [isExpanded, setIsExpanded] = useState(true);

  const filteredAnnotations =
    filter === "all"
      ? annotations
      : annotations.filter((a) => a.type === filter);

  const counts = {
    all: annotations.length,
    highlight: annotations.filter((a) => a.type === "highlight").length,
    comment: annotations.filter((a) => a.type === "comment").length,
    bookmark: annotations.filter((a) => a.type === "bookmark").length,
    citation: annotations.filter((a) => a.type === "citation").length,
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50"
      >
        <span className="font-medium text-sm flex items-center gap-2">
          <MessageSquare size={16} className="text-nexus-500" />
          Annotations ({annotations.length})
        </span>
        <ChevronDown
          size={16}
          className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
        />
      </button>

      {isExpanded && (
        <div className="border-t border-border">
          {/* Filter tabs */}
          <div className="flex items-center gap-1 p-2 border-b border-border overflow-x-auto">
            {(
              ["all", "highlight", "comment", "bookmark", "citation"] as const
            ).map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-2 py-1 text-xs rounded capitalize whitespace-nowrap ${
                  filter === type
                    ? "bg-nexus-500 text-white"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {type} ({counts[type]})
              </button>
            ))}
          </div>

          {/* Annotations list */}
          <div className="p-2 space-y-2 max-h-96 overflow-y-auto">
            {filteredAnnotations.length > 0 ? (
              filteredAnnotations.map((annotation) => (
                <AnnotationCard
                  key={annotation.id}
                  annotation={annotation}
                  onUpdate={(updates) =>
                    onAnnotationUpdate(annotation.id, updates)
                  }
                  onDelete={() => onAnnotationDelete(annotation.id)}
                  onClick={() => onAnnotationClick?.(annotation)}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No {filter === "all" ? "" : filter} annotations yet.
                <br />
                Select text in the document to add one.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Hook for managing annotations
export function useAnnotations(documentId: string): {
  annotations: Annotation[];
  createAnnotation: (
    data: Omit<Annotation, "id" | "createdAt" | "updatedAt">,
  ) => Annotation;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (id: string) => void;
  getAnnotationsForRange: (start: number, end: number) => Annotation[];
} {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  const createAnnotation = useCallback(
    (data: Omit<Annotation, "id" | "createdAt" | "updatedAt">): Annotation => {
      const newAnnotation: Annotation = {
        ...data,
        id: `ann-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setAnnotations((prev) => [...prev, newAnnotation]);
      return newAnnotation;
    },
    [],
  );

  const updateAnnotation = useCallback(
    (id: string, updates: Partial<Annotation>): void => {
      setAnnotations((prev) =>
        prev.map((ann) =>
          ann.id === id ? { ...ann, ...updates, updatedAt: new Date() } : ann,
        ),
      );
    },
    [],
  );

  const deleteAnnotation = useCallback((id: string): void => {
    setAnnotations((prev) => prev.filter((ann) => ann.id !== id));
  }, []);

  const getAnnotationsForRange = useCallback(
    (start: number, end: number): Annotation[] => {
      return annotations.filter(
        (ann) =>
          ann.documentId === documentId &&
          ((ann.startOffset >= start && ann.startOffset <= end) ||
            (ann.endOffset >= start && ann.endOffset <= end)),
      );
    },
    [annotations, documentId],
  );

  return {
    annotations: annotations.filter((a) => a.documentId === documentId),
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    getAnnotationsForRange,
  };
}

// Text selection handler for creating annotations
export function useTextSelection(containerRef: React.RefObject<HTMLElement>): {
  selection: {
    text: string;
    start: number;
    end: number;
    position: { x: number; y: number };
  } | null;
  clearSelection: () => void;
  handleMouseUp: () => void;
} {
  const [selection, setSelection] = useState<{
    text: string;
    start: number;
    end: number;
    position: { x: number; y: number };
  } | null>(null);

  const clearSelection = useCallback(() => {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  // Effect to track selection changes
  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !containerRef.current) {
      setSelection(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setSelection({
      text: sel.toString(),
      start: range.startOffset,
      end: range.endOffset,
      position: {
        x: rect.left + rect.width / 2,
        y: rect.bottom + 10,
      },
    });
  }, [containerRef]);

  return { selection, clearSelection, handleMouseUp };
}

export { AnnotationTypeSelector, HIGHLIGHT_COLORS };
