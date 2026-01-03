import { useState, useCallback } from "react";
import {
  Globe,
  Link,
  Loader2,
  Check,
  X,
  FileText,
  AlertCircle,
} from "lucide-react";

interface ImportedPage {
  id: string;
  url: string;
  title: string;
  content: string;
  extractedAt: Date;
  wordCount: number;
  status: "pending" | "importing" | "success" | "error";
  error?: string;
}

interface WebPageImportProps {
  onImport: (pages: ImportedPage[]) => void;
  maxPages?: number;
}

export default function WebPageImport({
  onImport,
  maxPages = 10,
}: WebPageImportProps): React.ReactElement {
  const [urls, setUrls] = useState<string[]>([""]);
  const [pages, setPages] = useState<ImportedPage[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const addUrl = useCallback(() => {
    if (urls.length < maxPages) {
      setUrls((prev) => [...prev, ""]);
    }
  }, [urls.length, maxPages]);

  const removeUrl = useCallback((index: number) => {
    setUrls((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateUrl = useCallback((index: number, value: string) => {
    setUrls((prev) => prev.map((url, i) => (i === index ? value : url)));
  }, []);

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const importPages = useCallback(async () => {
    const validUrls = urls.filter(isValidUrl);
    if (validUrls.length === 0) return;

    setIsImporting(true);

    const importedPages: ImportedPage[] = validUrls.map((url) => ({
      id: `page-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      url,
      title: "",
      content: "",
      extractedAt: new Date(),
      wordCount: 0,
      status: "pending" as const,
    }));

    setPages(importedPages);

    // Import each page sequentially
    for (let i = 0; i < importedPages.length; i++) {
      const page = importedPages[i];

      setPages((prev) =>
        prev.map((p) => (p.id === page.id ? { ...p, status: "importing" } : p)),
      );

      try {
        // In a real implementation, this would call a backend API
        // that fetches and parses the web page
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Simulated result
        const result = {
          title: `Page from ${new URL(page.url).hostname}`,
          content: `Content extracted from ${page.url}...`,
          wordCount: Math.floor(Math.random() * 5000) + 500,
        };

        setPages((prev) =>
          prev.map((p) =>
            p.id === page.id
              ? {
                  ...p,
                  ...result,
                  status: "success" as const,
                  extractedAt: new Date(),
                }
              : p,
          ),
        );
      } catch (error) {
        setPages((prev) =>
          prev.map((p) =>
            p.id === page.id
              ? {
                  ...p,
                  status: "error" as const,
                  error: "Failed to import page",
                }
              : p,
          ),
        );
      }
    }

    setIsImporting(false);
  }, [urls]);

  const handleComplete = useCallback(() => {
    const successfulPages = pages.filter((p) => p.status === "success");
    onImport(successfulPages);
    setUrls([""]);
    setPages([]);
  }, [pages, onImport]);

  const validCount = urls.filter(isValidUrl).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Globe size={20} className="text-nexus-500" />
        <h3 className="font-semibold">Import Web Pages</h3>
      </div>

      {/* URL inputs */}
      <div className="space-y-2">
        {urls.map((url, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Link
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="url"
                value={url}
                onChange={(e) => updateUrl(index, e.target.value)}
                placeholder="https://example.com/article"
                className={`w-full pl-9 pr-3 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 ${
                  url && !isValidUrl(url)
                    ? "ring-2 ring-red-500"
                    : "focus:ring-nexus-500"
                }`}
              />
            </div>
            {urls.length > 1 && (
              <button
                onClick={() => removeUrl(index)}
                className="p-2 hover:bg-muted rounded text-muted-foreground"
              >
                <X size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add more button */}
      {urls.length < maxPages && (
        <button
          onClick={addUrl}
          className="text-sm text-nexus-500 hover:underline"
        >
          + Add another URL
        </button>
      )}

      {/* Import status */}
      {pages.length > 0 && (
        <div className="space-y-2 border border-border rounded-lg p-3">
          {pages.map((page) => (
            <div
              key={page.id}
              className="flex items-center justify-between py-2 border-b border-border last:border-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                {page.status === "importing" ? (
                  <Loader2 size={16} className="animate-spin text-nexus-500" />
                ) : page.status === "success" ? (
                  <Check size={16} className="text-green-500" />
                ) : page.status === "error" ? (
                  <AlertCircle size={16} className="text-red-500" />
                ) : (
                  <FileText size={16} className="text-muted-foreground" />
                )}
                <span className="text-sm truncate">
                  {page.title || page.url}
                </span>
              </div>
              {page.status === "success" && (
                <span className="text-xs text-muted-foreground">
                  {page.wordCount.toLocaleString()} words
                </span>
              )}
              {page.status === "error" && (
                <span className="text-xs text-red-500">{page.error}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {pages.length > 0 && !isImporting ? (
          <button
            onClick={handleComplete}
            className="px-4 py-2 bg-nexus-500 text-white rounded-lg hover:bg-nexus-600 text-sm"
          >
            Add {pages.filter((p) => p.status === "success").length} Pages to
            Knowledge Base
          </button>
        ) : (
          <button
            onClick={importPages}
            disabled={validCount === 0 || isImporting}
            className="px-4 py-2 bg-nexus-500 text-white rounded-lg hover:bg-nexus-600 disabled:opacity-50 text-sm flex items-center gap-2"
          >
            {isImporting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Globe size={16} />
                Import {validCount} Page{validCount !== 1 ? "s" : ""}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// Batch URL input component
interface BatchUrlInputProps {
  onUrlsChange: (urls: string[]) => void;
}

export function BatchUrlInput({
  onUrlsChange,
}: BatchUrlInputProps): React.ReactElement {
  const [text, setText] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const value = e.target.value;
    setText(value);

    const urls = value
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => {
        try {
          new URL(line);
          return true;
        } catch {
          return false;
        }
      });

    onUrlsChange(urls);
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-2">
        Paste URLs (one per line)
      </label>
      <textarea
        value={text}
        onChange={handleChange}
        placeholder="https://example.com/page1&#10;https://example.com/page2&#10;https://example.com/page3"
        className="w-full h-32 p-3 bg-muted rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-nexus-500"
      />
    </div>
  );
}
