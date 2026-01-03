import { useState, useCallback } from "react";
import { Bot, ChevronDown, Check, Sparkles, Zap, Brain } from "lucide-react";

// Available models configuration
export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  description: string;
  icon: React.ReactNode;
  contextWindow: number;
  capabilities: string[];
  speed: "fast" | "medium" | "slow";
  cost: "low" | "medium" | "high";
}

export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: "gpt-4",
    name: "GPT-4",
    provider: "OpenAI",
    description: "Most capable OpenAI model",
    icon: <Sparkles size={16} className="text-green-500" />,
    contextWindow: 128000,
    capabilities: ["analysis", "coding", "writing", "reasoning"],
    speed: "medium",
    cost: "high",
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    provider: "OpenAI",
    description: "Fast and efficient",
    icon: <Zap size={16} className="text-yellow-500" />,
    contextWindow: 16385,
    capabilities: ["general", "coding", "writing"],
    speed: "fast",
    cost: "low",
  },
  {
    id: "claude-3-opus",
    name: "Claude 3 Opus",
    provider: "Anthropic",
    description: "Most capable Claude model",
    icon: <Brain size={16} className="text-purple-500" />,
    contextWindow: 200000,
    capabilities: ["analysis", "coding", "writing", "reasoning", "vision"],
    speed: "medium",
    cost: "high",
  },
  {
    id: "claude-3-sonnet",
    name: "Claude 3 Sonnet",
    provider: "Anthropic",
    description: "Balanced performance",
    icon: <Bot size={16} className="text-blue-500" />,
    contextWindow: 200000,
    capabilities: ["general", "coding", "writing", "vision"],
    speed: "fast",
    cost: "medium",
  },
  {
    id: "local-ollama",
    name: "Local (Ollama)",
    provider: "Local",
    description: "Run models locally",
    icon: <Bot size={16} className="text-gray-500" />,
    contextWindow: 8192,
    capabilities: ["general", "coding"],
    speed: "medium",
    cost: "low",
  },
];

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

export default function ModelSelector({
  selectedModel,
  onModelChange,
  disabled = false,
  compact = false,
}: ModelSelectorProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const currentModel =
    AVAILABLE_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_MODELS[0];

  const handleSelect = useCallback(
    (modelId: string) => {
      onModelChange(modelId);
      setIsOpen(false);
    },
    [onModelChange],
  );

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50 ${
          compact ? "text-xs" : "text-sm"
        }`}
      >
        {currentModel.icon}
        <span className="font-medium">{currentModel.name}</span>
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
          <div className="absolute left-0 top-full mt-1 w-80 bg-card border border-border rounded-lg shadow-xl z-20 overflow-hidden">
            <div className="p-2 space-y-1 max-h-96 overflow-y-auto">
              {AVAILABLE_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleSelect(model.id)}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors ${
                    selectedModel === model.id
                      ? "bg-nexus-500/10 border border-nexus-500"
                      : "hover:bg-muted border border-transparent"
                  }`}
                >
                  <div className="mt-0.5">{model.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{model.name}</span>
                      {selectedModel === model.id && (
                        <Check size={14} className="text-nexus-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {model.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted">
                        {model.provider}
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          model.speed === "fast"
                            ? "bg-green-500/20 text-green-500"
                            : model.speed === "medium"
                              ? "bg-yellow-500/20 text-yellow-500"
                              : "bg-red-500/20 text-red-500"
                        }`}
                      >
                        {model.speed}
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          model.cost === "low"
                            ? "bg-green-500/20 text-green-500"
                            : model.cost === "medium"
                              ? "bg-yellow-500/20 text-yellow-500"
                              : "bg-red-500/20 text-red-500"
                        }`}
                      >
                        ${model.cost}
                      </span>
                    </div>
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

// Hook for managing model selection
export function useModelSelection(defaultModel = "gpt-4"): {
  selectedModel: string;
  setSelectedModel: (modelId: string) => void;
  modelConfig: ModelConfig;
  getModelById: (id: string) => ModelConfig | undefined;
} {
  const [selectedModel, setSelectedModel] = useState(defaultModel);

  const modelConfig =
    AVAILABLE_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_MODELS[0];

  const getModelById = useCallback((id: string) => {
    return AVAILABLE_MODELS.find((m) => m.id === id);
  }, []);

  return { selectedModel, setSelectedModel, modelConfig, getModelById };
}

// Model comparison component
interface ModelComparisonProps {
  models: string[];
  onClose: () => void;
}

export function ModelComparison({
  models,
  onClose,
}: ModelComparisonProps): React.ReactElement {
  const selectedModels = models
    .map((id) => AVAILABLE_MODELS.find((m) => m.id === id))
    .filter(Boolean) as ModelConfig[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-card rounded-xl shadow-2xl border border-border w-full max-w-4xl max-h-[80vh] overflow-auto">
        <div className="sticky top-0 bg-card p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold">Model Comparison</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded">
            ×
          </button>
        </div>

        <div className="p-4">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3">Feature</th>
                {selectedModels.map((model) => (
                  <th key={model.id} className="text-left py-2 px-3">
                    <div className="flex items-center gap-2">
                      {model.icon}
                      {model.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="py-2 px-3 text-muted-foreground">Provider</td>
                {selectedModels.map((model) => (
                  <td key={model.id} className="py-2 px-3">
                    {model.provider}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 px-3 text-muted-foreground">
                  Context Window
                </td>
                {selectedModels.map((model) => (
                  <td key={model.id} className="py-2 px-3">
                    {model.contextWindow.toLocaleString()} tokens
                  </td>
                ))}
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 px-3 text-muted-foreground">Speed</td>
                {selectedModels.map((model) => (
                  <td key={model.id} className="py-2 px-3 capitalize">
                    {model.speed}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 px-3 text-muted-foreground">Cost</td>
                {selectedModels.map((model) => (
                  <td key={model.id} className="py-2 px-3 capitalize">
                    {model.cost}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 px-3 text-muted-foreground">
                  Capabilities
                </td>
                {selectedModels.map((model) => (
                  <td key={model.id} className="py-2 px-3">
                    <div className="flex flex-wrap gap-1">
                      {model.capabilities.map((cap) => (
                        <span
                          key={cap}
                          className="text-xs px-1.5 py-0.5 rounded bg-muted"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
