import { useState } from "react";
import { Brain, AlertTriangle, Info } from "lucide-react";

interface ContextIndicatorProps {
  messages: Array<{ role: string; content: string }>;
  modelContextWindow?: number;
}

// Rough token estimation (4 chars per token on average)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export default function ContextIndicator({
  messages,
  modelContextWindow = 128000,
}: ContextIndicatorProps): React.ReactElement {
  const [showDetails, setShowDetails] = useState(false);

  const totalContent = messages.map((m) => m.content).join(" ");
  const estimatedTokens = estimateTokens(totalContent);
  const usagePercentage = Math.min(
    (estimatedTokens / modelContextWindow) * 100,
    100,
  );

  const getStatusColor = (): string => {
    if (usagePercentage > 90) return "text-red-500";
    if (usagePercentage > 70) return "text-yellow-500";
    return "text-green-500";
  };

  const getBarColor = (): string => {
    if (usagePercentage > 90) return "bg-red-500";
    if (usagePercentage > 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${getStatusColor()} hover:bg-muted transition-colors`}
        title="Context window usage"
      >
        <Brain size={14} />
        <span>{Math.round(usagePercentage)}%</span>
        {usagePercentage > 90 && <AlertTriangle size={12} />}
      </button>

      {showDetails && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDetails(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-lg shadow-lg p-4 z-20">
            <div className="flex items-center gap-2 mb-3">
              <Brain size={18} className={getStatusColor()} />
              <span className="font-medium">Context Window</span>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
              <div
                className={`h-full ${getBarColor()} transition-all`}
                style={{ width: `${usagePercentage}%` }}
              />
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimated tokens:</span>
                <span>{estimatedTokens.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Context window:</span>
                <span>{modelContextWindow.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Messages:</span>
                <span>{messages.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Remaining:</span>
                <span>
                  ~{(modelContextWindow - estimatedTokens).toLocaleString()}
                </span>
              </div>
            </div>

            {usagePercentage > 70 && (
              <div className="mt-3 p-2 bg-yellow-500/10 rounded text-xs text-yellow-500 flex items-start gap-2">
                <Info size={14} className="mt-0.5 flex-shrink-0" />
                <span>
                  {usagePercentage > 90
                    ? "Context nearly full. Older messages may be truncated."
                    : "Context usage is high. Consider starting a new chat soon."}
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Token counter for input
interface TokenCounterProps {
  text: string;
  maxTokens?: number;
}

export function TokenCounter({
  text,
  maxTokens = 4096,
}: TokenCounterProps): React.ReactElement {
  const tokens = estimateTokens(text);
  const isOverLimit = tokens > maxTokens;

  return (
    <span
      className={`text-xs ${isOverLimit ? "text-red-500" : "text-muted-foreground"}`}
    >
      ~{tokens} tokens
      {isOverLimit && " (over limit)"}
    </span>
  );
}
