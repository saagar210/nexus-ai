import { useState, useCallback, useMemo } from "react";
import {
  GitBranch,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Check,
} from "lucide-react";

// Types for branching conversation structure
export interface BranchNode {
  id: string;
  parentId: string | null;
  messageId: string;
  content: string;
  role: "user" | "assistant";
  children: string[];
  createdAt: Date;
  branchName?: string;
}

export interface ConversationBranch {
  id: string;
  name: string;
  rootId: string;
  currentNodeId: string;
  nodes: Map<string, BranchNode>;
}

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Hook for managing branched conversations
export function useConversationBranching(): {
  branches: ConversationBranch[];
  currentBranch: ConversationBranch | null;
  currentPath: BranchNode[];
  createBranch: (name: string, fromNodeId?: string) => string;
  switchBranch: (branchId: string) => void;
  addNode: (content: string, role: "user" | "assistant") => string;
  navigateToNode: (nodeId: string) => void;
  deleteBranch: (branchId: string) => void;
  renameBranch: (branchId: string, newName: string) => void;
  getNodeChildren: (nodeId: string) => BranchNode[];
  hasAlternatives: (nodeId: string) => boolean;
} {
  const [branches, setBranches] = useState<ConversationBranch[]>([]);
  const [currentBranchId, setCurrentBranchId] = useState<string | null>(null);

  const currentBranch = useMemo(() => {
    return branches.find((b) => b.id === currentBranchId) || null;
  }, [branches, currentBranchId]);

  // Get the path from root to current node
  const currentPath = useMemo(() => {
    if (!currentBranch) return [];

    const path: BranchNode[] = [];
    let nodeId: string | null = currentBranch.currentNodeId;

    while (nodeId) {
      const node = currentBranch.nodes.get(nodeId);
      if (node) {
        path.unshift(node);
        nodeId = node.parentId;
      } else {
        break;
      }
    }

    return path;
  }, [currentBranch]);

  const createBranch = useCallback((name: string, _fromNodeId?: string) => {
    const branchId = generateId();
    const rootId = generateId();

    const rootNode: BranchNode = {
      id: rootId,
      parentId: null,
      messageId: rootId,
      content: "",
      role: "assistant",
      children: [],
      createdAt: new Date(),
    };

    const nodes = new Map<string, BranchNode>();
    nodes.set(rootId, rootNode);

    const newBranch: ConversationBranch = {
      id: branchId,
      name,
      rootId,
      currentNodeId: rootId,
      nodes,
    };

    setBranches((prev) => [...prev, newBranch]);
    setCurrentBranchId(branchId);

    return branchId;
  }, []);

  const switchBranch = useCallback((branchId: string) => {
    setCurrentBranchId(branchId);
  }, []);

  const addNode = useCallback(
    (content: string, role: "user" | "assistant") => {
      if (!currentBranch) {
        // Create default branch if none exists
        const branchId = createBranch("Main");
        // Need to get the new branch
        const newBranch = branches.find((b) => b.id === branchId);
        if (!newBranch) return "";
      }

      const nodeId = generateId();
      const parentId = currentBranch?.currentNodeId || null;

      const newNode: BranchNode = {
        id: nodeId,
        parentId,
        messageId: nodeId,
        content,
        role,
        children: [],
        createdAt: new Date(),
      };

      setBranches((prev) =>
        prev.map((branch) => {
          if (branch.id !== currentBranchId) return branch;

          const updatedNodes = new Map(branch.nodes);
          updatedNodes.set(nodeId, newNode);

          // Update parent's children
          if (parentId) {
            const parent = updatedNodes.get(parentId);
            if (parent) {
              updatedNodes.set(parentId, {
                ...parent,
                children: [...parent.children, nodeId],
              });
            }
          }

          return {
            ...branch,
            currentNodeId: nodeId,
            nodes: updatedNodes,
          };
        }),
      );

      return nodeId;
    },
    [currentBranch, currentBranchId, branches, createBranch],
  );

  const navigateToNode = useCallback(
    (nodeId: string) => {
      setBranches((prev) =>
        prev.map((branch) => {
          if (branch.id !== currentBranchId) return branch;
          if (!branch.nodes.has(nodeId)) return branch;
          return { ...branch, currentNodeId: nodeId };
        }),
      );
    },
    [currentBranchId],
  );

  const deleteBranch = useCallback(
    (branchId: string) => {
      setBranches((prev) => prev.filter((b) => b.id !== branchId));
      if (currentBranchId === branchId) {
        setCurrentBranchId(branches[0]?.id || null);
      }
    },
    [currentBranchId, branches],
  );

  const renameBranch = useCallback((branchId: string, newName: string) => {
    setBranches((prev) =>
      prev.map((b) => (b.id === branchId ? { ...b, name: newName } : b)),
    );
  }, []);

  const getNodeChildren = useCallback(
    (nodeId: string): BranchNode[] => {
      if (!currentBranch) return [];
      const node = currentBranch.nodes.get(nodeId);
      if (!node) return [];
      return node.children
        .map((id) => currentBranch.nodes.get(id))
        .filter(Boolean) as BranchNode[];
    },
    [currentBranch],
  );

  const hasAlternatives = useCallback(
    (nodeId: string): boolean => {
      if (!currentBranch) return false;
      const node = currentBranch.nodes.get(nodeId);
      if (!node || !node.parentId) return false;
      const parent = currentBranch.nodes.get(node.parentId);
      return parent ? parent.children.length > 1 : false;
    },
    [currentBranch],
  );

  return {
    branches,
    currentBranch,
    currentPath,
    createBranch,
    switchBranch,
    addNode,
    navigateToNode,
    deleteBranch,
    renameBranch,
    getNodeChildren,
    hasAlternatives,
  };
}

