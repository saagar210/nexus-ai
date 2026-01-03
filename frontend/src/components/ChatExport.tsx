import { useState } from "react";
import { Download, FileText, FileJson, File, X, Loader2 } from "lucide-react";
import { saveAs } from "file-saver";
import type { ChatMessage } from "../types";

interface ChatExportProps {
  messages: ChatMessage[];
  sessionTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

type ExportFormat = "markdown" | "json" | "txt";

export default function ChatExport({
  messages,
  sessionTitle,
  isOpen,
  onClose,
}: ChatExportProps): React.ReactElement | null {
  const [format, setFormat] = useState<ExportFormat>("markdown");
  const [isExporting, setIsExporting] = useState(false);
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(false);

  if (!isOpen) return null;

  const generateMarkdown = (): string => {
    let md = `# ${sessionTitle}\n\n`;
    md += `*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`;

    for (const msg of messages) {
      const role = msg.role === "user" ? "**You**" : "**Assistant**";
      if (includeTimestamps && msg.timestamp) {
        md += `${role} *(${new Date(msg.timestamp).toLocaleString()})*\n\n`;
      } else {
        md += `${role}\n\n`;
      }
      md += `${msg.content}\n\n`;
      if (includeMetadata && msg.model_used) {
        md += `*Model: ${msg.model_used}*\n\n`;
      }
      md += "---\n\n";
    }

    return md;
  };

  const generateJSON = (): string => {
    const data = {
      title: sessionTitle,
      exportedAt: new Date().toISOString(),
      messageCount: messages.length,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        ...(includeTimestamps && msg.timestamp ? { timestamp: msg.timestamp } : {}),
        ...(includeMetadata && msg.model_used ? { model: msg.model_used } : {}),
      })),
    };
    return JSON.stringify(data, null, 2);
  };

  const generateTxt = (): string => {
    let txt = `${sessionTitle}\n`;
    txt += `${"=".repeat(sessionTitle.length)}\n\n`;
    txt += `Exported on ${new Date().toLocaleString()}\n\n`;

    for (const msg of messages) {
      const role = msg.role === "user" ? "You" : "Assistant";
      if (includeTimestamps && msg.timestamp) {
        txt += `[${new Date(msg.timestamp).toLocaleString()}] ${role}:\n`;
      } else {
        txt += `${role}:\n`;
      }
      txt += `${msg.content}\n\n`;
    }

    return txt;
  };

  const handleExport = async (): Promise<void> => {
    setIsExporting(true);

    try {
      let content: string;
      let filename: string;
      let mimeType: string;

      const safeTitle = sessionTitle.replace(/[^a-z0-9]/gi, "_").slice(0, 50);
      const timestamp = new Date().toISOString().split("T")[0];

      switch (format) {
        case "markdown":
          content = generateMarkdown();
          filename = `${safeTitle}_${timestamp}.md`;
          mimeType = "text/markdown;charset=utf-8";
          break;
        case "json":
          content = generateJSON();
          filename = `${safeTitle}_${timestamp}.json`;
          mimeType = "application/json;charset=utf-8";
          break;
        case "txt":
          content = generateTxt();
          filename = `${safeTitle}_${timestamp}.txt`;
          mimeType = "text/plain;charset=utf-8";
          break;
      }

      const blob = new Blob([content], { type: mimeType });
      saveAs(blob, filename);
      onClose();
    } finally {
      setIsExporting(false);
    }
  };

  const formatOptions: { value: ExportFormat; label: string; icon: React.ReactNode }[] = [
    { value: "markdown", label: "Markdown", icon: <FileText size={18} /> },
    { value: "json", label: "JSON", icon: <FileJson size={18} /> },
    { value: "txt", label: "Plain Text", icon: <File size={18} /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-card rounded-xl shadow-2xl border border-border w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Download size={20} />
            Export Chat
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Format</label>
            <div className="grid grid-cols-3 gap-2">
              {formatOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFormat(opt.value)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${
                    format === opt.value
                      ? "border-nexus-500 bg-nexus-500/10 text-nexus-500"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  {opt.icon}
                  <span className="text-xs">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeTimestamps}
                onChange={(e) => setIncludeTimestamps(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-sm">Include timestamps</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeMetadata}
                onChange={(e) => setIncludeMetadata(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-sm">Include model info</span>
            </label>
          </div>

          {/* Preview info */}
          <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
            Exporting {messages.length} messages from "{sessionTitle}"
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm hover:bg-muted rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || messages.length === 0}
            className="px-4 py-2 text-sm bg-nexus-500 text-white rounded-lg hover:bg-nexus-600 disabled:opacity-50 flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download size={16} />
                Export
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
