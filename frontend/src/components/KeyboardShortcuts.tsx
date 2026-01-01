import { useEffect, useState, useCallback } from "react";
import { X, Keyboard } from "lucide-react";

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const SHORTCUTS: Shortcut[] = [
  // Navigation
  {
    keys: ["⌘", "K"],
    description: "Open command palette",
    category: "Navigation",
  },
  { keys: ["G", "C"], description: "Go to Chat", category: "Navigation" },
  { keys: ["G", "D"], description: "Go to Documents", category: "Navigation" },
  { keys: ["G", "P"], description: "Go to Projects", category: "Navigation" },
  { keys: ["G", "W"], description: "Go to Writing", category: "Navigation" },
  { keys: ["G", "M"], description: "Go to Memory", category: "Navigation" },
  { keys: ["G", "S"], description: "Go to Settings", category: "Navigation" },

  // Chat
  { keys: ["⌘", "N"], description: "New conversation", category: "Chat" },
  { keys: ["Enter"], description: "Send message", category: "Chat" },
  {
    keys: ["Shift", "Enter"],
    description: "New line in message",
    category: "Chat",
  },
  {
    keys: ["⌘", "↑"],
    description: "Previous message in history",
    category: "Chat",
  },
  {
    keys: ["⌘", "↓"],
    description: "Next message in history",
    category: "Chat",
  },
  { keys: ["Esc"], description: "Cancel current generation", category: "Chat" },

  // Documents
  { keys: ["⌘", "U"], description: "Upload document", category: "Documents" },
  { keys: ["⌘", "F"], description: "Search documents", category: "Documents" },

  // General
  { keys: ["⌘", "T"], description: "Toggle theme", category: "General" },
  { keys: ["⌘", ","], description: "Open settings", category: "General" },
  { keys: ["⌘", "E"], description: "Export data", category: "General" },
  { keys: ["?"], description: "Show shortcuts", category: "General" },
];

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyboardShortcuts({
  isOpen,
  onClose,
}: KeyboardShortcutsProps): React.ReactElement | null {
  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const groupedShortcuts = SHORTCUTS.reduce(
    (acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = [];
      }
      acc[shortcut.category].push(shortcut);
      return acc;
    },
    {} as Record<string, Shortcut[]>,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[80vh] bg-card rounded-xl shadow-2xl border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Keyboard size={24} className="text-nexus-500" />
            <h2 className="text-xl font-semibold">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {category}
                </h3>
                <div className="space-y-2">
                  {shortcuts.map((shortcut, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-1.5"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIdx) => (
                          <kbd
                            key={keyIdx}
                            className="px-2 py-1 text-xs font-mono bg-muted rounded border border-border min-w-[24px] text-center"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-muted/50 text-xs text-muted-foreground text-center">
          Press <kbd className="px-1 py-0.5 font-mono bg-muted rounded">?</kbd>{" "}
          anytime to show this dialog
        </div>
      </div>
    </div>
  );
}

// Hook for global keyboard shortcuts
export function useKeyboardShortcuts(
  onNavigate: (path: string) => void,
  onNewChat: () => void,
  onToggleTheme: () => void,
  onOpenCommandPalette: () => void,
  onOpenShortcuts: () => void,
): void {
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        // Allow Command+K even in inputs
        if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          onOpenCommandPalette();
        }
        return;
      }

      // Command+K - Command palette
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenCommandPalette();
        return;
      }

      // Command+N - New chat
      if (e.key === "n" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onNewChat();
        return;
      }

      // Command+T - Toggle theme
      if (e.key === "t" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onToggleTheme();
        return;
      }

      // ? - Show shortcuts
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onOpenShortcuts();
        return;
      }

      // G + letter - Navigation shortcuts
      if (pendingKey === "g") {
        setPendingKey(null);
        switch (e.key.toLowerCase()) {
          case "c":
            e.preventDefault();
            onNavigate("/chat");
            break;
          case "d":
            e.preventDefault();
            onNavigate("/documents");
            break;
          case "p":
            e.preventDefault();
            onNavigate("/projects");
            break;
          case "w":
            e.preventDefault();
            onNavigate("/writing");
            break;
          case "m":
            e.preventDefault();
            onNavigate("/memory");
            break;
          case "s":
            e.preventDefault();
            onNavigate("/settings");
            break;
        }
        return;
      }

      // Start G sequence
      if (e.key === "g" && !e.metaKey && !e.ctrlKey) {
        setPendingKey("g");
        // Clear pending after 1 second
        setTimeout(() => setPendingKey(null), 1000);
        return;
      }
    },
    [
      pendingKey,
      onNavigate,
      onNewChat,
      onToggleTheme,
      onOpenCommandPalette,
      onOpenShortcuts,
    ],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
