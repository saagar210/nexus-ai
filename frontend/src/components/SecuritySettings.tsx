import { useState, useCallback, useEffect } from "react";
import {
  Shield,
  Lock,
  Unlock,
  Key,
  Clock,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
  FileText,
  Download,
} from "lucide-react";

// Types
interface SecuritySettings {
  sessionTimeout: number; // minutes
  autoLockEnabled: boolean;
  localOnlyMode: boolean;
  auditLoggingEnabled: boolean;
  dataRetentionDays: number;
  encryptLocalData: boolean;
}

interface AuditLogEntry {
  id: string;
  timestamp: Date;
  action: string;
  details: string;
  ip?: string;
  userAgent?: string;
}

const DEFAULT_SETTINGS: SecuritySettings = {
  sessionTimeout: 30,
  autoLockEnabled: false,
  localOnlyMode: false,
  auditLoggingEnabled: true,
  dataRetentionDays: 90,
  encryptLocalData: false,
};

// Security settings component
interface SecuritySettingsProps {
  settings?: SecuritySettings;
  onSettingsChange: (settings: SecuritySettings) => void;
}

export default function SecuritySettingsPanel({
  settings = DEFAULT_SETTINGS,
  onSettingsChange,
}: SecuritySettingsProps): React.ReactElement {
  const [localSettings, setLocalSettings] =
    useState<SecuritySettings>(settings);
  const [showAuditLog, setShowAuditLog] = useState(false);

  const handleChange = <K extends keyof SecuritySettings>(
    key: K,
    value: SecuritySettings[K],
  ): void => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield size={20} className="text-nexus-500" />
        <h2 className="text-lg font-semibold">Security Settings</h2>
      </div>

      {/* Session Timeout */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium flex items-center gap-2">
              <Clock size={16} />
              Session Timeout
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Automatically lock after period of inactivity
            </p>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={localSettings.autoLockEnabled}
              onChange={(e) =>
                handleChange("autoLockEnabled", e.target.checked)
              }
              className="rounded"
            />
            <span className="text-sm">Enabled</span>
          </label>
        </div>
        {localSettings.autoLockEnabled && (
          <div className="mt-4">
            <label className="block text-sm mb-2">
              Timeout: {localSettings.sessionTimeout} minutes
            </label>
            <input
              type="range"
              min={5}
              max={120}
              step={5}
              value={localSettings.sessionTimeout}
              onChange={(e) =>
                handleChange("sessionTimeout", Number(e.target.value))
              }
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>5 min</span>
              <span>120 min</span>
            </div>
          </div>
        )}
      </div>

      {/* Local Only Mode */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium flex items-center gap-2">
              <Lock size={16} />
              Local Only Mode
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Keep all data on your device only
            </p>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={localSettings.localOnlyMode}
              onChange={(e) => handleChange("localOnlyMode", e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Enabled</span>
          </label>
        </div>
        {localSettings.localOnlyMode && (
          <div className="mt-4 p-3 bg-yellow-500/10 rounded-lg text-sm text-yellow-500 flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>
              Local only mode prevents data backup and sync. Make sure to export
              your data regularly.
            </span>
          </div>
        )}
      </div>

      {/* Data Encryption */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium flex items-center gap-2">
              <Key size={16} />
              Encrypt Local Data
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Encrypt stored conversations and documents
            </p>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={localSettings.encryptLocalData}
              onChange={(e) =>
                handleChange("encryptLocalData", e.target.checked)
              }
              className="rounded"
            />
            <span className="text-sm">Enabled</span>
          </label>
        </div>
      </div>

      {/* Audit Logging */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium flex items-center gap-2">
              <FileText size={16} />
              Audit Logging
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Track all actions for security review
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={localSettings.auditLoggingEnabled}
                onChange={(e) =>
                  handleChange("auditLoggingEnabled", e.target.checked)
                }
                className="rounded"
              />
              <span className="text-sm">Enabled</span>
            </label>
            <button
              onClick={() => setShowAuditLog(!showAuditLog)}
              className="px-2 py-1 text-xs bg-muted rounded hover:bg-muted/80"
            >
              View Log
            </button>
          </div>
        </div>
      </div>

      {/* Data Retention */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium flex items-center gap-2">
              <Trash2 size={16} />
              Data Retention
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Automatically delete old data after period
            </p>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm mb-2">
            Keep data for: {localSettings.dataRetentionDays} days
          </label>
          <input
            type="range"
            min={7}
            max={365}
            step={7}
            value={localSettings.dataRetentionDays}
            onChange={(e) =>
              handleChange("dataRetentionDays", Number(e.target.value))
            }
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>7 days</span>
            <span>365 days</span>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
        <h3 className="font-medium text-red-500 flex items-center gap-2 mb-3">
          <AlertTriangle size={16} />
          Danger Zone
        </h3>
        <div className="space-y-2">
          <button className="w-full py-2 px-4 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 text-sm">
            Clear All Conversations
          </button>
          <button className="w-full py-2 px-4 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 text-sm">
            Delete All Documents
          </button>
          <button className="w-full py-2 px-4 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 text-sm">
            Factory Reset
          </button>
        </div>
      </div>

      {/* Audit Log Modal */}
      {showAuditLog && <AuditLogModal onClose={() => setShowAuditLog(false)} />}
    </div>
  );
}

// Audit log modal
function AuditLogModal({
  onClose,
}: {
  onClose: () => void;
}): React.ReactElement {
  const [logs] = useState<AuditLogEntry[]>([
    {
      id: "1",
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      action: "Session Started",
      details: "New chat session created",
    },
    {
      id: "2",
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      action: "Document Uploaded",
      details: "report.pdf uploaded to knowledge base",
    },
    {
      id: "3",
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      action: "Settings Changed",
      details: "Session timeout updated to 30 minutes",
    },
    {
      id: "4",
      timestamp: new Date(Date.now() - 1000 * 60 * 60),
      action: "Message Sent",
      details: 'User message: "Help me analyze..."',
    },
  ]);

  const exportLogs = (): void => {
    const content = logs
      .map(
        (log) =>
          `[${log.timestamp.toISOString()}] ${log.action}: ${log.details}`,
      )
      .join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-card rounded-xl shadow-2xl border border-border w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText size={20} />
            Audit Log
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={exportLogs}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-muted rounded-lg hover:bg-muted/80"
            >
              <Download size={14} />
              Export
            </button>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded">
              ×
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-96">
          <table className="w-full">
            <thead className="bg-muted sticky top-0">
              <tr>
                <th className="text-left text-xs font-medium p-3">Time</th>
                <th className="text-left text-xs font-medium p-3">Action</th>
                <th className="text-left text-xs font-medium p-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-border">
                  <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                    {log.timestamp.toLocaleString()}
                  </td>
                  <td className="p-3 text-sm font-medium">{log.action}</td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Session lock component
interface SessionLockProps {
  isLocked: boolean;
  onUnlock: (password: string) => boolean;
  onLock: () => void;
}

export function SessionLock({
  isLocked,
  onUnlock,
  onLock,
}: SessionLockProps): React.ReactElement | null {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);

  if (!isLocked) {
    return (
      <button
        onClick={onLock}
        className="p-2 hover:bg-muted rounded text-muted-foreground"
        title="Lock session"
      >
        <Unlock size={16} />
      </button>
    );
  }

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    const success = onUnlock(password);
    if (!success) {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
    setPassword("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="w-full max-w-sm p-6 text-center">
        <Lock size={48} className="mx-auto text-nexus-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Session Locked</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Enter your password to unlock
        </p>

        <form onSubmit={handleSubmit}>
          <div className="relative mb-4">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className={`w-full px-4 py-3 bg-muted rounded-lg pr-10 ${
                error ? "ring-2 ring-red-500" : ""
              }`}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-500 mb-4">Incorrect password</p>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-nexus-500 text-white rounded-lg hover:bg-nexus-600"
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}

// Hook for session timeout
export function useSessionTimeout(
  timeoutMinutes: number,
  onTimeout: () => void,
): {
  resetTimer: () => void;
  remainingTime: number;
} {
  const [remainingTime, setRemainingTime] = useState(timeoutMinutes * 60);

  useEffect(() => {
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    const resetTimer = (): void => {
      setRemainingTime(timeoutMinutes * 60);
    };

    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    const interval = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          onTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
      clearInterval(interval);
    };
  }, [timeoutMinutes, onTimeout]);

  const resetTimer = useCallback(() => {
    setRemainingTime(timeoutMinutes * 60);
  }, [timeoutMinutes]);

  return { resetTimer, remainingTime };
}
