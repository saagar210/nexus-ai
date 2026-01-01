// API Types for Nexus AI

export type TaskType =
  | "chat"
  | "question"
  | "document_analysis"
  | "rag_query"
  | "writing"
  | "creative"
  | "email"
  | "resume"
  | "code"
  | "summary";

export type WritingMode =
  | "email_response"
  | "cover_letter"
  | "resume"
  | "creative"
  | "general";

export type ProjectStatus =
  | "ideation"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "archived";

export type MemoryType =
  | "fact"
  | "preference"
  | "interaction"
  | "writing_style"
  | "topic";

// Chat Types
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  model_used?: string;
  task_type?: TaskType;
}

export interface ChatRequest {
  message: string;
  session_id?: string;
  model_override?: string;
  include_documents?: boolean;
  include_memory?: boolean;
  project_context?: string;
  system_prompt?: string;
}

export interface ChatResponse {
  response: string;
  session_id: string;
  model_used: string;
  task_type: TaskType;
  routing_reason: string;
  documents_used: string[];
  memory_context?: string;
}

export interface StreamChunk {
  type: "metadata" | "content" | "done" | "error";
  content?: string;
  done?: boolean;
  model_used?: string;
  task_type?: TaskType;
  session_id?: string;
  routing_reason?: string;
  documents_used?: string[];
  error?: string;
  full_response?: string;
}

// Session Types
export interface Session {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface SessionDetail extends Session {
  messages: ChatMessage[];
}

// Document Types
export interface Document {
  id: string;
  title: string;
  file_path?: string;
  file_type: string;
  size_bytes: number;
  created_at: string;
  indexed_at?: string;
  tags: string[];
  chunk_count: number;
}

export interface DocumentSearchResult {
  document_id: string;
  title: string;
  chunk_content: string;
  relevance_score: number;
  metadata: Record<string, unknown>;
}

// Project Types
export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  requirements: string[];
  goals: string[];
  notes?: string;
  related_documents: string[];
  created_at: string;
  updated_at: string;
}

export interface ProjectIteration {
  id: string;
  user_message: string;
  ai_response?: string;
  model_used?: string;
  documents_referenced: string[];
  created_at: string;
}

// Memory Types
export interface Memory {
  id: string;
  content: string;
  memory_type: MemoryType;
  category: string;
  source?: string;
  confidence: number;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  name: string;
  email?: string;
  age?: number;
  job?: string;
  location?: string;
  background?: string;
  interests: string[];
  preferences: Record<string, unknown>;
}

// Writing Types
export interface WritingRequest {
  mode: WritingMode;
  input_text: string;
  context?: string;
  style_hints?: string;
  additional_instructions?: string;
}

export interface WritingResponse {
  drafts: string[];
  model_used: string;
  style_notes?: string;
}

export interface WritingDraft {
  id: string;
  mode: WritingMode;
  input_text: string;
  draft_content: string;
  model_used?: string;
  is_favorite: boolean;
  created_at: string;
}

// Web Capture Types
export interface WebCapture {
  id: string;
  url: string;
  title: string;
  summary: string;
  key_points: string[];
  tags: string[];
  captured_at: string;
  processed: boolean;
  indexed: boolean;
}

// Settings Types
export interface WatchFolder {
  id: string;
  path: string;
  enabled: boolean;
  recursive: boolean;
  is_active: boolean;
  document_count: number;
}

export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
}

export interface ModelInfo {
  name: string;
  size: string;
  available: boolean;
  description: string;
}

export interface ModelStatus {
  models: ModelInfo[];
  ollama_running: boolean;
}

export interface Settings {
  watch_folders: WatchFolder[];
  available_models: string[];
  model_routing: Record<string, string>;
  user_profile: UserProfile;
  default_model?: string;
  profile?: UserProfile;
}

// App State Types
export interface AppState {
  currentTab: TabType;
  currentSession?: string;
  currentProject?: string;
  isDarkMode: boolean;
  isConnected: boolean;
}

export type TabType =
  | "chat"
  | "documents"
  | "projects"
  | "writing"
  | "memory"
  | "settings";
