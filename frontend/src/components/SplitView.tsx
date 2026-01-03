import { useState, useRef, useCallback, useEffect } from "react";
import { GripVertical, Maximize2, Minimize2, X } from "lucide-react";

interface SplitViewProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  leftTitle?: string;
  rightTitle?: string;
  defaultSplit?: number; // 0-100 percentage for left panel
  minWidth?: number; // minimum width in pixels
  onClose?: () => void;
}

export default function SplitView({
  leftPanel,
  rightPanel,
  leftTitle = "Chat",
  rightTitle = "Document",
  defaultSplit = 50,
  minWidth = 300,
  onClose,
}: SplitViewProps): React.ReactElement {
  const [splitRatio, setSplitRatio] = useState(defaultSplit);
  const [isDragging, setIsDragging] = useState(false);
  const [isLeftMaximized, setIsLeftMaximized] = useState(false);
  const [isRightMaximized, setIsRightMaximized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const newRatio = ((e.clientX - rect.left) / rect.width) * 100;

      // Enforce minimum widths
      const minRatio = (minWidth / rect.width) * 100;
      const maxRatio = 100 - minRatio;

      setSplitRatio(Math.min(Math.max(newRatio, minRatio), maxRatio));
    },
    [isDragging, minWidth],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const toggleLeftMaximize = () => {
    setIsLeftMaximized(!isLeftMaximized);
    setIsRightMaximized(false);
  };

  const toggleRightMaximize = () => {
    setIsRightMaximized(!isRightMaximized);
    setIsLeftMaximized(false);
  };

  // Determine panel visibility
  const showLeft = !isRightMaximized;
  const showRight = !isLeftMaximized;
  const showDivider = showLeft && showRight;

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full bg-background"
      style={{ cursor: isDragging ? "col-resize" : undefined }}
    >
      {/* Left Panel */}
      {showLeft && (
        <div
          className="flex flex-col border-r border-border overflow-hidden"
          style={{
            width: isLeftMaximized ? "100%" : `${splitRatio}%`,
            minWidth: isLeftMaximized ? undefined : minWidth,
          }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card">
            <span className="text-sm font-medium">{leftTitle}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleLeftMaximize}
                className="p-1 hover:bg-muted rounded text-muted-foreground"
                title={isLeftMaximized ? "Restore" : "Maximize"}
              >
                {isLeftMaximized ? (
                  <Minimize2 size={14} />
                ) : (
                  <Maximize2 size={14} />
                )}
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto">{leftPanel}</div>
        </div>
      )}

      {/* Resize Handle */}
      {showDivider && (
        <div
          onMouseDown={handleMouseDown}
          className={`flex items-center justify-center w-1 bg-border hover:bg-nexus-500 cursor-col-resize transition-colors group ${
            isDragging ? "bg-nexus-500" : ""
          }`}
        >
          <div className="absolute p-1 bg-card rounded border border-border opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical size={12} className="text-muted-foreground" />
          </div>
        </div>
      )}

      {/* Right Panel */}
      {showRight && (
        <div
          className="flex flex-col overflow-hidden"
          style={{
            width: isRightMaximized ? "100%" : `${100 - splitRatio}%`,
            minWidth: isRightMaximized ? undefined : minWidth,
          }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card">
            <span className="text-sm font-medium">{rightTitle}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleRightMaximize}
                className="p-1 hover:bg-muted rounded text-muted-foreground"
                title={isRightMaximized ? "Restore" : "Maximize"}
              >
                {isRightMaximized ? (
                  <Minimize2 size={14} />
                ) : (
                  <Maximize2 size={14} />
                )}
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-muted rounded text-muted-foreground"
                  title="Close split view"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-auto">{rightPanel}</div>
        </div>
      )}
    </div>
  );
}

// Hook for managing split view state
export function useSplitView(): {
  isOpen: boolean;
  rightContent: React.ReactNode | null;
  rightTitle: string;
  openSplit: (content: React.ReactNode, title?: string) => void;
  closeSplit: () => void;
} {
  const [isOpen, setIsOpen] = useState(false);
  const [rightContent, setRightContent] = useState<React.ReactNode | null>(
    null,
  );
  const [rightTitle, setRightTitle] = useState("Document");

  const openSplit = useCallback(
    (content: React.ReactNode, title = "Document") => {
      setRightContent(content);
      setRightTitle(title);
      setIsOpen(true);
    },
    [],
  );

  const closeSplit = useCallback(() => {
    setIsOpen(false);
    setRightContent(null);
  }, []);

  return { isOpen, rightContent, rightTitle, openSplit, closeSplit };
}
