import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Send,
  Plus,
  Trash2,
  Cpu,
  FileText,
  Clock,
  ChevronRight,
  Settings2,
  BookMarked,
  X,
  Sparkles,
  Download,
  Bot,
} from "lucide-react";
import type { ChatMessage, Session } from "../types";
import {
  listSessions,
  getSession,
  createSession,
  deleteSession,
  streamMessage,
} from "../lib/api";
import SystemPrompts, {
  useActiveSystemPrompt,
} from "../components/SystemPrompts";
import type { SavedPrompt } from "../components/SystemPrompts";
import PromptTemplates from "../components/PromptTemplates";
import type { PromptTemplate } from "../components/PromptTemplates";

// Import new components
import MarkdownRenderer from "../components/MarkdownRenderer";
import MessageActions from "../components/MessageActions";
import VoiceInput from "../components/VoiceInput";
import ContextIndicator from "../components/ContextIndicator";
import StreamingIndicator from "../components/StreamingIndicator";
import ChatExport from "../components/ChatExport";
import ModelSelector, { useModelSelection } from "../components/MultiModelChat";
import AgentModeToggle, { useAgentMode } from "../components/AgentMode";

export default function ChatPage(): React.ReactElement {
  const queryClient = useQueryClient();
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const [routingReason, setRoutingReason] = useState<string | null>(null);
  const [documentsUsed, setDocumentsUsed] = useState<string[]>([]);
  const [rightPanel, setRightPanel] = useState<
    "none" | "system-prompts" | "templates" | "export"
  >("none");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Get active system prompt
  const { activePrompt, setActivePrompt } = useActiveSystemPrompt();

  // Model selection hook
  const { selectedModel, setSelectedModel } = useModelSelection();

  // Agent mode hook
  const { isAgentMode, toggleAgentMode } = useAgentMode();

  // Fetch sessions
  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => listSessions(),
  });

  // Fetch session messages when session changes
  useEffect(() => {
    if (currentSessionId) {
      getSession(currentSessionId).then((session) => {
        setMessages(session.messages);
      });
    } else {
      setMessages([]);
    }
  }, [currentSessionId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Create new session
  const createSessionMutation = useMutation({
    mutationFn: createSession,
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      setCurrentSessionId(session.id);
      setMessages([]);
    },
  });

  // Delete session
  const deleteSessionMutation = useMutation({
    mutationFn: deleteSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      if (currentSessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
    },
  });

  // Handle sending message
  const handleSend = useCallback(async (): Promise<void> => {
    if (!input.trim() || isStreaming) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);
    setCurrentModel(null);
    setRoutingReason(null);
    setDocumentsUsed([]);

    // Add placeholder for assistant response
    const assistantMessage: ChatMessage = {
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      let sessionId = currentSessionId;

      for await (const chunk of streamMessage({
        message: userMessage.content,
        session_id: sessionId || undefined,
        system_prompt: activePrompt?.content,
        model_override: selectedModel || undefined,
      })) {
        if (chunk.type === "metadata") {
          sessionId = chunk.session_id || sessionId;
          setCurrentSessionId(sessionId);
          setCurrentModel(chunk.model_used || null);
          setRoutingReason(chunk.routing_reason || null);
          setDocumentsUsed(chunk.documents_used || []);
        } else if (chunk.type === "content" && chunk.content) {
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage.role === "assistant") {
              lastMessage.content += chunk.content;
            }
            return newMessages;
          });
        } else if (chunk.type === "done") {
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage.role === "assistant") {
              lastMessage.model_used = currentModel || undefined;
            }
            return newMessages;
          });
          queryClient.invalidateQueries({ queryKey: ["sessions"] });
        }
      }
    } catch (error) {
      console.error("Error streaming message:", error);
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage.role === "assistant") {
          lastMessage.content =
            "Sorry, there was an error processing your message.";
        }
        return newMessages;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [
    input,
    isStreaming,
    currentSessionId,
    currentModel,
    queryClient,
    activePrompt,
    selectedModel,
  ]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle template selection
  const handleTemplateSelect = (
    _template: PromptTemplate,
    filledPrompt: string,
  ): void => {
    setInput(filledPrompt);
    setRightPanel("none");
    inputRef.current?.focus();
  };

  // Handle saved prompt usage
  const handleUseSavedPrompt = (prompt: SavedPrompt): void => {
    setInput(prompt.content);
    setRightPanel("none");
    inputRef.current?.focus();
  };

  // Handle voice transcript
  const handleVoiceTranscript = (text: string): void => {
    setInput((prev) => prev + (prev ? " " : "") + text);
  };

  // Handle message edit
  const handleMessageEdit = (index: number, newContent: string): void => {
    setMessages((prev) => {
      const newMessages = [...prev];
      newMessages[index] = { ...newMessages[index], content: newContent };
      return newMessages;
    });
  };

  // Handle message regenerate
  const handleRegenerate = async (index: number): Promise<void> => {
    // Find the user message before this assistant message
    if (messages[index].role !== "assistant" || index === 0) return;

    const userMessage = messages[index - 1];
    if (userMessage.role !== "user") return;

    // Remove the current assistant response
    setMessages((prev) => prev.slice(0, index));

    // Resend the user message
    setInput(userMessage.content);
  };

  // Handle message delete
  const handleMessageDelete = (index: number): void => {
    setMessages((prev) => prev.filter((_, i) => i !== index));
  };

  // Toggle right panel
  const togglePanel = (
    panel: "system-prompts" | "templates" | "export",
  ): void => {
    setRightPanel((current) => (current === panel ? "none" : panel));
  };

  // Get current session for export
  const currentSession = sessions.find(
    (s: Session) => s.id === currentSessionId,
  );

  return (
    <div className="flex h-full">
      {/* Sessions Sidebar */}
      <div className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <button
            onClick={() => createSessionMutation.mutate(undefined)}
            className="w-full flex items-center justify-center gap-2 bg-nexus-500 text-white rounded-lg px-4 py-2 hover:bg-nexus-600 transition-colors"
          >
            <Plus size={18} />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {sessions.map((session: Session) => (
            <div
              key={session.id}
              onClick={() => setCurrentSessionId(session.id)}
              className={`group flex items-center gap-2 p-3 rounded-lg cursor-pointer mb-1 ${
                currentSessionId === session.id
                  ? "bg-nexus-500/10 text-nexus-600"
                  : "hover:bg-muted"
              }`}
            >
              <Clock
                size={16}
                className="text-muted-foreground flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {session.title}
                </div>
                <div className="text-xs text-muted-foreground">
                  {session.message_count} messages
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSessionMutation.mutate(session.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-opacity"
              >
                <Trash2 size={14} className="text-destructive" />
              </button>
            </div>
          ))}

          {sessions.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              No conversations yet
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Model Info Bar */}
        <div className="bg-muted/50 border-b border-border px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            {currentModel ? (
              <>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Cpu size={14} />
                  <span className="font-medium text-foreground">
                    {currentModel}
                  </span>
                </div>
                {routingReason && (
                  <>
                    <ChevronRight size={14} className="text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {routingReason}
                    </span>
                  </>
                )}
                {documentsUsed.length > 0 && (
                  <>
                    <ChevronRight size={14} className="text-muted-foreground" />
                    <div className="flex items-center gap-1">
                      <FileText size={14} className="text-nexus-500" />
                      <span className="text-muted-foreground">
                        {documentsUsed.length} doc
                        {documentsUsed.length > 1 ? "s" : ""} referenced
                      </span>
                    </div>
                  </>
                )}
              </>
            ) : (
              <ModelSelector
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Context Indicator */}
            <ContextIndicator messages={messages} />

            {/* Agent Mode Toggle */}
            <AgentModeToggle
              isEnabled={isAgentMode}
              onToggle={toggleAgentMode}
            />

            {/* Streaming Indicator */}
            {isStreaming && (
              <StreamingIndicator
                isStreaming={isStreaming}
                content={messages[messages.length - 1]?.content || ""}
              />
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-nexus-500 to-nexus-700 flex items-center justify-center mx-auto mb-4">
                  <Cpu className="text-white" size={32} />
                </div>
                <h2 className="text-xl font-semibold mb-2">
                  Welcome to Nexus AI
                </h2>
                <p className="text-muted-foreground">
                  Your personal AI assistant with memory, document intelligence,
                  and smart model routing. Start a conversation or drop files to
                  get started.
                </p>
                {isAgentMode && (
                  <div className="mt-4 p-3 bg-nexus-500/10 rounded-lg text-sm">
                    <Bot className="inline mr-2" size={16} />
                    Agent mode is enabled. The AI can use tools to help you.
                  </div>
                )}
              </div>
            </div>
          )}

          {messages.map((message, idx) => (
            <div
              key={idx}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-fade-in group`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 relative ${
                  message.role === "user"
                    ? "bg-nexus-500 text-white"
                    : "bg-muted"
                }`}
              >
                {message.role === "assistant" ? (
                  <MarkdownRenderer content={message.content} />
                ) : (
                  <div className="whitespace-pre-wrap">{message.content}</div>
                )}
                {message.model_used && (
                  <div className="text-xs opacity-70 mt-2 flex items-center gap-1">
                    <Cpu size={10} />
                    {message.model_used}
                  </div>
                )}

                {/* Message Actions */}
                <div className="absolute -bottom-8 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MessageActions
                    content={message.content}
                    role={message.role}
                    onEdit={(newContent) => handleMessageEdit(idx, newContent)}
                    onRegenerate={
                      message.role === "assistant"
                        ? () => handleRegenerate(idx)
                        : undefined
                    }
                    onDelete={() => handleMessageDelete(idx)}
                  />
                </div>
              </div>
            </div>
          ))}

          {isStreaming && messages[messages.length - 1]?.content === "" && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl px-4 py-3">
                <div className="typing-indicator flex gap-1">
                  <span
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border p-4">
          {/* Active System Prompt Indicator */}
          {activePrompt && (
            <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
              <Sparkles size={14} className="text-nexus-500" />
              <span>
                Using: <span className="font-medium">{activePrompt.name}</span>
              </span>
            </div>
          )}

          {/* Input Toolbar */}
          <div className="flex items-center gap-1 mb-2">
            <button
              onClick={() => togglePanel("system-prompts")}
              className={`p-2 rounded-lg transition-colors ${
                rightPanel === "system-prompts"
                  ? "bg-nexus-500/10 text-nexus-500"
                  : "hover:bg-muted text-muted-foreground"
              }`}
              title="System Prompts"
            >
              <Settings2 size={18} />
            </button>
            <button
              onClick={() => togglePanel("templates")}
              className={`p-2 rounded-lg transition-colors ${
                rightPanel === "templates"
                  ? "bg-nexus-500/10 text-nexus-500"
                  : "hover:bg-muted text-muted-foreground"
              }`}
              title="Prompt Templates"
            >
              <BookMarked size={18} />
            </button>
            <button
              onClick={() => togglePanel("export")}
              className={`p-2 rounded-lg transition-colors ${
                rightPanel === "export"
                  ? "bg-nexus-500/10 text-nexus-500"
                  : "hover:bg-muted text-muted-foreground"
              }`}
              title="Export Chat"
            >
              <Download size={18} />
            </button>

            {/* Voice Input */}
            <VoiceInput onTranscript={handleVoiceTranscript} />
          </div>

          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
              className="flex-1 resize-none bg-muted rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-nexus-500 min-h-[48px] max-h-[200px]"
              rows={1}
              disabled={isStreaming}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="bg-nexus-500 text-white rounded-xl p-3 hover:bg-nexus-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel - System Prompts / Templates / Export */}
      {rightPanel !== "none" && (
        <div className="w-80 border-l border-border bg-card flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <h3 className="font-medium">
              {rightPanel === "system-prompts" && "System Prompts"}
              {rightPanel === "templates" && "Templates"}
              {rightPanel === "export" && "Export Chat"}
            </h3>
            <button
              onClick={() => setRightPanel("none")}
              className="p-1 hover:bg-muted rounded"
            >
              <X size={16} className="text-muted-foreground" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            {rightPanel === "system-prompts" && (
              <SystemPrompts
                onSelectSystemPrompt={setActivePrompt}
                onUseSavedPrompt={handleUseSavedPrompt}
                activePromptId={activePrompt?.id}
              />
            )}
            {rightPanel === "templates" && (
              <PromptTemplates onSelectTemplate={handleTemplateSelect} />
            )}
            {rightPanel === "export" && currentSession && (
              <div className="p-4">
                <ChatExport
                  messages={messages}
                  sessionTitle={currentSession.title}
                  isOpen={rightPanel === "export"}
                  onClose={() => setRightPanel("none")}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