// Branch selector dropdown
interface BranchSelectorProps {
  branches: ConversationBranch[];
  currentBranchId: string | null;
  onSelect: (branchId: string) => void;
  onCreate: () => void;
  onDelete: (branchId: string) => void;
  onRename: (branchId: string, newName: string) => void;
}

export function BranchSelector({
  branches,
  currentBranchId,
  onSelect,
  onCreate,
  onDelete,
  onRename,
}: BranchSelectorProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const currentBranch = branches.find((b) => b.id === currentBranchId);

  const handleStartEdit = (branch: ConversationBranch): void => {
    setEditingId(branch.id);
    setEditName(branch.name);
  };

  const handleSaveEdit = (): void => {
    if (editingId && editName.trim()) {
      onRename(editingId, editName.trim());
    }
    setEditingId(null);
    setEditName("");
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:bg-muted text-sm"
      >
        <GitBranch size={14} />
        <span>{currentBranch?.name || "No branch"}</span>
        <ChevronRight
          size={14}
          className={`transition-transform ${isOpen ? "rotate-90" : ""}`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-full mt-1 w-64 bg-card border border-border rounded-lg shadow-xl z-20 overflow-hidden">
            <div className="p-2 space-y-1">
              {branches.map((branch) => (
                <div
                  key={branch.id}
                  className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                    branch.id === currentBranchId
                      ? "bg-nexus-500/10"
                      : "hover:bg-muted"
                  }`}
                >
                  {editingId === branch.id ? (
                    <>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                        className="flex-1 px-2 py-1 bg-background border border-border rounded text-sm"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveEdit}
                        className="p-1 hover:bg-muted rounded text-green-500"
                      >
                        <Check size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          onSelect(branch.id);
                          setIsOpen(false);
                        }}
                        className="flex-1 text-left text-sm truncate"
                      >
                        {branch.name}
                      </button>
                      <button
                        onClick={() => handleStartEdit(branch)}
                        className="p-1 hover:bg-muted rounded text-muted-foreground"
                      >
                        <Edit2 size={12} />
                      </button>
                      {branches.length > 1 && (
                        <button
                          onClick={() => onDelete(branch.id)}
                          className="p-1 hover:bg-muted rounded text-red-500"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="border-t border-border p-2">
              <button
                onClick={() => {
                  onCreate();
                  setIsOpen(false);
                }}
                className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-muted text-sm text-muted-foreground"
              >
                <Plus size={14} />
                New branch
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Alternative response navigator
interface AlternativeNavigatorProps {
  alternatives: BranchNode[];
  currentIndex: number;
  onNavigate: (nodeId: string) => void;
}

export function AlternativeNavigator({
  alternatives,
  currentIndex,
  onNavigate,
}: AlternativeNavigatorProps): React.ReactElement | null {
  if (alternatives.length <= 1) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <button
        onClick={() => {
          const prevIndex =
            (currentIndex - 1 + alternatives.length) % alternatives.length;
          onNavigate(alternatives[prevIndex].id);
        }}
        className="p-1 hover:bg-muted rounded"
        disabled={alternatives.length <= 1}
      >
        ‹
      </button>
      <span>
        {currentIndex + 1} / {alternatives.length}
      </span>
      <button
        onClick={() => {
          const nextIndex = (currentIndex + 1) % alternatives.length;
          onNavigate(alternatives[nextIndex].id);
        }}
        className="p-1 hover:bg-muted rounded"
        disabled={alternatives.length <= 1}
      >
        ›
      </button>
    </div>
  );
}
