import { useState, useEffect, useCallback } from "react";
import {
  WifiOff,
  Cloud,
  CloudOff,
  RefreshCw,
  Check,
  AlertTriangle,
} from "lucide-react";

// Types
interface SyncStatus {
  lastSynced: Date | null;
  pendingChanges: number;
  isSyncing: boolean;
  error: string | null;
}

// Offline data types - unused for now but reserved for future sync implementation
// interface OfflineData {
//   messages: unknown[];
//   sessions: unknown[];
//   documents: unknown[];
// }

// Hook for detecting online/offline status
export function useOnlineStatus(): {
  isOnline: boolean;
  wasOffline: boolean;
} {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = (): void => {
      setIsOnline(true);
      if (!isOnline) setWasOffline(true);
    };

    const handleOffline = (): void => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isOnline]);

  return { isOnline, wasOffline };
}

// Hook for managing offline data and sync
export function useOfflineSync(): {
  syncStatus: SyncStatus;
  queueChange: (type: string, data: unknown) => void;
  syncNow: () => Promise<void>;
  clearPendingChanges: () => void;
} {
  const { isOnline } = useOnlineStatus();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSynced: null,
    pendingChanges: 0,
    isSyncing: false,
    error: null,
  });

  const [pendingQueue, setPendingQueue] = useState<
    Array<{ type: string; data: unknown; timestamp: Date }>
  >([]);

  // Load pending changes from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("nexus_pending_changes");
    if (stored) {
      const parsed = JSON.parse(stored);
      setPendingQueue(parsed);
      setSyncStatus((prev) => ({ ...prev, pendingChanges: parsed.length }));
    }
  }, []);

  // Save pending changes to localStorage
  useEffect(() => {
    localStorage.setItem("nexus_pending_changes", JSON.stringify(pendingQueue));
    setSyncStatus((prev) => ({ ...prev, pendingChanges: pendingQueue.length }));
  }, [pendingQueue]);

  const queueChange = useCallback((type: string, data: unknown) => {
    setPendingQueue((prev) => [...prev, { type, data, timestamp: new Date() }]);
  }, []);

  const syncNow = useCallback(async () => {
    if (pendingQueue.length === 0) return;

    setSyncStatus((prev) => ({ ...prev, isSyncing: true, error: null }));

    try {
      // In a real implementation, this would sync with the backend
      for (const change of pendingQueue) {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 100));
        console.log("Syncing:", change);
      }

      setPendingQueue([]);
      setSyncStatus((prev) => ({
        ...prev,
        lastSynced: new Date(),
        pendingChanges: 0,
        isSyncing: false,
      }));
    } catch (error) {
      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: false,
        error: error instanceof Error ? error.message : "Sync failed",
      }));
    }
  }, [pendingQueue]);

  const clearPendingChanges = useCallback(() => {
    setPendingQueue([]);
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingQueue.length > 0) {
      syncNow();
    }
  }, [isOnline, pendingQueue.length, syncNow]);

  return { syncStatus, queueChange, syncNow, clearPendingChanges };
}

// Offline indicator component
interface OfflineIndicatorProps {
  className?: string;
}

export function OfflineIndicator({
  className = "",
}: OfflineIndicatorProps): React.ReactElement {
  const { isOnline, wasOffline } = useOnlineStatus();
  const { syncStatus, syncNow } = useOfflineSync();

  if (isOnline && !wasOffline && syncStatus.pendingChanges === 0) {
    return <></>;
  }

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
        isOnline
          ? wasOffline && syncStatus.pendingChanges > 0
            ? "bg-yellow-500/10 text-yellow-500"
            : "bg-green-500/10 text-green-500"
          : "bg-red-500/10 text-red-500"
      } ${className}`}
    >
      {isOnline ? (
        wasOffline && syncStatus.pendingChanges > 0 ? (
          <>
            <AlertTriangle size={14} />
            <span>{syncStatus.pendingChanges} changes pending</span>
            <button
              onClick={syncNow}
              disabled={syncStatus.isSyncing}
              className="p-1 hover:bg-black/10 rounded"
            >
              <RefreshCw
                size={12}
                className={syncStatus.isSyncing ? "animate-spin" : ""}
              />
            </button>
          </>
        ) : (
          <>
            <Check size={14} />
            <span>All synced</span>
          </>
        )
      ) : (
        <>
          <WifiOff size={14} />
          <span>Offline mode</span>
          {syncStatus.pendingChanges > 0 && (
            <span className="text-xs opacity-75">
              ({syncStatus.pendingChanges} pending)
            </span>
          )}
        </>
      )}
    </div>
  );
}

// Network status banner
export function NetworkStatusBanner(): React.ReactElement | null {
  const { isOnline } = useOnlineStatus();
  const [dismissed, setDismissed] = useState(false);

  if (isOnline || dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-yellow-950 px-4 py-2 flex items-center justify-center gap-2 z-50">
      <WifiOff size={16} />
      <span className="text-sm font-medium">
        You're offline. Changes will be saved locally and synced when you're
        back online.
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="ml-4 text-sm underline"
      >
        Dismiss
      </button>
    </div>
  );
}

// Sync status panel
interface SyncStatusPanelProps {
  syncStatus: SyncStatus;
  onSync: () => void;
  onClear: () => void;
}

export function SyncStatusPanel({
  syncStatus,
  onSync,
  onClear,
}: SyncStatusPanelProps): React.ReactElement {
  const { isOnline } = useOnlineStatus();

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          {isOnline ? (
            <Cloud size={16} className="text-green-500" />
          ) : (
            <CloudOff size={16} className="text-yellow-500" />
          )}
          Sync Status
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onSync}
            disabled={syncStatus.isSyncing || syncStatus.pendingChanges === 0}
            className="p-1.5 hover:bg-muted rounded disabled:opacity-50"
            title="Sync now"
          >
            <RefreshCw
              size={14}
              className={syncStatus.isSyncing ? "animate-spin" : ""}
            />
          </button>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Status:</span>
          <span className={isOnline ? "text-green-500" : "text-yellow-500"}>
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Pending changes:</span>
          <span>{syncStatus.pendingChanges}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Last synced:</span>
          <span>
            {syncStatus.lastSynced
              ? syncStatus.lastSynced.toLocaleTimeString()
              : "Never"}
          </span>
        </div>
      </div>

      {syncStatus.error && (
        <div className="p-2 bg-red-500/10 text-red-500 rounded text-xs">
          {syncStatus.error}
        </div>
      )}

      {syncStatus.pendingChanges > 0 && (
        <button
          onClick={onClear}
          className="w-full text-xs text-muted-foreground hover:text-foreground py-2"
        >
          Clear pending changes
        </button>
      )}
    </div>
  );
}

export default OfflineIndicator;
