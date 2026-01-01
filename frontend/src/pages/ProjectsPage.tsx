import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  FolderKanban,
  Send,
  Trash2,
  ChevronRight,
  Lightbulb,
  Target,
  FileText,
} from "lucide-react";
import type { Project, ProjectIteration } from "../types";
import {
  listProjects,
  createProject,
  deleteProject,
  iterateOnProject,
  getProjectIterations,
} from "../lib/api";

const STATUS_COLORS: Record<string, string> = {
  ideation: "bg-purple-500",
  in_progress: "bg-blue-500",
  on_hold: "bg-yellow-500",
  completed: "bg-green-500",
  archived: "bg-gray-500",
};

export default function ProjectsPage(): React.ReactElement {
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [iterationInput, setIterationInput] = useState("");
  const [isIterating, setIsIterating] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => listProjects(),
  });

  const selectedProject = projects.find(
    (p: Project) => p.id === selectedProjectId,
  );

  const { data: iterations = [] } = useQuery({
    queryKey: ["projectIterations", selectedProjectId],
    queryFn: () => getProjectIterations(selectedProjectId!),
    enabled: !!selectedProjectId,
  });

  const createMutation = useMutation({
    mutationFn: () => createProject(newProjectName, newProjectDesc),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setSelectedProjectId(project.id);
      setShowNewProject(false);
      setNewProjectName("");
      setNewProjectDesc("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setSelectedProjectId(null);
    },
  });

  const handleIterate = async (): Promise<void> => {
    if (!selectedProjectId || !iterationInput.trim()) return;

    setIsIterating(true);
    try {
      await iterateOnProject(selectedProjectId, iterationInput);
      queryClient.invalidateQueries({
        queryKey: ["projectIterations", selectedProjectId],
      });
      setIterationInput("");
    } finally {
      setIsIterating(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* Projects List */}
      <div className="w-80 bg-card border-r border-border flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">Projects</h2>
          <button
            onClick={() => setShowNewProject(true)}
            className="p-2 bg-nexus-500 text-white rounded-lg hover:bg-nexus-600"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {projects.map((project: Project) => (
            <div
              key={project.id}
              onClick={() => setSelectedProjectId(project.id)}
              className={`group p-3 rounded-lg cursor-pointer mb-1 ${
                selectedProjectId === project.id
                  ? "bg-nexus-500/10 border border-nexus-500/30"
                  : "hover:bg-muted"
              }`}
            >
              <div className="flex items-start gap-2">
                <FolderKanban size={16} className="text-nexus-500 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {project.name}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`w-2 h-2 rounded-full ${STATUS_COLORS[project.status]}`}
                    />
                    <span className="text-xs text-muted-foreground capitalize">
                      {project.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Project Detail / New Project */}
      <div className="flex-1 flex flex-col">
        {showNewProject ? (
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">New Project</h2>
            <div className="max-w-lg space-y-4">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Project name"
                className="w-full px-4 py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-nexus-500"
              />
              <textarea
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
                placeholder="Description (optional)"
                className="w-full px-4 py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-nexus-500 min-h-[100px]"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={!newProjectName.trim()}
                  className="bg-nexus-500 text-white px-4 py-2 rounded-lg hover:bg-nexus-600 disabled:opacity-50"
                >
                  Create Project
                </button>
                <button
                  onClick={() => setShowNewProject(false)}
                  className="px-4 py-2 rounded-lg hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : selectedProject ? (
          <>
            {/* Project Header */}
            <div className="p-6 border-b border-border">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold">{selectedProject.name}</h1>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`w-2 h-2 rounded-full ${STATUS_COLORS[selectedProject.status]}`}
                    />
                    <span className="text-sm text-muted-foreground capitalize">
                      {selectedProject.status.replace("_", " ")}
                    </span>
                  </div>
                  {selectedProject.description && (
                    <p className="text-muted-foreground mt-2">
                      {selectedProject.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => deleteMutation.mutate(selectedProject.id)}
                  className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              {/* Requirements & Goals */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Target size={14} className="text-nexus-500" />
                    Requirements
                  </div>
                  {selectedProject.requirements.length > 0 ? (
                    <ul className="text-sm space-y-1">
                      {selectedProject.requirements.map((req, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <ChevronRight
                            size={12}
                            className="mt-1 text-muted-foreground"
                          />
                          {req}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No requirements defined
                    </p>
                  )}
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Lightbulb size={14} className="text-yellow-500" />
                    Goals
                  </div>
                  {selectedProject.goals.length > 0 ? (
                    <ul className="text-sm space-y-1">
                      {selectedProject.goals.map((goal, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <ChevronRight
                            size={12}
                            className="mt-1 text-muted-foreground"
                          />
                          {goal}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No goals defined
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Iterations */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {iterations.map((it: ProjectIteration) => (
                <div key={it.id} className="space-y-2">
                  <div className="flex justify-end">
                    <div className="bg-nexus-500 text-white rounded-2xl px-4 py-2 max-w-[80%]">
                      {it.user_message}
                    </div>
                  </div>
                  {it.ai_response && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-2xl px-4 py-2 max-w-[80%]">
                        <div className="whitespace-pre-wrap">
                          {it.ai_response}
                        </div>
                        {it.documents_referenced.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <FileText size={10} />
                            {it.documents_referenced.length} docs referenced
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Iteration Input */}
            <div className="border-t border-border p-4">
              <div className="flex items-end gap-2">
                <textarea
                  value={iterationInput}
                  onChange={(e) => setIterationInput(e.target.value)}
                  placeholder="Describe your idea, ask for suggestions, or refine requirements..."
                  className="flex-1 bg-muted rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-nexus-500 min-h-[48px] max-h-[150px] resize-none"
                  rows={1}
                />
                <button
                  onClick={handleIterate}
                  disabled={!iterationInput.trim() || isIterating}
                  className="bg-nexus-500 text-white rounded-xl p-3 hover:bg-nexus-600 disabled:opacity-50"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <FolderKanban size={48} className="mx-auto mb-4 opacity-50" />
              <p>Select a project or create a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
