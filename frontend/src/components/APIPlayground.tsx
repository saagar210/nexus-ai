import { useState, useCallback } from "react";
import {
  Play,
  Copy,
  Check,
  Code,
  Clock,
  Loader2,
  AlertCircle,
} from "lucide-react";

// API endpoint configuration
interface APIEndpoint {
  id: string;
  name: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  description: string;
  parameters?: APIParameter[];
  requestBody?: Record<string, unknown>;
}

interface APIParameter {
  name: string;
  type: "string" | "number" | "boolean" | "object";
  required: boolean;
  description: string;
  default?: unknown;
}

interface APIResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: unknown;
  time: number;
}

// Default endpoints
const DEFAULT_ENDPOINTS: APIEndpoint[] = [
  {
    id: "chat",
    name: "Chat Completion",
    method: "POST",
    path: "/api/chat",
    description: "Generate a chat completion",
    requestBody: {
      messages: [{ role: "user", content: "Hello!" }],
      model: "gpt-4",
      stream: false,
    },
  },
  {
    id: "sessions",
    name: "List Sessions",
    method: "GET",
    path: "/api/sessions",
    description: "Get all chat sessions",
  },
  {
    id: "documents",
    name: "List Documents",
    method: "GET",
    path: "/api/documents",
    description: "Get all documents in knowledge base",
  },
  {
    id: "upload",
    name: "Upload Document",
    method: "POST",
    path: "/api/documents/upload",
    description: "Upload a document to knowledge base",
    requestBody: {
      name: "document.pdf",
      content: "base64 encoded content",
    },
  },
  {
    id: "search",
    name: "Semantic Search",
    method: "POST",
    path: "/api/search",
    description: "Search documents semantically",
    requestBody: {
      query: "search term",
      limit: 10,
    },
  },
];

// Method color mapping
const METHOD_COLORS: Record<string, string> = {
  GET: "text-green-500 bg-green-500/10",
  POST: "text-blue-500 bg-blue-500/10",
  PUT: "text-yellow-500 bg-yellow-500/10",
  DELETE: "text-red-500 bg-red-500/10",
  PATCH: "text-purple-500 bg-purple-500/10",
};

