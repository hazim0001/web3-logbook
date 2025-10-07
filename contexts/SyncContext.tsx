import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import { showMessage } from "react-native-flash-message";
import SyncService, {
  SyncStatus,
  SyncStats,
} from "../services/syncService";

interface SyncContextType {
  syncStatus: SyncStatus;
  syncStats: SyncStats | null;
  isSyncing: boolean;
  syncNow: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    status: "idle",
    progress: 0,
  });
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshStats = useCallback(async () => {
    try {
      const stats = await SyncService.getSyncStats();
      setSyncStats(stats);
    } catch (error) {
      console.error("Failed to refresh stats:", error);
    }
  }, []);

  useEffect(() => {
    SyncService.registerBackgroundSync();

    const unsubscribe = SyncService.onSyncStatusChange((status) => {
      setSyncStatus(status);
      setIsSyncing(status.status === "syncing");
    });

    refreshStats();

    return () => {
      unsubscribe();
      SyncService.unregisterBackgroundSync();
    };
  }, [refreshStats]);

  const syncNow = useCallback(async () => {
    if (isSyncing) {
      showMessage({
        message: "Sync already in progress",
        type: "info",
      });
      return;
    }

    const result = await SyncService.syncNow();

    if (result.success) {
      if (result.synced && result.synced > 0) {
        showMessage({
          message: `Successfully synced ${result.synced} entries`,
          type: "success",
        });
      } else {
        showMessage({
          message: "Everything is up to date",
          type: "info",
        });
      }

      if (result.failed && result.failed > 0) {
        showMessage({
          message: `${result.failed} entries failed to sync`,
          type: "warning",
        });
      }

    } else {
      showMessage({
        message: result.error || "Sync failed",
        type: "danger",
      });
    }

    await refreshStats();
  }, [isSyncing, refreshStats]);

  return (
    <SyncContext.Provider
      value={{
        syncStatus,
        syncStats,
        isSyncing,
        syncNow,
        refreshStats,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSync must be used within SyncProvider");
  }
  return context;
}
