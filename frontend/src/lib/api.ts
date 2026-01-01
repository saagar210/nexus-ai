import axios from "axios";
import type {
  ChatRequest,
  ChatResponse,
  Session,
  SessionDetail,
  Document,
  DocumentSearchResult,
  Project,
  ProjectIteration,
  Memory,
  UserProfile,
  WritingRequest,
  WritingResponse,
  WritingDraft,
  WebCapture,
  Settings,
  ModelStatus,
  StreamChunk,
  OllamaModel,
  WatchFolder,
} from "../types";

const API_BASE = "http://localhost:8420/api";

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

// === Chat API ===

export async function sendMessage(request: ChatRequest): Promise<ChatResponse> {
  const { data } = await api.post<ChatResponse>("/chat/", request);
  return data;
}

export async function* streamMessage(
  request: ChatRequest,
): AsyncGenerator<StreamChunk> {
  const response = await fetch(`${API_BASE}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const chunk: StreamChunk = JSON.parse(line.slice(6));
          yield chunk;
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }
}

export async function createSession(title?: string): Promise<Session> {
  const { data } = await api.post<Session>("/chat/sessions", { title });
  return data;
}

export async function listSessions(
  includeArchived = false,
): Promise<Session[]> {
  const { data } = await api.get<Session[]>("/chat/sessions", {
    params: { include_archived: includeArchived },
  });
  return data;
}

export async function getSession(sessionId: string): Promise<SessionDetail> {
  const { data } = await api.get<SessionDetail>(`/chat/sessions/${sessionId}`);
  return data;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await api.delete(`/chat/sessions/${sessionId}`);
}

export async function archiveSession(sessionId: string): Promise<void> {
  await api.post(`/chat/sessions/${sessionId}/archive`);
}

// === Documents API ===

export async function listDocuments(
  fileType?: string,
  tag?: string,
): Promise<Document[]> {
  const { data } = await api.get<Document[]>("/documents/", {
    params: { file_type: fileType, tag },
  });
  return data;
}

export async function getDocument(documentId: string): Promise<Document> {
  const { data } = await api.get<Document>(`/documents/${documentId}`);
  return data;
}

export async function uploadDocument(
  file: File,
  title?: string,
  tags?: string[],
): Promise<Document> {
  const formData = new FormData();
  formData.append("file", file);
  if (title) formData.append("title", title);
  if (tags) formData.append("tags", tags.join(","));

  const { data } = await api.post<Document>("/documents/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function indexDocument(
  filePath?: string,
  content?: string,
  title?: string,
  tags?: string[],
): Promise<Document> {
  const { data } = await api.post<Document>("/documents/", {
    file_path: filePath,
    content,
    title,
    tags,
  });
  return data;
}

export async function searchDocuments(
  query: string,
  topK = 5,
  filterTags?: string[],
  fileTypes?: string[],
): Promise<DocumentSearchResult[]> {
  const { data } = await api.post<DocumentSearchResult[]>("/documents/search", {
    query,
    top_k: topK,
    filter_tags: filterTags,
    file_types: fileTypes,
  });
  return data;
}

export async function deleteDocument(documentId: string): Promise<void> {
  await api.delete(`/documents/${documentId}`);
}

export async function getDocumentStats(): Promise<{
  total_documents: number;
  total_size_bytes: number;
  total_chunks: number;
  documents_by_type: Record<string, number>;
}> {
  const { data } = await api.get("/documents/stats/overview");
  return data;
}

// === Memory API ===

export async function listMemories(
  memoryType?: string,
  category?: string,
  query?: string,
): Promise<Memory[]> {
  const { data } = await api.get<Memory[]>("/memory/", {
    params: { memory_type: memoryType, category, query },
  });
  return data;
}

export async function createMemory(
  content: string,
  memoryType: string,
  source?: string,
  confidence = 1.0,
): Promise<Memory> {
  const { data } = await api.post<Memory>("/memory/", {
    content,
    memory_type: memoryType,
    source,
    confidence,
  });
  return data;
}

export async function updateMemory(
  memoryId: string,
  content?: string,
  memoryType?: string,
  confidence?: number,
): Promise<Memory> {
  const { data } = await api.put<Memory>(`/memory/${memoryId}`, {
    content,
    memory_type: memoryType,
    confidence,
  });
  return data;
}

export async function deleteMemory(memoryId: string): Promise<void> {
  await api.delete(`/memory/${memoryId}`);
}

export async function getUserProfile(): Promise<UserProfile> {
  const { data } = await api.get<UserProfile>("/memory/profile");
  return data;
}

export async function getMemoryTimeline(
  limit = 100,
  offset = 0,
): Promise<Array<{ type: string; content: string; timestamp: string }>> {
  const { data } = await api.get("/memory/timeline", {
    params: { limit, offset },
  });
  return data;
}

export async function exportMemories(): Promise<{
  exported_at: string;
  memories: Memory[];
}> {
  const { data } = await api.get("/memory/export");
  return data;
}

// === Projects API ===

export async function listProjects(
  status?: string,
  includeArchived = false,
): Promise<Project[]> {
  const { data } = await api.get<Project[]>("/projects/", {
    params: { status, include_archived: includeArchived },
  });
  return data;
}

export async function createProject(
  name: string,
  description?: string,
  requirements?: string[],
  goals?: string[],
): Promise<Project> {
  const { data } = await api.post<Project>("/projects/", {
    name,
    description,
    requirements,
    goals,
  });
  return data;
}

export async function getProject(projectId: string): Promise<Project> {
  const { data } = await api.get<Project>(`/projects/${projectId}`);
  return data;
}

export async function updateProject(
  projectId: string,
  updates: Partial<Project>,
): Promise<Project> {
  const { data } = await api.put<Project>(`/projects/${projectId}`, updates);
  return data;
}

export async function deleteProject(projectId: string): Promise<void> {
  await api.delete(`/projects/${projectId}`);
}

export async function iterateOnProject(
  projectId: string,
  message: string,
  includeDocuments = true,
): Promise<{
  response: string;
  model_used: string;
  documents_referenced: string[];
  iteration_id: string;
}> {
  const { data } = await api.post(`/projects/${projectId}/iterate`, {
    project_id: projectId,
    message,
    include_documents: includeDocuments,
  });
  return data;
}

export async function getProjectIterations(
  projectId: string,
  limit = 20,
): Promise<ProjectIteration[]> {
  const { data } = await api.get(`/projects/${projectId}/iterations`, {
    params: { limit },
  });
  return data;
}

export async function getProjectSummary(
  projectId: string,
): Promise<{ summary: string; iteration_count: number }> {
  const { data } = await api.get(`/projects/${projectId}/summary`);
  return data;
}

// === Writing API ===

export async function generateDrafts(
  request: WritingRequest,
  numDrafts = 2,
): Promise<WritingResponse> {
  const { data } = await api.post<WritingResponse>(
    "/writing/generate",
    request,
    {
      params: { num_drafts: numDrafts },
    },
  );
  return data;
}

export async function refineDraft(
  draft: string,
  feedback: string,
  mode: string,
): Promise<WritingResponse> {
  const { data } = await api.post<WritingResponse>("/writing/refine", {
    draft,
    feedback,
    mode,
  });
  return data;
}

export async function draftEmailResponse(
  emailThread: string,
  instructions?: string,
): Promise<WritingResponse> {
  const { data } = await api.post<WritingResponse>(
    "/writing/email-response",
    null,
    {
      params: { email_thread: emailThread, instructions },
    },
  );
  return data;
}

export async function getRecentDrafts(
  mode?: string,
  limit = 20,
): Promise<WritingDraft[]> {
  const { data } = await api.get("/writing/drafts", {
    params: { mode, limit },
  });
  return data;
}

// === Web Capture API ===

export async function captureWebpage(
  url: string,
  title: string,
  content: string,
): Promise<WebCapture> {
  const { data } = await api.post<WebCapture>("/webcapture/", {
    url,
    title,
    content,
  });
  return data;
}

export async function listWebCaptures(limit = 50): Promise<WebCapture[]> {
  const { data } = await api.get("/webcapture/", {
    params: { limit },
  });
  return data;
}

export async function getBookmarklet(): Promise<{
  bookmarklet: string;
  instructions: string[];
  note: string;
}> {
  const { data } = await api.get("/webcapture/bookmarklet");
  return data;
}

// === Settings API ===

export async function getSettings(): Promise<Settings> {
  const { data } = await api.get<Settings>("/settings/");
  return data;
}

export async function getModelStatus(): Promise<ModelStatus> {
  const { data } = await api.get<ModelStatus>("/settings/models");
  return data;
}

export async function pullModel(
  modelName: string,
  onProgress?: (progress: {
    status: string;
    completed?: number;
    total?: number;
  }) => void,
): Promise<void> {
  const response = await fetch(
    `${API_BASE}/settings/models/${modelName}/pull`,
    {
      method: "POST",
    },
  );

  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ") && onProgress) {
        try {
          const progress = JSON.parse(line.slice(6));
          onProgress(progress);
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }
}

export async function checkHealth(): Promise<{
  status: string;
  ollama: string;
  file_watcher: string;
}> {
  const { data } = await api.get("/settings/health");
  return data;
}

export async function exportAllData(): Promise<unknown> {
  const { data } = await api.get("/settings/export");
  return data;
}

// === Additional Memory API ===

export async function getMemories(
  category?: string,
  limit = 100,
): Promise<Memory[]> {
  const { data } = await api.get<Memory[]>("/memory/", {
    params: { category, limit },
  });
  return data;
}

export async function searchMemories(query: string): Promise<Memory[]> {
  const { data } = await api.get<Memory[]>("/memory/search", {
    params: { query },
  });
  return data;
}

// === Additional Settings API ===

export async function updateSettings(
  updates: Partial<Settings>,
): Promise<Settings> {
  const { data } = await api.put<Settings>("/settings/", updates);
  return data;
}

export async function getOllamaModels(): Promise<OllamaModel[]> {
  const { data } = await api.get<OllamaModel[]>("/settings/models/list");
  return data;
}

export async function pullOllamaModel(modelName: string): Promise<void> {
  await api.post(`/settings/models/${modelName}/pull`);
}

export async function getWatchFolders(): Promise<WatchFolder[]> {
  const { data } = await api.get<WatchFolder[]>("/settings/watch-folders");
  return data;
}

export async function addWatchFolder(path: string): Promise<WatchFolder> {
  const { data } = await api.post<WatchFolder>("/settings/watch-folders", {
    path,
  });
  return data;
}

export async function removeWatchFolder(folderId: string): Promise<void> {
  await api.delete(`/settings/watch-folders/${folderId}`);
}

export async function exportData(): Promise<unknown> {
  const { data } = await api.get("/settings/export");
  return data;
}

export async function clearAllData(): Promise<void> {
  await api.post("/settings/clear-all");
}

export default api;
