import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  MessageSquare,
  FileText,
  Clock,
  TrendingUp,
  Brain,
  Activity,
} from "lucide-react";
import { format, subDays } from "date-fns";

// Types
interface UsageStats {
  totalMessages: number;
  totalDocuments: number;
  totalTokens: number;
  averageResponseTime: number;
  messagesPerDay: { date: string; count: number }[];
  modelUsage: { model: string; count: number }[];
  topTopics: { topic: string; count: number }[];
  responseTimeHistory: { date: string; avgTime: number }[];
}

interface AnalyticsDashboardProps {
  stats: UsageStats;
  dateRange?: { start: Date; end: Date };
  onDateRangeChange?: (range: { start: Date; end: Date }) => void;
}

// Stat card component
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  color?: string;
}

function StatCard({
  title,
  value,
  icon,
  trend,
  color = "#8b5cf6",
}: StatCardProps): React.ReactElement {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {trend && (
            <div
              className={`flex items-center gap-1 mt-1 text-xs ${
                trend.isPositive ? "text-green-500" : "text-red-500"
              }`}
            >
              <TrendingUp
                size={12}
                className={trend.isPositive ? "" : "rotate-180"}
              />
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        <div
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${color}20` }}
        >
          <div style={{ color }}>{icon}</div>
        </div>
      </div>
    </div>
  );
}

// Chart colors
const COLORS = ["#8b5cf6", "#0ea5e9", "#22c55e", "#f97316", "#ec4899"];

export default function AnalyticsDashboard({
  stats,
  onDateRangeChange,
}: AnalyticsDashboardProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<
    "overview" | "usage" | "performance"
  >("overview");

  // Date range presets
  const datePresets = [
    { label: "7 Days", days: 7 },
    { label: "30 Days", days: 30 },
    { label: "90 Days", days: 90 },
  ];

  const handlePresetClick = (days: number): void => {
    onDateRangeChange?.({
      start: subDays(new Date(), days),
      end: new Date(),
    });
  };

  // Format large numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Activity size={20} className="text-nexus-500" />
          Analytics Dashboard
        </h2>
        <div className="flex items-center gap-2">
          {datePresets.map((preset) => (
            <button
              key={preset.days}
              onClick={() => handlePresetClick(preset.days)}
              className="px-3 py-1 text-xs rounded-lg border border-border hover:bg-muted"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-border">
        {(["overview", "usage", "performance"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-sm capitalize ${
              activeTab === tab
                ? "text-nexus-500 border-b-2 border-nexus-500"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Total Messages"
              value={formatNumber(stats.totalMessages)}
              icon={<MessageSquare size={20} />}
              trend={{ value: 12, isPositive: true }}
              color="#8b5cf6"
            />
            <StatCard
              title="Documents"
              value={formatNumber(stats.totalDocuments)}
              icon={<FileText size={20} />}
              trend={{ value: 8, isPositive: true }}
              color="#0ea5e9"
            />
            <StatCard
              title="Total Tokens"
              value={formatNumber(stats.totalTokens)}
              icon={<Brain size={20} />}
              color="#22c55e"
            />
            <StatCard
              title="Avg Response Time"
              value={`${stats.averageResponseTime.toFixed(1)}s`}
              icon={<Clock size={20} />}
              trend={{ value: 5, isPositive: false }}
              color="#f97316"
            />
          </div>

          {/* Messages over time chart */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium mb-4">Messages Over Time</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.messagesPerDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="date"
                    stroke="#9ca3af"
                    fontSize={10}
                    tickFormatter={(date) => format(new Date(date), "MMM d")}
                  />
                  <YAxis stroke="#9ca3af" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#8b5cf6"
                    fill="#8b5cf620"
                    name="Messages"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Two column layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Model usage pie chart */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-sm font-medium mb-4">Model Usage</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.modelUsage}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={5}
                      dataKey="count"
                      nameKey="model"
                    >
                      {stats.modelUsage.map((entry, index) => (
                        <Cell
                          key={entry.model}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid #27272a",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {stats.modelUsage.map((entry, index) => (
                  <div key={entry.model} className="flex items-center gap-1">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-xs">{entry.model}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top topics */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-sm font-medium mb-4">Top Topics</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.topTopics.slice(0, 5)}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" stroke="#9ca3af" fontSize={10} />
                    <YAxis
                      type="category"
                      dataKey="topic"
                      stroke="#9ca3af"
                      fontSize={10}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid #27272a",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Usage Tab */}
      {activeTab === "usage" && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium mb-4">Daily Usage Breakdown</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.messagesPerDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="date"
                    stroke="#9ca3af"
                    fontSize={10}
                    tickFormatter={(date) => format(new Date(date), "MMM d")}
                  />
                  <YAxis stroke="#9ca3af" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="#8b5cf6"
                    radius={[4, 4, 0, 0]}
                    name="Messages"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === "performance" && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium mb-4">Response Time History</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.responseTimeHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="date"
                    stroke="#9ca3af"
                    fontSize={10}
                    tickFormatter={(date) => format(new Date(date), "MMM d")}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    fontSize={10}
                    tickFormatter={(v) => `${v}s`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number | undefined) => [
                      value !== undefined ? `${value.toFixed(2)}s` : "N/A",
                      "Avg Time",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgTime"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                    name="Response Time"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Generate sample data for testing
export function generateSampleStats(): UsageStats {
  const days = 30;
  const messagesPerDay = Array.from({ length: days }, (_, i) => ({
    date: format(subDays(new Date(), days - i - 1), "yyyy-MM-dd"),
    count: Math.floor(Math.random() * 50) + 10,
  }));

  const responseTimeHistory = Array.from({ length: days }, (_, i) => ({
    date: format(subDays(new Date(), days - i - 1), "yyyy-MM-dd"),
    avgTime: Math.random() * 2 + 0.5,
  }));

  return {
    totalMessages: messagesPerDay.reduce((sum, d) => sum + d.count, 0),
    totalDocuments: 47,
    totalTokens: 1234567,
    averageResponseTime: 1.2,
    messagesPerDay,
    modelUsage: [
      { model: "GPT-4", count: 450 },
      { model: "GPT-3.5", count: 320 },
      { model: "Claude", count: 180 },
      { model: "Local", count: 50 },
    ],
    topTopics: [
      { topic: "Coding", count: 156 },
      { topic: "Writing", count: 98 },
      { topic: "Analysis", count: 76 },
      { topic: "Research", count: 54 },
      { topic: "Math", count: 32 },
    ],
    responseTimeHistory,
  };
}
