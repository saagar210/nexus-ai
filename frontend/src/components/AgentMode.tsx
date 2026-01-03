import { useState, useCallback } from "react";
import {
  Bot,
  Square,
  Settings,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Terminal,
  Globe,
  FileSearch,
  Calculator,
  Code,
} from "lucide-react";

// Tool definitions
export interface AgentTool {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  parameters?: ToolParameter[];
}

interface ToolParameter {
  name: string;
  type: "string" | "number" | "boolean";
  required: boolean;
  description: string;
}

// Tool execution result
export interface ToolResult {
  toolId: string;
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
}

// Agent step in execution
export interface AgentStep {
  id: string;
  type: "thinking" | "tool_call" | "response";
  content: string;
  toolId?: string;
  toolResult?: ToolResult;
  timestamp: Date;
  status: "pending" | "running" | "completed" | "failed";
}

// Default available tools
const DEFAULT_TOOLS: AgentTool[] = [
  {
    id: "web_search",
    name: "Web Search",
    description: "Search the internet for information",
    icon: <Globe size={16} />,
    enabled: true,
  },
  {
    id: "code_interpreter",
    name: "Code Interpreter",
    description: "Execute Python code and analyze data",
    icon: <Code size={16} />,
    enabled: true,
  },
  {
    id: "file_reader",
    name: "File Reader",
    description: "Read and analyze uploaded files",
    icon: <FileSearch size={16} />,
    enabled: true,
  },
  {
    id: "calculator",
    name: "Calculator",
    description: "Perform mathematical calculations",
    icon: <Calculator size={16} />,
    enabled: true,
  },
  {
    id: "terminal",
    name: "Terminal",
    description: "Execute shell commands (sandboxed)",
    icon: <Terminal size={16} />,
    enabled: false,
  },
];

// Hook for managing agent mode
export function useAgentMode(): {
  isAgentMode: boolean;
  toggleAgentMode: () => void;
  tools: AgentTool[];
  toggleTool: (toolId: string) => void;
  steps: AgentStep[];
  isRunning: boolean;
  startAgent: (task: string) => Promise<void>;
  stopAgent: () => void;
  clearSteps: () => void;
} {
  const [isAgentMode, setIsAgentMode] = useState(false);
  const [tools, setTools] = useState<AgentTool[]>(DEFAULT_TOOLS);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const toggleAgentMode = useCallback(() => {
    setIsAgentMode((prev) => !prev);
  }, []);

  const toggleTool = useCallback((toolId: string) => {
    setTools((prev) =>
      prev.map((tool) =>
        tool.id === toolId ? { ...tool, enabled: !tool.enabled } : tool,
      ),
    );
  }, []);

  const startAgent = useCallback(
    async (task: string) => {
      setIsRunning(true);
      setSteps([]);

      // Simulate agent execution
      const enabledTools = tools.filter((t) => t.enabled);

      // Step 1: Thinking
      const thinkingStep: AgentStep = {
        id: `step-${Date.now()}-1`,
        type: "thinking",
        content: `Analyzing task: "${task}"\n\nAvailable tools: ${enabledTools.map((t) => t.name).join(", ")}`,
        timestamp: new Date(),
        status: "running",
      };
      setSteps((prev) => [...prev, thinkingStep]);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSteps((prev) =>
        prev.map((s) =>
          s.id === thinkingStep.id ? { ...s, status: "completed" } : s,
        ),
      );

      // Step 2: Tool call (simulated)
      const toolStep: AgentStep = {
        id: `step-${Date.now()}-2`,
        type: "tool_call",
        content: "Executing web search for relevant information...",
        toolId: "web_search",
        timestamp: new Date(),
        status: "running",
      };
      setSteps((prev) => [...prev, toolStep]);

      await new Promise((resolve) => setTimeout(resolve, 1500));

      const toolResult: ToolResult = {
        toolId: "web_search",
        success: true,
        output: "Found relevant information about the topic.",
        executionTime: 1.5,
      };

      setSteps((prev) =>
        prev.map((s) =>
          s.id === toolStep.id ? { ...s, status: "completed", toolResult } : s,
        ),
      );

      // Step 3: Response
      const responseStep: AgentStep = {
        id: `step-${Date.now()}-3`,
        type: "response",
        content:
          "Based on my analysis and the information gathered, here is the answer to your task...",
        timestamp: new Date(),
        status: "completed",
      };
      setSteps((prev) => [...prev, responseStep]);

      setIsRunning(false);
    },
    [tools],
  );

  const stopAgent = useCallback(() => {
    setIsRunning(false);
    setSteps((prev) =>
      prev.map((s) =>
        s.status === "running" ? { ...s, status: "failed" } : s,
      ),
    );
  }, []);

  const clearSteps = useCallback(() => {
    setSteps([]);
  }, []);

  return {
    isAgentMode,
    toggleAgentMode,
    tools,
    toggleTool,
    steps,
    isRunning,
    startAgent,
    stopAgent,
    clearSteps,
  };
}

