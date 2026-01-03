import { useState, useCallback, useEffect } from "react";
import {
  FileText,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Copy,
  Check,
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

interface ConversationSummary {
  id: string;
  title: string;
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  createdAt: Date;
  messageCount: number;
}

// Summarization service interface
interface SummarizationService {
  summarize: (messages: Message[]) => Promise<ConversationSummary>;
  extractTitle: (messages: Message[]) => Promise<string>;
  extractActionItems: (messages: Message[]) => Promise<string[]>;
}

// Local summarization (uses simple extraction rules)
function createLocalSummarizer(): SummarizationService {
  return {
    summarize: async (messages: Message[]): Promise<ConversationSummary> => {
      const allContent = messages.map((m) => m.content).join(" ");

      // Extract key sentences (first sentence of each assistant message)
      const keyPoints = messages
        .filter((m) => m.role === "assistant")
        .map((m) => {
          const firstSentence = m.content.split(/[.!?]/)[0];
          return firstSentence?.trim();
        })
        .filter((s) => s && s.length > 20)
        .slice(0, 5);

      // Extract potential action items (sentences with action verbs)
      const actionVerbs = [
        "should",
        "must",
        "need to",
        "will",
        "can",
        "try to",
        "remember to",
      ];
      const actionItems = messages
        .flatMap((m) => m.content.split(/[.!?]/))
        .filter((sentence) =>
          actionVerbs.some((verb) => sentence.toLowerCase().includes(verb)),
        )
        .map((s) => s.trim())
        .filter((s) => s.length > 10 && s.length < 200)
        .slice(0, 5);

      // Generate summary
      const wordCount = allContent.split(/\s+/).length;
      const summary =
        wordCount > 100
          ? `This conversation contains ${messages.length} messages discussing ${keyPoints[0]?.toLowerCase() || "various topics"}.`
          : "Brief conversation with limited content.";

      // Extract title from first user message
      const firstUserMessage = messages.find((m) => m.role === "user");
      const title = firstUserMessage
        ? firstUserMessage.content.slice(0, 50) +
          (firstUserMessage.content.length > 50 ? "..." : "")
        : "Untitled Conversation";

      return {
        id: `summary-${Date.now()}`,
        title,
        summary,
        keyPoints,
        actionItems,
        createdAt: new Date(),
        messageCount: messages.length,
      };
    },

    extractTitle: async (messages: Message[]): Promise<string> => {
      const firstUserMessage = messages.find((m) => m.role === "user");
      if (!firstUserMessage) return "New Conversation";

      const content = firstUserMessage.content;
      // Take first line or first 50 chars
      const firstLine = content.split("\n")[0];
      return firstLine.length > 50 ? firstLine.slice(0, 50) + "..." : firstLine;
    },

    extractActionItems: async (messages: Message[]): Promise<string[]> => {
      const actionVerbs = [
        "should",
        "must",
        "need to",
        "will",
        "try to",
        "remember to",
        "don't forget",
      ];
      return messages
        .flatMap((m) => m.content.split(/[.!?]/))
        .filter((sentence) =>
          actionVerbs.some((verb) => sentence.toLowerCase().includes(verb)),
        )
        .map((s) => s.trim())
        .filter((s) => s.length > 10)
        .slice(0, 10);
    },
  };
}

// Hook for auto-summarization
export function useAutoSummarization(
  messages: Message[],
  options: {
    autoSummarizeThreshold?: number;
    enabled?: boolean;
  } = {},
): {
  summary: ConversationSummary | null;
  isLoading: boolean;
  error: string | null;
  generateSummary: () => Promise<void>;
  clearSummary: () => void;
} {
  const { autoSummarizeThreshold = 10, enabled = true } = options;
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summarizer = createLocalSummarizer();

  const generateSummary = useCallback(async () => {
    if (messages.length < 2) {
      setError("Need at least 2 messages to summarize");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await summarizer.summarize(messages);
      setSummary(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate summary",
      );
    } finally {
      setIsLoading(false);
    }
  }, [messages, summarizer]);

  const clearSummary = useCallback(() => {
    setSummary(null);
    setError(null);
  }, []);

  // Auto-summarize when threshold is reached
  useEffect(() => {
    if (enabled && messages.length >= autoSummarizeThreshold && !summary) {
      generateSummary();
    }
  }, [
    messages.length,
    autoSummarizeThreshold,
    enabled,
    summary,
    generateSummary,
  ]);

  return { summary, isLoading, error, generateSummary, clearSummary };
}

// Summary display component
interface SummaryCardProps {
  summary: ConversationSummary;
  isExpanded?: boolean;
  onToggle?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function SummaryCard({
  summary,
  isExpanded = false,
  onToggle,
  onRefresh,
  isLoading = false,
}: SummaryCardProps): React.ReactElement {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (): Promise<void> => {
    const text = `# ${summary.title}\n\n${summary.summary}\n\n## Key Points\n${summary.keyPoints.map((p) => `- ${p}`).join("\n")}\n\n## Action Items\n${summary.actionItems.map((a) => `- ${a}`).join("\n")}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-nexus-500" />
          <span className="font-medium text-sm">Conversation Summary</span>
          <span className="text-xs text-muted-foreground">
            ({summary.messageCount} messages)
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRefresh();
              }}
              disabled={isLoading}
              className="p-1 hover:bg-muted rounded text-muted-foreground"
            >
              <RefreshCw
                size={14}
                className={isLoading ? "animate-spin" : ""}
              />
            </button>
          )}
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {isExpanded && (
        <div className="p-3 pt-0 space-y-3 border-t border-border">
          {/* Summary */}
          <div>
            <p className="text-sm text-muted-foreground">{summary.summary}</p>
          </div>

          {/* Key Points */}
          {summary.keyPoints.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <Sparkles size={12} />
                Key Points
              </h4>
              <ul className="text-sm space-y-1">
                {summary.keyPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-nexus-500 mt-1">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Items */}
          {summary.actionItems.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1">
                Action Items
              </h4>
              <ul className="text-sm space-y-1">
                {summary.actionItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1 rounded" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {copied ? (
              <Check size={12} className="text-green-500" />
            ) : (
              <Copy size={12} />
            )}
            {copied ? "Copied!" : "Copy summary"}
          </button>
        </div>
      )}
    </div>
  );
}

// Auto-title generator component
interface AutoTitleProps {
  messages: Message[];
  currentTitle: string;
  onTitleChange: (title: string) => void;
}

export function AutoTitle({
  messages,
  currentTitle,
  onTitleChange,
}: AutoTitleProps): React.ReactElement {
  const [isGenerating, setIsGenerating] = useState(false);
  const summarizer = createLocalSummarizer();

  const generateTitle = async (): Promise<void> => {
    setIsGenerating(true);
    try {
      const title = await summarizer.extractTitle(messages);
      onTitleChange(title);
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-generate title when conversation starts
  useEffect(() => {
    if (messages.length >= 2 && currentTitle === "New Conversation") {
      generateTitle();
    }
  }, [messages.length]);

  return (
    <button
      onClick={generateTitle}
      disabled={isGenerating || messages.length < 2}
      className="p-1 hover:bg-muted rounded text-muted-foreground disabled:opacity-50"
      title="Generate title from conversation"
    >
      <Sparkles size={14} className={isGenerating ? "animate-pulse" : ""} />
    </button>
  );
}

export default SummaryCard;
