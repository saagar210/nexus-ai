import { useState, useEffect, useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  MessageSquare,
  FileText,
  FolderKanban,
  PenTool,
  Brain,
  Settings,
  Zap,
  AlertCircle,
} from "lucide-react";
import type { TabType } from "./types";
import { checkHealth, exportData } from "./lib/api";

// Import pages
import ChatPage from "./pages/ChatPage";
import DocumentsPage from "./pages/DocumentsPage";
import ProjectsPage from "./pages/ProjectsPage";
import WritingPage from "./pages/WritingPage";
import MemoryPage from "./pages/MemoryPage";
import SettingsPage from "./pages/SettingsPage";

// Import components
import ErrorBoundary from "./components/ErrorBoundary";
import CommandPalette from "./components/CommandPalette";
import KeyboardShortcuts, {
  useKeyboardShortcuts,
} from "./components/KeyboardShortcuts";
import GlobalSearch from "./components/GlobalSearch";
import OnboardingFlow, { useOnboarding } from "./components/OnboardingFlow";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});

const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: "chat", label: "Chat", icon: <MessageSquare size={20} /> },
  { id: "documents", label: "Documents", icon: <FileText size={20} /> },
  { id: "projects", label: "Projects", icon: <FolderKanban size={20} /> },
  { id: "writing", label: "Writing", icon: <PenTool size={20} /> },
  { id: "memory", label: "Memory", icon: <Brain size={20} /> },
  { id: "settings", label: "Settings", icon: <Settings size={20} /> },
];

// Theme management
function useTheme(): {
  isDark: boolean;
  toggleTheme: () => void;
} {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return true;
  });

  const toggleTheme = useCallback(() => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    if (newIsDark) {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    }
    localStorage.setItem("nexus_theme", newIsDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("nexus_theme");
    if (savedTheme === "light") {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    }
  }, []);

  return { isDark, toggleTheme };
}

function AppContent(): React.ReactElement {
  const [currentTab, setCurrentTab] = useState<TabType>("chat");
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Modal states
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Theme
  const { toggleTheme } = useTheme();

  // Onboarding
  const { showOnboarding, completeOnboarding } = useOnboarding();

  // Navigation handler
  const handleNavigate = useCallback((path: string) => {
    const tabMap: Record<string, TabType> = {
      "/chat": "chat",
      "/documents": "documents",
      "/projects": "projects",
      "/writing": "writing",
      "/memory": "memory",
      "/settings": "settings",
    };
    const tab = tabMap[path];
    if (tab) {
      setCurrentTab(tab);
    }
  }, []);

  // New chat handler
  const handleNewChat = useCallback(() => {
    setCurrentTab("chat");
    // The ChatPage component will handle creating a new session
  }, []);

  // Export data handler
  const handleExportData = useCallback(async () => {
    try {
      const data = await exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nexus-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    }
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts(
    handleNavigate,
    handleNewChat,
    toggleTheme,
    () => setShowCommandPalette(true),
    () => setShowShortcuts(true),
  );

  // Health check
  useEffect(() => {
    const checkConnection = async (): Promise<void> => {
      try {
        const health = await checkHealth();
        setIsConnected(health.status === "ok");
        setConnectionError(
          health.ollama === "disconnected"
            ? "Ollama not running - AI features unavailable"
            : null,
        );
      } catch {
        setIsConnected(false);
        setConnectionError("Cannot connect to Nexus AI backend");
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle search result selection
  const handleSearchResult = useCallback(
    (result: { type: string; id: string }) => {
      switch (result.type) {
        case "session":
          setCurrentTab("chat");
          // Could pass session ID to ChatPage
          break;
        case "document":
          setCurrentTab("documents");
          break;
        case "memory":
          setCurrentTab("memory");
          break;
      }
    },
    [],
  );

  const renderPage = (): React.ReactNode => {
    switch (currentTab) {
      case "chat":
        return <ChatPage />;
      case "documents":
        return <DocumentsPage />;
      case "projects":
        return <ProjectsPage />;
      case "writing":
        return <WritingPage />;
      case "memory":
        return <MemoryPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <ChatPage />;
    }
  };

  return (
    <>
      {/* Onboarding */}
      <OnboardingFlow isOpen={showOnboarding} onComplete={completeOnboarding} />

      {/* Command Palette */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onNavigate={handleNavigate}
        onNewChat={handleNewChat}
        onExportData={handleExportData}
        onToggleTheme={toggleTheme}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcuts
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />

      {/* Global Search */}
      <GlobalSearch
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onSelectResult={handleSearchResult}
      />

      {/* Main App Layout */}
      <div className="flex h-screen bg-background">
        {/* Sidebar */}
        <aside className="w-16 bg-card border-r border-border flex flex-col items-center py-4">
          {/* Logo */}
          <div className="mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-nexus-500 to-nexus-700 flex items-center justify-center">
              <Zap className="text-white" size={24} />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 flex flex-col gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                  currentTab === tab.id
                    ? "bg-nexus-500 text-white shadow-lg shadow-nexus-500/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                title={tab.label}
              >
                {tab.icon}
              </button>
            ))}
          </nav>

          {/* Connection Status */}
          <div className="mt-auto">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
              title={isConnected ? "Connected" : "Disconnected"}
            />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Connection Warning */}
          {connectionError && (
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center gap-2 text-amber-600 text-sm">
              <AlertCircle size={16} />
              {connectionError}
            </div>
          )}

          {/* Page Content */}
          <div className="flex-1 overflow-hidden">{renderPage()}</div>
        </main>
      </div>
    </>
  );
}

function App(): React.ReactElement {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
