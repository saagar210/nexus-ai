import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings,
  Cpu,
  FolderOpen,
  User,
  Download,
  Trash2,
  Plus,
  RefreshCw,
  Check,
  AlertCircle,
  HardDrive,
  Zap,
} from "lucide-react";
import type { UserProfile, OllamaModel, WatchFolder } from "../types";
import {
  getSettings,
  updateSettings,
  getOllamaModels,
  pullOllamaModel,
  getWatchFolders,
  addWatchFolder,
  removeWatchFolder,
  exportData,
  clearAllData,
} from "../lib/api";

export default function SettingsPage(): React.ReactElement {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState("models");
  const [newFolderPath, setNewFolderPath] = useState("");
  const [pullModelName, setPullModelName] = useState("");
  const [isPulling, setIsPulling] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => getSettings(),
  });

  const { data: models = [] } = useQuery({
    queryKey: ["ollamaModels"],
    queryFn: () => getOllamaModels(),
  });

  const { data: watchFolders = [] } = useQuery({
    queryKey: ["watchFolders"],
    queryFn: () => getWatchFolders(),
  });

  const [profile, setProfile] = useState<Partial<UserProfile>>({
    name: "",
    email: "",
    preferences: {},
  });

  useEffect(() => {
    if (settings?.profile) {
      setProfile(settings.profile);
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  const addFolderMutation = useMutation({
    mutationFn: addWatchFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchFolders"] });
      setNewFolderPath("");
    },
  });

  const removeFolderMutation = useMutation({
    mutationFn: removeWatchFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchFolders"] });
    },
  });

  const handlePullModel = async (): Promise<void> => {
    if (!pullModelName.trim()) return;
    setIsPulling(true);
    try {
      await pullOllamaModel(pullModelName.trim());
      queryClient.invalidateQueries({ queryKey: ["ollamaModels"] });
      setPullModelName("");
    } finally {
      setIsPulling(false);
    }
  };

  const handleExport = async (): Promise<void> => {
    const data = await exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexus-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearData = async (): Promise<void> => {
    if (
      confirm("Are you sure you want to clear all data? This cannot be undone.")
    ) {
      await clearAllData();
      queryClient.invalidateQueries();
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const sections = [
    { id: "models", label: "Models", icon: <Cpu size={18} /> },
    { id: "folders", label: "Watch Folders", icon: <FolderOpen size={18} /> },
    { id: "profile", label: "Profile", icon: <User size={18} /> },
    { id: "data", label: "Data Management", icon: <HardDrive size={18} /> },
  ];

  return (
    <div className="h-full flex">
      {/* Settings Sidebar */}
      <div className="w-56 bg-card border-r border-border p-4">
        <div className="flex items-center gap-2 mb-6">
          <Settings size={20} className="text-nexus-500" />
          <h2 className="font-semibold">Settings</h2>
        </div>

        <nav className="space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                activeSection === section.id
                  ? "bg-nexus-500/10 text-nexus-600"
                  : "hover:bg-muted"
              }`}
            >
              <span
                className={
                  activeSection === section.id
                    ? "text-nexus-500"
                    : "text-muted-foreground"
                }
              >
                {section.icon}
              </span>
              <span className="text-sm font-medium">{section.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Settings Content */}
      <div className="flex-1 p-6 overflow-auto">
        {activeSection === "models" && (
          <div className="max-w-2xl">
            <h2 className="text-xl font-bold mb-2">AI Models</h2>
            <p className="text-muted-foreground mb-6">
              Manage your local Ollama models and routing preferences
            </p>

            {/* Model List */}
            <div className="space-y-3 mb-6">
              {models.map((model: OllamaModel) => (
                <div
                  key={model.name}
                  className="flex items-center justify-between p-4 bg-card border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-nexus-500/10 flex items-center justify-center">
                      <Zap className="text-nexus-500" size={20} />
                    </div>
                    <div>
                      <div className="font-medium">{model.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatBytes(model.size)} · Modified{" "}
                        {new Date(model.modified_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {settings?.default_model === model.name && (
                      <span className="text-xs bg-nexus-500/10 text-nexus-600 px-2 py-1 rounded">
                        Default
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {models.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No models found. Make sure Ollama is running.</p>
                </div>
              )}
            </div>

            {/* Pull New Model */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <h3 className="font-medium mb-2">Pull New Model</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={pullModelName}
                  onChange={(e) => setPullModelName(e.target.value)}
                  placeholder="Model name (e.g., llama3.1:8b)"
                  className="flex-1 px-4 py-2 bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-nexus-500"
                />
                <button
                  onClick={handlePullModel}
                  disabled={!pullModelName.trim() || isPulling}
                  className="flex items-center gap-2 px-4 py-2 bg-nexus-500 text-white rounded-lg hover:bg-nexus-600 disabled:opacity-50"
                >
                  {isPulling ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Download size={16} />
                  )}
                  Pull
                </button>
              </div>
            </div>
          </div>
        )}

        {activeSection === "folders" && (
          <div className="max-w-2xl">
            <h2 className="text-xl font-bold mb-2">Watch Folders</h2>
            <p className="text-muted-foreground mb-6">
              Folders that are automatically indexed for document intelligence
            </p>

            {/* Folder List */}
            <div className="space-y-2 mb-6">
              {watchFolders.map((folder: WatchFolder) => (
                <div
                  key={folder.id}
                  className="flex items-center justify-between p-3 bg-card border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FolderOpen size={18} className="text-nexus-500" />
                    <div>
                      <div className="text-sm font-medium">{folder.path}</div>
                      <div className="text-xs text-muted-foreground">
                        {folder.document_count} documents indexed
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {folder.is_active ? (
                      <Check size={14} className="text-green-500" />
                    ) : (
                      <AlertCircle size={14} className="text-amber-500" />
                    )}
                    <button
                      onClick={() => removeFolderMutation.mutate(folder.id)}
                      className="p-1.5 hover:bg-destructive/10 rounded"
                    >
                      <Trash2 size={14} className="text-destructive" />
                    </button>
                  </div>
                </div>
              ))}

              {watchFolders.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderOpen size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No folders being watched</p>
                </div>
              )}
            </div>

            {/* Add Folder */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <h3 className="font-medium mb-2">Add Watch Folder</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFolderPath}
                  onChange={(e) => setNewFolderPath(e.target.value)}
                  placeholder="Folder path (e.g., ~/Documents)"
                  className="flex-1 px-4 py-2 bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-nexus-500"
                />
                <button
                  onClick={() => addFolderMutation.mutate(newFolderPath)}
                  disabled={!newFolderPath.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-nexus-500 text-white rounded-lg hover:bg-nexus-600 disabled:opacity-50"
                >
                  <Plus size={16} />
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

        {activeSection === "profile" && (
          <div className="max-w-2xl">
            <h2 className="text-xl font-bold mb-2">User Profile</h2>
            <p className="text-muted-foreground mb-6">
              Information the AI uses to personalize responses
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Name
                </label>
                <input
                  type="text"
                  value={profile.name || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, name: e.target.value })
                  }
                  placeholder="Your name"
                  className="w-full px-4 py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-nexus-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Email
                </label>
                <input
                  type="email"
                  value={profile.email || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, email: e.target.value })
                  }
                  placeholder="your@email.com"
                  className="w-full px-4 py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-nexus-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  About You
                </label>
                <textarea
                  value={profile.preferences?.about || ""}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      preferences: {
                        ...profile.preferences,
                        about: e.target.value,
                      },
                    })
                  }
                  placeholder="Tell the AI about yourself, your work, interests, etc."
                  className="w-full px-4 py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-nexus-500 min-h-[100px] resize-none"
                />
              </div>

              <button
                onClick={() =>
                  updateSettingsMutation.mutate({ profile } as {
                    profile: UserProfile;
                  })
                }
                className="bg-nexus-500 text-white px-4 py-2 rounded-lg hover:bg-nexus-600"
              >
                Save Profile
              </button>
            </div>
          </div>
        )}

        {activeSection === "data" && (
          <div className="max-w-2xl">
            <h2 className="text-xl font-bold mb-2">Data Management</h2>
            <p className="text-muted-foreground mb-6">
              Export or clear your Nexus AI data
            </p>

            <div className="space-y-4">
              {/* Export */}
              <div className="p-4 bg-card border rounded-lg">
                <div className="flex items-start gap-3">
                  <Download size={20} className="text-nexus-500 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-medium">Export All Data</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Download all your conversations, memories, documents, and
                      settings as a JSON file
                    </p>
                    <button
                      onClick={handleExport}
                      className="mt-3 px-4 py-2 bg-muted rounded-lg hover:bg-muted/80 text-sm"
                    >
                      Export Data
                    </button>
                  </div>
                </div>
              </div>

              {/* Clear Data */}
              <div className="p-4 bg-card border border-destructive/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <Trash2 size={20} className="text-destructive mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-medium text-destructive">
                      Clear All Data
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Permanently delete all conversations, memories, documents,
                      and reset settings. This cannot be undone.
                    </p>
                    <button
                      onClick={handleClearData}
                      className="mt-3 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 text-sm"
                    >
                      Clear All Data
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
