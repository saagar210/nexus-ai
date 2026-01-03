import { useState, useEffect, useRef } from "react";
import { Zap, Clock } from "lucide-react";

interface StreamingIndicatorProps {
  isStreaming: boolean;
  content: string;
}

export default function StreamingIndicator({
  isStreaming,
  content,
}: StreamingIndicatorProps): React.ReactElement | null {
  const [tokensPerSecond, setTokensPerSecond] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const lastContentLengthRef = useRef(0);
  const tokenCountRef = useRef(0);

  useEffect(() => {
    if (isStreaming && !startTimeRef.current) {
      startTimeRef.current = Date.now();
      lastContentLengthRef.current = 0;
      tokenCountRef.current = 0;
    }

    if (!isStreaming) {
      startTimeRef.current = null;
      return;
    }

    const interval = setInterval(() => {
      if (!startTimeRef.current) return;

      const now = Date.now();
      const elapsed = (now - startTimeRef.current) / 1000;
      setElapsedTime(elapsed);

      // Estimate tokens (roughly 4 chars per token)
      const newContent = content.slice(lastContentLengthRef.current);
      const newTokens = Math.ceil(newContent.length / 4);
      tokenCountRef.current += newTokens;
      lastContentLengthRef.current = content.length;

      if (elapsed > 0) {
        setTokensPerSecond(Math.round(tokenCountRef.current / elapsed));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isStreaming, content]);

  if (!isStreaming) return null;

  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <div className="flex items-center gap-1">
        <Zap size={12} className="text-yellow-500" />
        <span>{tokensPerSecond} tok/s</span>
      </div>
      <div className="flex items-center gap-1">
        <Clock size={12} />
        <span>{elapsedTime.toFixed(1)}s</span>
      </div>
      <div className="flex gap-1">
        <span
          className="w-1.5 h-1.5 bg-nexus-500 rounded-full animate-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="w-1.5 h-1.5 bg-nexus-500 rounded-full animate-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="w-1.5 h-1.5 bg-nexus-500 rounded-full animate-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}
