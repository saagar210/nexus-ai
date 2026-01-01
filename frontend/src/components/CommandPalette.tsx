import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  MessageSquare,
  FileText,
  Settings,
  Brain,
  PenTool,
  FolderOpen,
  Keyboard,
  Command,
  Plus,
  Download,
  Moon,
} from "lucide-react";

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  category: "navigation" | "actions" | "settings";
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
  onNewChat: () => void;
  onExportData: () => void;
  onToggleTheme?: () => void;
}

export default function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  onNewChat,
  onExportData,
  onToggleTheme,
}: CommandPaletteProps): React.ReactElement | null {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands: CommandItem[] = [
    // Navigation
    {
      id: "nav-chat",
      title: "Go to Chat",
      description: "Open the chat interface",
      icon: <MessageSquare size={18} />,
      shortcut: "G C",
      action: () => onNavigate("/chat"),
      category: "navigation",
    },
    {
      id: "nav-documents",
      title: "Go to Documents",
      description: "View and manage documents",
      icon: <FileText size={18} />,
      shortcut: "G D",
      action: () => onNavigate("/documents"),
      category: "navigation",
    },
    {
      id: "nav-memory",
      title: "Go to Memory",
      description: "View AI memories",
      icon: <Brain size={18} />,
      shortcut: "G M",
      action: () => onNavigate("/memory"),
      category: "navigation",
    },
    {
      id: "nav-writing",
      title: "Go to Writing Studio",
      description: "AI-powered writing assistant",
      icon: <PenTool size={18} />,
      shortcut: "G W",
      action: () => onNavigate("/writing"),
      category: "navigation",
    },
    {
      id: "nav-projects",
      title: "Go to Projects",
      description: "Manage your projects",
      icon: <FolderOpen size={18} />,
      shortcut: "G P",
      action: () => onNavigate("/projects"),
      category: "navigation",
    },
    {
      id: "nav-settings",
      title: "Go to Settings",
      description: "Configure Nexus AI",
      icon: <Settings size={18} />,
      shortcut: "G S",
      action: () => onNavigate("/settings"),
      category: "navigation",
    },
    // Actions
    {
      id: "action-new-chat",
      title: "New Chat",
      description: "Start a new conversation",
      icon: <Plus size={18} />,
      shortcut: "⌘ N",
      action: onNewChat,
      category: "actions",
    },
    {
      id: "action-export",
      title: "Export Data",
      description: "Download all your data",
      icon: <Download size={18} />,
      action: onExportData,
      category: "actions",
    },
    {
      id: "action-shortcuts",
      title: "Keyboard Shortcuts",
      description: "View all keyboard shortcuts",
      icon: <Keyboard size={18} />,
      shortcut: "?",
      action: () => {
        // Show shortcuts modal
        onClose();
      },
      category: "actions",
    },
    // Settings
    {
      id: "settings-theme",
      title: "Toggle Theme",
      description: "Switch between light and dark mode",
      icon: <Moon size={18} />,
      shortcut: "⌘ T",
      action: () => {
        onToggleTheme?.();
        onClose();
      },
      category: "settings",
    },
  ];

  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.title.toLowerCase().includes(query.toLowerCase()) ||
      cmd.description?.toLowerCase().includes(query.toLowerCase()),
  );

  const groupedCommands = {
    navigation: filteredCommands.filter((c) => c.category === "navigation"),
    actions: filteredCommands.filter((c) => c.category === "actions"),
    settings: filteredCommands.filter((c) => c.category === "settings"),
  };

  const flatCommands = [
    ...groupedCommands.navigation,
    ...groupedCommands.actions,
    ...groupedCommands.settings,
  ];

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, flatCommands.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (flatCommands[selectedIndex]) {
            flatCommands[selectedIndex].action();
            onClose();
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [flatCommands, selectedIndex, onClose],
  );

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = listRef.current?.querySelector(
      `[data-index="${selectedIndex}"]`,
    );
    selectedElement?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!isOpen) return null;

  const renderCommandGroup = (
    title: string,
    commands: CommandItem[],
    startIndex: number,
  ) => {
    if (commands.length === 0) return null;

    return (
      <div className="py-2">
        <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </div>
        {commands.map((cmd, idx) => {
          const globalIndex = startIndex + idx;
          return (
            <button
              key={cmd.id}
              data-index={globalIndex}
              onClick={() => {
                cmd.action();
                onClose();
              }}
              onMouseEnter={() => setSelectedIndex(globalIndex)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                selectedIndex === globalIndex
                  ? "bg-nexus-500/10 text-nexus-600"
                  : "hover:bg-muted"
              }`}
            >
              <span
                className={
                  selectedIndex === globalIndex
                    ? "text-nexus-500"
                    : "text-muted-foreground"
                }
              >
                {cmd.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{cmd.title}</div>
                {cmd.description && (
                  <div className="text-sm text-muted-foreground truncate">
                    {cmd.description}
                  </div>
                )}
              </div>
              {cmd.shortcut && (
                <div className="flex items-center gap-1">
                  {cmd.shortcut.split(" ").map((key, i) => (
                    <kbd
                      key={i}
                      className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded border border-border"
                    >
                      {key}
                    </kbd>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Command palette */}
      <div className="relative w-full max-w-xl bg-card rounded-xl shadow-2xl border border-border overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search size={20} className="text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search commands..."
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
          />
          <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded border border-border">
            ESC
          </kbd>
        </div>

        {/* Commands list */}
        <div ref={listRef} className="max-h-[400px] overflow-y-auto">
          {flatCommands.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No commands found
            </div>
          ) : (
            <>
              {renderCommandGroup("Navigation", groupedCommands.navigation, 0)}
              {renderCommandGroup(
                "Actions",
                groupedCommands.actions,
                groupedCommands.navigation.length,
              )}
              {renderCommandGroup(
                "Settings",
                groupedCommands.settings,
                groupedCommands.navigation.length +
                  groupedCommands.actions.length,
              )}
            </>
          )}
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
          </div>
          <div className="flex items-center gap-1">
            <Command size={12} />
            <span>K to open</span>
          </div>
        </div>
      </div>
    </div>
  );
}
