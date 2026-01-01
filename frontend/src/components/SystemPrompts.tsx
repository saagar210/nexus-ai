import { useState, useEffect, useCallback } from "react";
import {
  Settings,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Copy,
  Star,
  StarOff,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Code,
  Briefcase,
  GraduationCap,
  Heart,
  Zap,
} from "lucide-react";

export interface SystemPrompt {
  id: string;
  name: string;
  description: string;
  content: string;
  category: string;
  icon: string;
  isDefault?: boolean;
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SavedPrompt {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  usageCount: number;
  isFavorite: boolean;
  createdAt: string;
  lastUsedAt?: string;
}

const STORAGE_KEY_SYSTEM = "nexus_system_prompts";
const STORAGE_KEY_SAVED = "nexus_saved_prompts";
const STORAGE_KEY_ACTIVE = "nexus_active_system_prompt";

const DEFAULT_SYSTEM_PROMPTS: SystemPrompt[] = [
  {
    id: "default",
    name: "Default Assistant",
    description: "Balanced, helpful AI assistant",
    content:
      "You are a helpful, harmless, and honest AI assistant. Provide clear, accurate, and thoughtful responses. Be concise when appropriate, but thorough when the topic requires it.",
    category: "General",
    icon: "sparkles",
    isDefault: true,
    isFavorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "coding",
    name: "Code Expert",
    description: "Specialized for programming tasks",
    content:
      "You are an expert software engineer with deep knowledge of multiple programming languages, frameworks, and best practices. When writing code: use clear variable names, add helpful comments, follow language conventions, consider edge cases, and prioritize readability and maintainability. Explain your reasoning when making architectural decisions.",
    category: "Technical",
    icon: "code",
    isDefault: true,
    isFavorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "professional",
    name: "Business Professional",
    description: "Formal business communication",
    content:
      "You are a professional business consultant with expertise in corporate communication, strategy, and management. Maintain a formal, polished tone. Structure responses clearly with executive summaries when appropriate. Focus on actionable insights and practical recommendations.",
    category: "Business",
    icon: "briefcase",
    isDefault: true,
    isFavorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tutor",
    name: "Patient Tutor",
    description: "Educational and explanatory",
    content:
      "You are a patient, encouraging tutor who excels at explaining complex concepts in simple terms. Use analogies, examples, and step-by-step breakdowns. Check for understanding, anticipate common misconceptions, and adapt your explanations to the learner's level. Celebrate progress and encourage curiosity.",
    category: "Education",
    icon: "graduation",
    isDefault: true,
    isFavorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "creative",
    name: "Creative Writer",
    description: "Imaginative and expressive",
    content:
      "You are a creative writer with a vivid imagination and mastery of language. Write with style, emotion, and originality. Use literary devices effectively, vary sentence structure, and create engaging narratives. Adapt your voice to match the genre or mood requested.",
    category: "Creative",
    icon: "heart",
    isDefault: true,
    isFavorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "concise",
    name: "Concise Responder",
    description: "Brief and to the point",
    content:
      "You are an assistant that values brevity. Provide the most concise, direct answers possible. Avoid unnecessary elaboration. Use bullet points and short sentences. Only expand when explicitly asked or when brevity would sacrifice accuracy.",
    category: "General",
    icon: "zap",
    isDefault: true,
    isFavorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const ICON_MAP: Record<string, React.ReactNode> = {
  sparkles: <Sparkles size={18} />,
  code: <Code size={18} />,
  briefcase: <Briefcase size={18} />,
  graduation: <GraduationCap size={18} />,
  heart: <Heart size={18} />,
  zap: <Zap size={18} />,
  settings: <Settings size={18} />,
};

interface SystemPromptsProps {
  onSelectSystemPrompt: (prompt: SystemPrompt | null) => void;
  onUseSavedPrompt: (prompt: SavedPrompt) => void;
  activePromptId?: string | null;
}

export default function SystemPrompts({
  onSelectSystemPrompt,
  onUseSavedPrompt,
  activePromptId,
}: SystemPromptsProps): React.ReactElement {
  const [systemPrompts, setSystemPrompts] = useState<SystemPrompt[]>([]);
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [activeTab, setActiveTab] = useState<"system" | "saved">("system");
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["General", "Technical"]),
  );

  // Form state for editing/creating
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    content: "",
    category: "General",
    icon: "sparkles",
    // For saved prompts
    title: "",
    tags: "",
  });

  // Load from localStorage
  useEffect(() => {
    const savedSystem = localStorage.getItem(STORAGE_KEY_SYSTEM);
    if (savedSystem) {
      setSystemPrompts(JSON.parse(savedSystem));
    } else {
      setSystemPrompts(DEFAULT_SYSTEM_PROMPTS);
      localStorage.setItem(
        STORAGE_KEY_SYSTEM,
        JSON.stringify(DEFAULT_SYSTEM_PROMPTS),
      );
    }

    const savedUserPrompts = localStorage.getItem(STORAGE_KEY_SAVED);
    if (savedUserPrompts) {
      setSavedPrompts(JSON.parse(savedUserPrompts));
    }
  }, []);

  // Save to localStorage
  const saveSystemPrompts = useCallback((prompts: SystemPrompt[]) => {
    setSystemPrompts(prompts);
    localStorage.setItem(STORAGE_KEY_SYSTEM, JSON.stringify(prompts));
  }, []);

  const saveSavedPrompts = useCallback((prompts: SavedPrompt[]) => {
    setSavedPrompts(prompts);
    localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(prompts));
  }, []);

  // Toggle category expansion
  const toggleCategory = (category: string): void => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // System Prompt Actions
  const handleCreateSystemPrompt = (): void => {
    const newPrompt: SystemPrompt = {
      id: `custom-${Date.now()}`,
      name: formData.name,
      description: formData.description,
      content: formData.content,
      category: formData.category,
      icon: formData.icon,
      isDefault: false,
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveSystemPrompts([...systemPrompts, newPrompt]);
    setIsCreating(false);
    resetForm();
  };

  const handleUpdateSystemPrompt = (id: string): void => {
    const updated = systemPrompts.map((p) =>
      p.id === id
        ? {
            ...p,
            name: formData.name,
            description: formData.description,
            content: formData.content,
            category: formData.category,
            icon: formData.icon,
            updatedAt: new Date().toISOString(),
          }
        : p,
    );
    saveSystemPrompts(updated);
    setIsEditing(null);
    resetForm();
  };

  const handleDeleteSystemPrompt = (id: string): void => {
    const filtered = systemPrompts.filter((p) => p.id !== id);
    saveSystemPrompts(filtered);
    if (activePromptId === id) {
      onSelectSystemPrompt(null);
    }
  };

  const handleToggleFavoriteSystem = (id: string): void => {
    const updated = systemPrompts.map((p) =>
      p.id === id ? { ...p, isFavorite: !p.isFavorite } : p,
    );
    saveSystemPrompts(updated);
  };

  // Saved Prompt Actions
  const handleCreateSavedPrompt = (): void => {
    const newPrompt: SavedPrompt = {
      id: `saved-${Date.now()}`,
      title: formData.title,
      content: formData.content,
      category: formData.category,
      tags: formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      usageCount: 0,
      isFavorite: false,
      createdAt: new Date().toISOString(),
    };
    saveSavedPrompts([...savedPrompts, newPrompt]);
    setIsCreating(false);
    resetForm();
  };

  const handleUpdateSavedPrompt = (id: string): void => {
    const updated = savedPrompts.map((p) =>
      p.id === id
        ? {
            ...p,
            title: formData.title,
            content: formData.content,
            category: formData.category,
            tags: formData.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
          }
        : p,
    );
    saveSavedPrompts(updated);
    setIsEditing(null);
    resetForm();
  };

  const handleDeleteSavedPrompt = (id: string): void => {
    const filtered = savedPrompts.filter((p) => p.id !== id);
    saveSavedPrompts(filtered);
  };

  const handleUseSavedPrompt = (prompt: SavedPrompt): void => {
    const updated = savedPrompts.map((p) =>
      p.id === prompt.id
        ? {
            ...p,
            usageCount: p.usageCount + 1,
            lastUsedAt: new Date().toISOString(),
          }
        : p,
    );
    saveSavedPrompts(updated);
    onUseSavedPrompt(prompt);
  };

  const handleToggleFavoriteSaved = (id: string): void => {
    const updated = savedPrompts.map((p) =>
      p.id === id ? { ...p, isFavorite: !p.isFavorite } : p,
    );
    saveSavedPrompts(updated);
  };

  const resetForm = (): void => {
    setFormData({
      name: "",
      description: "",
      content: "",
      category: "General",
      icon: "sparkles",
      title: "",
      tags: "",
    });
  };

  const startEditing = (
    prompt: SystemPrompt | SavedPrompt,
    type: "system" | "saved",
  ): void => {
    if (type === "system") {
      const p = prompt as SystemPrompt;
      setFormData({
        name: p.name,
        description: p.description,
        content: p.content,
        category: p.category,
        icon: p.icon,
        title: "",
        tags: "",
      });
    } else {
      const p = prompt as SavedPrompt;
      setFormData({
        name: "",
        description: "",
        content: p.content,
        category: p.category,
        icon: "sparkles",
        title: p.title,
        tags: p.tags.join(", "),
      });
    }
    setIsEditing(prompt.id);
  };

  const copyToClipboard = (text: string): void => {
    navigator.clipboard.writeText(text);
  };

  // Group prompts by category
  const groupedSystemPrompts = systemPrompts.reduce(
    (acc, prompt) => {
      if (!acc[prompt.category]) {
        acc[prompt.category] = [];
      }
      acc[prompt.category].push(prompt);
      return acc;
    },
    {} as Record<string, SystemPrompt[]>,
  );

  const groupedSavedPrompts = savedPrompts.reduce(
    (acc, prompt) => {
      if (!acc[prompt.category]) {
        acc[prompt.category] = [];
      }
      acc[prompt.category].push(prompt);
      return acc;
    },
    {} as Record<string, SavedPrompt[]>,
  );

  const categories = [
    "General",
    "Technical",
    "Business",
    "Education",
    "Creative",
  ];

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold mb-3">Prompts</h2>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("system")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "system"
                ? "bg-nexus-500 text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            System Prompts
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "saved"
                ? "bg-nexus-500 text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Saved Prompts
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Create Button */}
        {!isCreating && !isEditing && (
          <button
            onClick={() => {
              setIsCreating(true);
              resetForm();
            }}
            className="w-full flex items-center justify-center gap-2 p-3 mb-4 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-nexus-500 transition-colors"
          >
            <Plus size={18} />
            <span>
              Create {activeTab === "system" ? "System Prompt" : "Saved Prompt"}
            </span>
          </button>
        )}

        {/* Create/Edit Form */}
        {(isCreating || isEditing) && (
          <div className="mb-4 p-4 bg-muted rounded-lg space-y-3">
            <h3 className="font-medium">
              {isCreating ? "Create New" : "Edit"}{" "}
              {activeTab === "system" ? "System Prompt" : "Saved Prompt"}
            </h3>

            {activeTab === "system" ? (
              <>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Name"
                  className="w-full px-3 py-2 bg-background rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500"
                />
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Short description"
                  className="w-full px-3 py-2 bg-background rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500"
                />
              </>
            ) : (
              <>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Title"
                  className="w-full px-3 py-2 bg-background rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500"
                />
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) =>
                    setFormData({ ...formData, tags: e.target.value })
                  }
                  placeholder="Tags (comma-separated)"
                  className="w-full px-3 py-2 bg-background rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500"
                />
              </>
            )}

            <textarea
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              placeholder={
                activeTab === "system"
                  ? "System prompt content..."
                  : "Prompt content..."
              }
              rows={5}
              className="w-full px-3 py-2 bg-background rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500 resize-none"
            />

            <div className="flex gap-2">
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="flex-1 px-3 py-2 bg-background rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              {activeTab === "system" && (
                <select
                  value={formData.icon}
                  onChange={(e) =>
                    setFormData({ ...formData, icon: e.target.value })
                  }
                  className="px-3 py-2 bg-background rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500"
                >
                  <option value="sparkles">✨ Sparkles</option>
                  <option value="code">💻 Code</option>
                  <option value="briefcase">💼 Briefcase</option>
                  <option value="graduation">🎓 Education</option>
                  <option value="heart">❤️ Heart</option>
                  <option value="zap">⚡ Zap</option>
                </select>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (isCreating) {
                    activeTab === "system"
                      ? handleCreateSystemPrompt()
                      : handleCreateSavedPrompt();
                  } else if (isEditing) {
                    activeTab === "system"
                      ? handleUpdateSystemPrompt(isEditing)
                      : handleUpdateSavedPrompt(isEditing);
                  }
                }}
                disabled={
                  activeTab === "system"
                    ? !formData.name || !formData.content
                    : !formData.title || !formData.content
                }
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-nexus-500 text-white rounded-lg hover:bg-nexus-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Check size={16} />
                Save
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setIsEditing(null);
                  resetForm();
                }}
                className="px-4 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* System Prompts List */}
        {activeTab === "system" && !isCreating && !isEditing && (
          <div className="space-y-2">
            {/* Favorites */}
            {systemPrompts.some((p) => p.isFavorite) && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Favorites
                </h3>
                {systemPrompts
                  .filter((p) => p.isFavorite)
                  .map((prompt) => (
                    <SystemPromptCard
                      key={prompt.id}
                      prompt={prompt}
                      isActive={activePromptId === prompt.id}
                      onSelect={() => onSelectSystemPrompt(prompt)}
                      onEdit={() => startEditing(prompt, "system")}
                      onDelete={() => handleDeleteSystemPrompt(prompt.id)}
                      onToggleFavorite={() =>
                        handleToggleFavoriteSystem(prompt.id)
                      }
                      onCopy={() => copyToClipboard(prompt.content)}
                    />
                  ))}
              </div>
            )}

            {/* By Category */}
            {Object.entries(groupedSystemPrompts)
              .filter(([_, prompts]) => prompts.some((p) => !p.isFavorite))
              .map(([category, prompts]) => (
                <div key={category}>
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center gap-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    {expandedCategories.has(category) ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                    {category}
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                      {prompts.filter((p) => !p.isFavorite).length}
                    </span>
                  </button>
                  {expandedCategories.has(category) && (
                    <div className="space-y-2 ml-4">
                      {prompts
                        .filter((p) => !p.isFavorite)
                        .map((prompt) => (
                          <SystemPromptCard
                            key={prompt.id}
                            prompt={prompt}
                            isActive={activePromptId === prompt.id}
                            onSelect={() => onSelectSystemPrompt(prompt)}
                            onEdit={() => startEditing(prompt, "system")}
                            onDelete={() => handleDeleteSystemPrompt(prompt.id)}
                            onToggleFavorite={() =>
                              handleToggleFavoriteSystem(prompt.id)
                            }
                            onCopy={() => copyToClipboard(prompt.content)}
                          />
                        ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* Saved Prompts List */}
        {activeTab === "saved" && !isCreating && !isEditing && (
          <div className="space-y-2">
            {savedPrompts.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <p>No saved prompts yet</p>
                <p className="text-sm mt-1">
                  Save your frequently used prompts for quick access
                </p>
              </div>
            ) : (
              <>
                {/* Favorites */}
                {savedPrompts.some((p) => p.isFavorite) && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      Favorites
                    </h3>
                    {savedPrompts
                      .filter((p) => p.isFavorite)
                      .map((prompt) => (
                        <SavedPromptCard
                          key={prompt.id}
                          prompt={prompt}
                          onUse={() => handleUseSavedPrompt(prompt)}
                          onEdit={() => startEditing(prompt, "saved")}
                          onDelete={() => handleDeleteSavedPrompt(prompt.id)}
                          onToggleFavorite={() =>
                            handleToggleFavoriteSaved(prompt.id)
                          }
                          onCopy={() => copyToClipboard(prompt.content)}
                        />
                      ))}
                  </div>
                )}

                {/* By Category */}
                {Object.entries(groupedSavedPrompts)
                  .filter(([_, prompts]) => prompts.some((p) => !p.isFavorite))
                  .map(([category, prompts]) => (
                    <div key={category}>
                      <button
                        onClick={() => toggleCategory(category)}
                        className="w-full flex items-center gap-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                      >
                        {expandedCategories.has(category) ? (
                          <ChevronDown size={16} />
                        ) : (
                          <ChevronRight size={16} />
                        )}
                        {category}
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                          {prompts.filter((p) => !p.isFavorite).length}
                        </span>
                      </button>
                      {expandedCategories.has(category) && (
                        <div className="space-y-2 ml-4">
                          {prompts
                            .filter((p) => !p.isFavorite)
                            .map((prompt) => (
                              <SavedPromptCard
                                key={prompt.id}
                                prompt={prompt}
                                onUse={() => handleUseSavedPrompt(prompt)}
                                onEdit={() => startEditing(prompt, "saved")}
                                onDelete={() =>
                                  handleDeleteSavedPrompt(prompt.id)
                                }
                                onToggleFavorite={() =>
                                  handleToggleFavoriteSaved(prompt.id)
                                }
                                onCopy={() => copyToClipboard(prompt.content)}
                              />
                            ))}
                        </div>
                      )}
                    </div>
                  ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Active System Prompt Indicator */}
      {activePromptId && activeTab === "system" && (
        <div className="p-3 border-t border-border bg-nexus-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles size={14} className="text-nexus-500" />
              <span className="text-muted-foreground">Active:</span>
              <span className="font-medium">
                {systemPrompts.find((p) => p.id === activePromptId)?.name}
              </span>
            </div>
            <button
              onClick={() => onSelectSystemPrompt(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// System Prompt Card Component
interface SystemPromptCardProps {
  prompt: SystemPrompt;
  isActive: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onCopy: () => void;
}

function SystemPromptCard({
  prompt,
  isActive,
  onSelect,
  onEdit,
  onDelete,
  onToggleFavorite,
  onCopy,
}: SystemPromptCardProps): React.ReactElement {
  return (
    <div
      className={`p-3 rounded-lg border transition-colors cursor-pointer ${
        isActive
          ? "border-nexus-500 bg-nexus-500/10"
          : "border-border bg-background hover:border-muted-foreground"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 ${isActive ? "text-nexus-500" : "text-muted-foreground"}`}
        >
          {ICON_MAP[prompt.icon] || ICON_MAP.sparkles}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{prompt.name}</span>
            {isActive && (
              <span className="text-xs px-2 py-0.5 bg-nexus-500 text-white rounded-full">
                Active
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {prompt.description}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className="p-1 hover:bg-muted rounded"
          >
            {prompt.isFavorite ? (
              <Star size={14} className="text-amber-500 fill-amber-500" />
            ) : (
              <StarOff size={14} className="text-muted-foreground" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCopy();
            }}
            className="p-1 hover:bg-muted rounded"
            title="Copy prompt"
          >
            <Copy size={14} className="text-muted-foreground" />
          </button>
          {!prompt.isDefault && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-1 hover:bg-muted rounded"
              >
                <Edit3 size={14} className="text-muted-foreground" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-1 hover:bg-muted rounded"
              >
                <Trash2 size={14} className="text-destructive" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Saved Prompt Card Component
interface SavedPromptCardProps {
  prompt: SavedPrompt;
  onUse: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onCopy: () => void;
}

function SavedPromptCard({
  prompt,
  onUse,
  onEdit,
  onDelete,
  onToggleFavorite,
  onCopy,
}: SavedPromptCardProps): React.ReactElement {
  return (
    <div className="p-3 rounded-lg border border-border bg-background hover:border-muted-foreground transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-medium">{prompt.title}</div>
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
            {prompt.content}
          </p>
          {prompt.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {prompt.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 bg-muted rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span>Used {prompt.usageCount} times</span>
            {prompt.lastUsedAt && (
              <span>
                Last used {new Date(prompt.lastUsedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <button
            onClick={onUse}
            className="px-3 py-1 text-xs bg-nexus-500 text-white rounded hover:bg-nexus-600 transition-colors"
          >
            Use
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleFavorite}
              className="p-1 hover:bg-muted rounded"
            >
              {prompt.isFavorite ? (
                <Star size={14} className="text-amber-500 fill-amber-500" />
              ) : (
                <StarOff size={14} className="text-muted-foreground" />
              )}
            </button>
            <button
              onClick={onCopy}
              className="p-1 hover:bg-muted rounded"
              title="Copy prompt"
            >
              <Copy size={14} className="text-muted-foreground" />
            </button>
            <button onClick={onEdit} className="p-1 hover:bg-muted rounded">
              <Edit3 size={14} className="text-muted-foreground" />
            </button>
            <button onClick={onDelete} className="p-1 hover:bg-muted rounded">
              <Trash2 size={14} className="text-destructive" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook to get/set active system prompt
export function useActiveSystemPrompt(): {
  activePrompt: SystemPrompt | null;
  setActivePrompt: (prompt: SystemPrompt | null) => void;
} {
  const [activePrompt, setActivePromptState] = useState<SystemPrompt | null>(
    null,
  );

  useEffect(() => {
    const savedId = localStorage.getItem(STORAGE_KEY_ACTIVE);
    if (savedId) {
      const savedPrompts = localStorage.getItem(STORAGE_KEY_SYSTEM);
      if (savedPrompts) {
        const prompts: SystemPrompt[] = JSON.parse(savedPrompts);
        const found = prompts.find((p) => p.id === savedId);
        if (found) {
          setActivePromptState(found);
        }
      }
    }
  }, []);

  const setActivePrompt = useCallback((prompt: SystemPrompt | null) => {
    setActivePromptState(prompt);
    if (prompt) {
      localStorage.setItem(STORAGE_KEY_ACTIVE, prompt.id);
    } else {
      localStorage.removeItem(STORAGE_KEY_ACTIVE);
    }
  }, []);

  return { activePrompt, setActivePrompt };
}
