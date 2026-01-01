import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Brain,
  Search,
  Trash2,
  Edit3,
  Check,
  X,
  User,
  Briefcase,
  Heart,
  MapPin,
  Calendar,
  Tag,
  Clock,
} from "lucide-react";
import type { Memory } from "../types";
import {
  getMemories,
  searchMemories,
  updateMemory,
  deleteMemory,
} from "../lib/api";

const CATEGORY_CONFIG: Record<
  string,
  { icon: React.ReactNode; color: string; label: string }
> = {
  personal: {
    icon: <User size={14} />,
    color: "bg-blue-500",
    label: "Personal",
  },
  professional: {
    icon: <Briefcase size={14} />,
    color: "bg-purple-500",
    label: "Professional",
  },
  preferences: {
    icon: <Heart size={14} />,
    color: "bg-pink-500",
    label: "Preferences",
  },
  location: {
    icon: <MapPin size={14} />,
    color: "bg-green-500",
    label: "Location",
  },
  event: {
    icon: <Calendar size={14} />,
    color: "bg-orange-500",
    label: "Event",
  },
  general: {
    icon: <Tag size={14} />,
    color: "bg-gray-500",
    label: "General",
  },
};

export default function MemoryPage(): React.ReactElement {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const { data: memories = [] } = useQuery({
    queryKey: ["memories"],
    queryFn: () => getMemories(),
  });

  const { data: searchResults } = useQuery({
    queryKey: ["memorySearch", searchQuery],
    queryFn: () => searchMemories(searchQuery),
    enabled: searchQuery.length > 2,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      updateMemory(id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMemory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
    },
  });

  const displayMemories = searchQuery.length > 2 ? searchResults : memories;

  const filteredMemories = selectedCategory
    ? displayMemories?.filter((m: Memory) => m.category === selectedCategory)
    : displayMemories;

  const categoryCounts = memories.reduce(
    (acc: Record<string, number>, m: Memory) => {
      acc[m.category] = (acc[m.category] || 0) + 1;
      return acc;
    },
    {},
  );

  const startEdit = (memory: Memory): void => {
    setEditingId(memory.id);
    setEditContent(memory.content);
  };

  const saveEdit = (): void => {
    if (editingId && editContent.trim()) {
      updateMutation.mutate({ id: editingId, content: editContent.trim() });
    }
  };

  const cancelEdit = (): void => {
    setEditingId(null);
    setEditContent("");
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Memory Browser</h1>
          <p className="text-muted-foreground">
            {memories.length} memories · What the AI knows about you
          </p>
        </div>

        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={18}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories..."
            className="pl-10 pr-4 py-2 bg-muted rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-nexus-500"
          />
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Category Sidebar */}
        <div className="w-48 flex-shrink-0">
          <h3 className="font-medium text-sm text-muted-foreground mb-3">
            Categories
          </h3>
          <div className="space-y-1">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors ${
                selectedCategory === null
                  ? "bg-nexus-500/10 text-nexus-600"
                  : "hover:bg-muted"
              }`}
            >
              <span className="flex items-center gap-2">
                <Brain size={14} />
                All Memories
              </span>
              <span className="text-muted-foreground">{memories.length}</span>
            </button>

            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors ${
                  selectedCategory === key
                    ? "bg-nexus-500/10 text-nexus-600"
                    : "hover:bg-muted"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`${config.color} text-white p-0.5 rounded`}>
                    {config.icon}
                  </span>
                  {config.label}
                </span>
                <span className="text-muted-foreground">
                  {categoryCounts[key] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Memory List */}
        <div className="flex-1 overflow-auto">
          {filteredMemories && filteredMemories.length > 0 ? (
            <div className="space-y-3">
              {filteredMemories.map((memory: Memory) => {
                const config =
                  CATEGORY_CONFIG[memory.category] || CATEGORY_CONFIG.general;
                const isEditing = editingId === memory.id;

                return (
                  <div
                    key={memory.id}
                    className="group bg-card border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`${config.color} text-white p-1.5 rounded-lg flex-shrink-0`}
                      >
                        {config.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="space-y-2">
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="w-full bg-muted rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-nexus-500 text-sm resize-none"
                              rows={3}
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={saveEdit}
                                className="flex items-center gap-1 px-3 py-1 bg-nexus-500 text-white rounded text-sm hover:bg-nexus-600"
                              >
                                <Check size={14} />
                                Save
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="flex items-center gap-1 px-3 py-1 bg-muted rounded text-sm hover:bg-muted/80"
                              >
                                <X size={14} />
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm">{memory.content}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock size={10} />
                                {formatDate(memory.created_at)}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded ${config.color}/10 text-${config.color.replace("bg-", "")}`}
                              >
                                {config.label}
                              </span>
                              {memory.confidence && (
                                <span>
                                  Confidence:{" "}
                                  {(memory.confidence * 100).toFixed(0)}%
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      {!isEditing && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEdit(memory)}
                            className="p-1.5 hover:bg-muted rounded"
                            title="Edit"
                          >
                            <Edit3
                              size={14}
                              className="text-muted-foreground"
                            />
                          </button>
                          <button
                            onClick={() => deleteMutation.mutate(memory.id)}
                            className="p-1.5 hover:bg-destructive/10 rounded"
                            title="Delete"
                          >
                            <Trash2 size={14} className="text-destructive" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Brain size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No memories yet</p>
                <p className="text-sm">
                  Start chatting and I'll remember important details about you
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
