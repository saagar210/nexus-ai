import { useState } from "react";
import { Code, Terminal, Database, Zap } from "lucide-react";
import APIPlayground from "../components/APIPlayground";

type DeveloperTab = "playground" | "logs" | "database" | "performance";

export default function DeveloperPage(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<DeveloperTab>("playground");

  const tabs: { id: DeveloperTab; label: string; icon: React.ReactNode }[] = [
    { id: "playground", label: "API Playground", icon: <Code size={18} /> },
    { id: "logs", label: "System Logs", icon: <Terminal size={18} /> },
    { id: "database", label: "Database", icon: <Database size={18} /> },
    { id: "performance", label: "Performance", icon: <Zap size={18} /> },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header with tabs */}
      <div className="bg-card border-b border-border px-6 py-4">
        <h1 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Code size={24} className="text-nexus-500" />
          Developer Tools
        </h1>
        <div className="flex items-center gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-2 text-sm transition-colors ${
                activeTab === tab.id
                  ? "text-nexus-500 border-b-2 border-nexus-500"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span
                className={
                  activeTab === tab.id
                    ? "text-nexus-500"
                    : "text-muted-foreground"
                }
              >
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "playground" && <APIPlayground />}

        {activeTab === "logs" && (
          <div className="p-6">
            <div className="bg-card border border-border rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Terminal size={20} />
                System Logs
              </h2>
              <div className="bg-muted rounded-lg p-4 font-mono text-xs space-y-1 max-h-96 overflow-auto">
                <LogEntry
                  level="info"
                  time="14:23:45"
                  message="Backend server started on port 8000"
                />
                <LogEntry
                  level="info"
                  time="14:23:46"
                  message="Connected to Ollama at localhost:11434"
                />
                <LogEntry
                  level="success"
                  time="14:23:47"
                  message="ChromaDB initialized successfully"
                />
                <LogEntry
                  level="info"
                  time="14:24:12"
                  message="Loaded 47 documents into vector store"
                />
                <LogEntry
                  level="warning"
                  time="14:25:03"
                  message="Rate limit approaching for API calls"
                />
                <LogEntry
                  level="info"
                  time="14:26:15"
                  message="New chat session created: sess_abc123"
                />
                <LogEntry
                  level="info"
                  time="14:26:18"
                  message="Routed query to gpt-4 (task: code)"
                />
                <LogEntry
                  level="success"
                  time="14:26:22"
                  message="Response generated in 4.2s"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "database" && (
          <div className="p-6 space-y-6">
            <div className="bg-card border border-border rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Database size={20} />
                Database Status
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <DatabaseStat
                  label="Sessions"
                  value="156"
                  color="text-blue-500"
                />
                <DatabaseStat
                  label="Messages"
                  value="2,847"
                  color="text-green-500"
                />
                <DatabaseStat
                  label="Documents"
                  value="47"
                  color="text-purple-500"
                />
                <DatabaseStat
                  label="Memories"
                  value="234"
                  color="text-yellow-500"
                />
                <DatabaseStat
                  label="Embeddings"
                  value="12.4K"
                  color="text-pink-500"
                />
                <DatabaseStat
                  label="Projects"
                  value="8"
                  color="text-orange-500"
                />
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-sm font-medium mb-3">Storage Usage</h3>
              <div className="space-y-3">
                <StorageBar label="Vector DB" used={2.3} total={10} />
                <StorageBar label="SQLite" used={0.8} total={5} />
                <StorageBar label="File Storage" used={1.5} total={20} />
              </div>
            </div>
          </div>
        )}

        {activeTab === "performance" && (
          <div className="p-6 space-y-6">
            <div className="bg-card border border-border rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Zap size={20} />
                Performance Metrics
              </h2>
              <div className="grid grid-cols-4 gap-4">
                <MetricCard
                  label="Avg Response Time"
                  value="1.2s"
                  trend="-0.3s"
                  positive
                />
                <MetricCard
                  label="Uptime"
                  value="99.9%"
                  trend="+0.1%"
                  positive
                />
                <MetricCard
                  label="Memory Usage"
                  value="512MB"
                  trend="+24MB"
                  positive={false}
                />
                <MetricCard
                  label="CPU Usage"
                  value="12%"
                  trend="-3%"
                  positive
                />
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-sm font-medium mb-3">
                Model Latency (last 24h)
              </h3>
              <div className="space-y-2">
                <LatencyBar model="GPT-4" latency={1.8} />
                <LatencyBar model="GPT-3.5 Turbo" latency={0.6} />
                <LatencyBar model="Claude 3 Sonnet" latency={1.2} />
                <LatencyBar model="Local (Llama)" latency={2.4} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper components
function LogEntry({
  level,
  time,
  message,
}: {
  level: "info" | "success" | "warning" | "error";
  time: string;
  message: string;
}): React.ReactElement {
  const colors = {
    info: "text-blue-400",
    success: "text-green-400",
    warning: "text-yellow-400",
    error: "text-red-400",
  };

  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground">[{time}]</span>
      <span className={`uppercase text-xs ${colors[level]}`}>[{level}]</span>
      <span>{message}</span>
    </div>
  );
}

function DatabaseStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}): React.ReactElement {
  return (
    <div className="bg-muted rounded-lg p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function StorageBar({
  label,
  used,
  total,
}: {
  label: string;
  used: number;
  total: number;
}): React.ReactElement {
  const percentage = (used / total) * 100;

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {used}GB / {total}GB
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-nexus-500 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  trend,
  positive,
}: {
  label: string;
  value: string;
  trend: string;
  positive: boolean;
}): React.ReactElement {
  return (
    <div className="bg-muted rounded-lg p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      <p className={`text-xs ${positive ? "text-green-500" : "text-red-500"}`}>
        {trend}
      </p>
    </div>
  );
}

function LatencyBar({
  model,
  latency,
}: {
  model: string;
  latency: number;
}): React.ReactElement {
  const maxLatency = 3;
  const percentage = Math.min((latency / maxLatency) * 100, 100);

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span>{model}</span>
        <span className="text-muted-foreground">{latency}s avg</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            latency < 1
              ? "bg-green-500"
              : latency < 2
                ? "bg-yellow-500"
                : "bg-red-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
