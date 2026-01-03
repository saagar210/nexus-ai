import { useState } from "react";
import {
  Copy,
  Check,
  Pencil,
  RefreshCw,
  Trash2,
  MoreHorizontal,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";

interface MessageActionsProps {
  content: string;
  role: "user" | "assistant";
  onEdit?: (newContent: string) => void;
  onRegenerate?: () => void;
  onDelete?: () => void;
  onFeedback?: (type: "positive" | "negative") => void;
}

export default function MessageActions({
  content,
  role,
  onEdit,
  onRegenerate,
  onDelete,
  onFeedback,
}: MessageActionsProps): React.ReactElement {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);

  const handleCopy = async (): Promise<void> => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEdit = (): void => {
    setIsEditing(true);
    setEditContent(content);
    setShowMenu(false);
  };

  const handleSaveEdit = (): void => {
    if (onEdit && editContent.trim() !== content) {
      onEdit(editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = (): void => {
    setIsEditing(false);
    setEditContent(content);
  };

  if (isEditing) {
    return (
      <div className="mt-2 space-y-2">
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="w-full p-3 bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-nexus-500 resize-none"
          rows={4}
          autoFocus
        />
        <div className="flex gap-2">
          <button
            onClick={handleSaveEdit}
            className="px-3 py-1.5 bg-nexus-500 text-white rounded-lg hover:bg-nexus-600 text-sm"
          >
            Save
          </button>
          <button
            onClick={handleCancelEdit}
            className="px-3 py-1.5 bg-muted text-foreground rounded-lg hover:bg-muted/80 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
      {/* Copy */}
      <button
        onClick={handleCopy}
        className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
        title="Copy message"
      >
        {copied ? (
          <Check size={14} className="text-green-500" />
        ) : (
          <Copy size={14} />
        )}
      </button>

      {/* Edit (user messages only) */}
      {role === "user" && onEdit && (
        <button
          onClick={handleEdit}
          className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
          title="Edit message"
        >
          <Pencil size={14} />
        </button>
      )}

      {/* Regenerate (assistant messages only) */}
      {role === "assistant" && onRegenerate && (
        <button
          onClick={onRegenerate}
          className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
          title="Regenerate response"
        >
          <RefreshCw size={14} />
        </button>
      )}

      {/* Feedback (assistant messages only) */}
      {role === "assistant" && onFeedback && (
        <>
          <button
            onClick={() => onFeedback("positive")}
            className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-green-500 transition-colors"
            title="Good response"
          >
            <ThumbsUp size={14} />
          </button>
          <button
            onClick={() => onFeedback("negative")}
            className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-red-500 transition-colors"
            title="Bad response"
          >
            <ThumbsDown size={14} />
          </button>
        </>
      )}

      {/* More menu */}
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
          title="More options"
        >
          <MoreHorizontal size={14} />
        </button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[120px] z-20">
              {onDelete && (
                <button
                  onClick={() => {
                    onDelete();
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm text-destructive hover:bg-muted flex items-center gap-2"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