export default function APIPlayground(): React.ReactElement {
  const [selectedEndpoint, setSelectedEndpoint] = useState<APIEndpoint>(
    DEFAULT_ENDPOINTS[0],
  );
  const [requestBody, setRequestBody] = useState(
    JSON.stringify(DEFAULT_ENDPOINTS[0].requestBody || {}, null, 2),
  );
  const [response, setResponse] = useState<APIResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [baseUrl, setBaseUrl] = useState("http://localhost:8000");

  const handleEndpointChange = useCallback((endpoint: APIEndpoint) => {
    setSelectedEndpoint(endpoint);
    setRequestBody(JSON.stringify(endpoint.requestBody || {}, null, 2));
    setResponse(null);
    setError(null);
  }, []);

  const handleExecute = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setResponse(null);

    const startTime = performance.now();

    try {
      let body: string | undefined;
      if (selectedEndpoint.method !== "GET" && requestBody.trim()) {
        JSON.parse(requestBody); // Validate JSON
        body = requestBody;
      }

      const res = await fetch(`${baseUrl}${selectedEndpoint.path}`, {
        method: selectedEndpoint.method,
        headers: {
          "Content-Type": "application/json",
        },
        body,
      });

      const endTime = performance.now();
      const data = await res.json();

      const headers: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        headers[key] = value;
      });

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers,
        data,
        time: Math.round(endTime - startTime),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setIsLoading(false);
    }
  }, [selectedEndpoint, requestBody, baseUrl]);

  const handleCopyResponse = useCallback(async () => {
    if (!response) return;
    await navigator.clipboard.writeText(JSON.stringify(response.data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [response]);

  const generateCurlCommand = useCallback((): string => {
    let cmd = `curl -X ${selectedEndpoint.method} "${baseUrl}${selectedEndpoint.path}"`;
    if (selectedEndpoint.method !== "GET") {
      cmd += ` \\\n  -H "Content-Type: application/json"`;
      if (requestBody.trim()) {
        cmd += ` \\\n  -d '${requestBody.replace(/\n/g, "")}'`;
      }
    }
    return cmd;
  }, [selectedEndpoint, requestBody, baseUrl]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Code size={20} className="text-nexus-500" />
          API Playground
        </h2>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="w-64 px-3 py-1.5 bg-muted rounded text-sm font-mono"
            placeholder="Base URL"
          />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Endpoint selector */}
        <div className="w-64 border-r border-border p-4 overflow-y-auto">
          <h3 className="text-sm font-medium mb-3">Endpoints</h3>
          <div className="space-y-1">
            {DEFAULT_ENDPOINTS.map((endpoint) => (
              <button
                key={endpoint.id}
                onClick={() => handleEndpointChange(endpoint)}
                className={`w-full text-left p-2 rounded-lg transition-colors ${
                  selectedEndpoint.id === endpoint.id
                    ? "bg-nexus-500/10 border border-nexus-500"
                    : "hover:bg-muted border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                      METHOD_COLORS[endpoint.method]
                    }`}
                  >
                    {endpoint.method}
                  </span>
                  <span className="text-sm truncate">{endpoint.name}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                  {endpoint.path}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Request/Response area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Request section */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-1 rounded font-mono ${
                    METHOD_COLORS[selectedEndpoint.method]
                  }`}
                >
                  {selectedEndpoint.method}
                </span>
                <span className="font-mono text-sm">
                  {baseUrl}
                  {selectedEndpoint.path}
                </span>
              </div>
              <button
                onClick={handleExecute}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-nexus-500 text-white rounded-lg hover:bg-nexus-600 disabled:opacity-50 text-sm"
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Play size={16} />
                )}
                Execute
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              {selectedEndpoint.description}
            </p>

            {selectedEndpoint.method !== "GET" && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Request Body
                </label>
                <textarea
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  className="w-full h-48 p-3 bg-muted rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-nexus-500"
                  spellCheck={false}
                />
              </div>
            )}

            {/* cURL command */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                cURL Command
              </label>
              <pre className="p-3 bg-muted rounded-lg font-mono text-xs overflow-x-auto">
                {generateCurlCommand()}
              </pre>
            </div>
          </div>

          {/* Response section */}
          <div className="border-t border-border p-4 max-h-[40%] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Response</h3>
              {response && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span
                      className={
                        response.status < 400
                          ? "text-green-500"
                          : "text-red-500"
                      }
                    >
                      {response.status} {response.statusText}
                    </span>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock size={12} />
                      {response.time}ms
                    </span>
                  </div>
                  <button
                    onClick={handleCopyResponse}
                    className="p-1.5 hover:bg-muted rounded"
                  >
                    {copied ? (
                      <Check size={14} className="text-green-500" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 text-red-500 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {response && (
              <pre className="p-3 bg-muted rounded-lg font-mono text-xs overflow-x-auto max-h-64">
                {JSON.stringify(response.data, null, 2)}
              </pre>
            )}

            {!response && !error && !isLoading && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Click "Execute" to send the request
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Code snippet generator
interface CodeSnippetProps {
  endpoint: APIEndpoint;
  baseUrl: string;
  requestBody?: string;
}

export function CodeSnippet({
  endpoint,
  baseUrl,
  requestBody,
}: CodeSnippetProps): React.ReactElement {
  const [language, setLanguage] = useState<"curl" | "javascript" | "python">(
    "curl",
  );
  const [copied, setCopied] = useState(false);

  const generateCode = (): string => {
    switch (language) {
      case "curl":
        let curl = `curl -X ${endpoint.method} "${baseUrl}${endpoint.path}"`;
        if (endpoint.method !== "GET" && requestBody) {
          curl += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${requestBody}'`;
        }
        return curl;

      case "javascript":
        return `const response = await fetch("${baseUrl}${endpoint.path}", {
  method: "${endpoint.method}",
  headers: {
    "Content-Type": "application/json",
  },${
    endpoint.method !== "GET" && requestBody
      ? `
  body: JSON.stringify(${requestBody}),`
      : ""
  }
});

const data = await response.json();
console.log(data);`;

      case "python":
        return `import requests

response = requests.${endpoint.method.toLowerCase()}(
    "${baseUrl}${endpoint.path}",
    headers={"Content-Type": "application/json"},${
      endpoint.method !== "GET" && requestBody
        ? `
    json=${requestBody},`
        : ""
    }
)

print(response.json())`;

      default:
        return "";
    }
  };

  const handleCopy = async (): Promise<void> => {
    await navigator.clipboard.writeText(generateCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          {(["curl", "javascript", "python"] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-2 py-1 text-xs rounded capitalize ${
                language === lang
                  ? "bg-nexus-500 text-white"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
        <button onClick={handleCopy} className="p-1.5 hover:bg-muted rounded">
          {copied ? (
            <Check size={14} className="text-green-500" />
          ) : (
            <Copy size={14} />
          )}
        </button>
      </div>
      <pre className="p-3 font-mono text-xs overflow-x-auto">
        {generateCode()}
      </pre>
    </div>
  );
}