// Agent mode toggle button
interface AgentModeToggleProps {
  isEnabled: boolean;
  onToggle: () => void;
}

export function AgentModeToggle({
  isEnabled,
  onToggle,
}: AgentModeToggleProps): React.ReactElement {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
        isEnabled
          ? "bg-nexus-500 text-white"
          : "bg-muted text-muted-foreground hover:text-foreground"
      }`}
    >
      <Bot size={16} />
      <span>Agent Mode</span>
    </button>
  );
}

// Tool selector component
interface ToolSelectorProps {
  tools: AgentTool[];
  onToggle: (toolId: string) => void;
}

export function ToolSelector({
  tools,
  onToggle,
}: ToolSelectorProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const enabledCount = tools.filter((t) => t.enabled).length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:bg-muted text-sm"
      >
        <Settings size={14} />
        <span>Tools ({enabledCount})</span>
        <ChevronDown
          size={14}
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 w-72 bg-card border border-border rounded-lg shadow-xl z-20">
            <div className="p-2 space-y-1">
              {tools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => onToggle(tool.id)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                    tool.enabled ? "bg-nexus-500/10" : "hover:bg-muted"
                  }`}
                >
                  <div
                    className={`${tool.enabled ? "text-nexus-500" : "text-muted-foreground"}`}
                  >
                    {tool.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{tool.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {tool.description}
                    </div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded border ${
                      tool.enabled
                        ? "bg-nexus-500 border-nexus-500"
                        : "border-muted-foreground"
                    }`}
                  >
                    {tool.enabled && (
                      <CheckCircle2 size={16} className="text-white" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Agent steps display
interface AgentStepsProps {
  steps: AgentStep[];
  isRunning: boolean;
  onStop: () => void;
}

export function AgentSteps({
  steps,
  isRunning,
  onStop,
}: AgentStepsProps): React.ReactElement {
  if (steps.length === 0) return <></>;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
        <span className="text-sm font-medium">Agent Execution</span>
        {isRunning && (
          <button
            onClick={onStop}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
          >
            <Square size={12} />
            Stop
          </button>
        )}
      </div>

      <div className="p-3 space-y-3 max-h-64 overflow-y-auto">
        {steps.map((step) => (
          <div key={step.id} className="flex items-start gap-3">
            <div className="mt-0.5">
              {step.status === "running" ? (
                <Loader2 size={16} className="text-nexus-500 animate-spin" />
              ) : step.status === "completed" ? (
                <CheckCircle2 size={16} className="text-green-500" />
              ) : step.status === "failed" ? (
                <AlertCircle size={16} className="text-red-500" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium uppercase text-muted-foreground">
                  {step.type.replace("_", " ")}
                </span>
                {step.toolId && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-muted">
                    {step.toolId}
                  </span>
                )}
              </div>
              <p className="text-sm mt-1 whitespace-pre-wrap">{step.content}</p>
              {step.toolResult && (
                <div
                  className={`mt-2 p-2 rounded text-xs ${
                    step.toolResult.success
                      ? "bg-green-500/10 text-green-500"
                      : "bg-red-500/10 text-red-500"
                  }`}
                >
                  {step.toolResult.output}
                  <span className="ml-2 opacity-60">
                    ({step.toolResult.executionTime}s)
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AgentModeToggle;
