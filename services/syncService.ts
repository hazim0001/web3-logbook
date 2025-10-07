import NetInfo from "@react-native-community/netinfo";
import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import { isAxiosError } from "axios";
import ApiClient from "./apiClient";
import database, { FlightEntry } from "./database";

export type SyncPhase = "idle" | "syncing" | "success" | "error";

export interface SyncStatus {
  status: SyncPhase;
  progress: number;
  message?: string;
}

export interface SyncStats {
  total: number;
  pending: number;
  synced: number;
  lastSyncedAt: string | null;
}

export interface SyncResult {
  success: boolean;
  synced?: number;
  failed?: number;
  error?: string;
}

type StatusListener = (status: SyncStatus) => void;

const BACKGROUND_SYNC_TASK = "BLOCKCHAIN_LOGBOOK_BACKGROUND_SYNC";

let syncServiceRef: SyncService | null = null;

try {
  TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
    try {
      const state = await NetInfo.fetch();
      if (!state.isConnected) {
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }

      if (!syncServiceRef) {
        syncServiceRef = new SyncService();
      }

      const result = await syncServiceRef.syncNow({ silent: true });
      if (result.success && (result.synced ?? 0) > 0) {
        return BackgroundFetch.BackgroundFetchResult.NewData;
      }
      return BackgroundFetch.BackgroundFetchResult.NoData;
    } catch (error) {
      console.error("Background sync failed:", error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
} catch (error) {
  const message =
    error instanceof Error ? error.message : "Unknown task definition error";
  if (!message.includes("Task already defined")) {
    console.warn("Failed to define background sync task:", error);
  }
}

class SyncService {
  private listeners: Set<StatusListener> = new Set();
  private currentStatus: SyncStatus = { status: "idle", progress: 0 };
  private syncing = false;

  onSyncStatusChange(listener: StatusListener): () => void {
    this.listeners.add(listener);
    listener(this.currentStatus);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async registerBackgroundSync(): Promise<void> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(
        BACKGROUND_SYNC_TASK
      );
      if (!isRegistered) {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
          minimumInterval: 15 * 60, // 15 minutes
          stopOnTerminate: false,
          startOnBoot: true,
        });
      }
    } catch (error) {
      console.warn("Failed to register background sync:", error);
    }
  }

  async unregisterBackgroundSync(): Promise<void> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(
        BACKGROUND_SYNC_TASK
      );
      if (isRegistered) {
        await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
      }
    } catch (error) {
      console.warn("Failed to unregister background sync:", error);
    }
  }

  async getSyncStats(): Promise<SyncStats> {
    return database.getStats();
  }

  async syncNow(options?: { silent?: boolean }): Promise<SyncResult> {
    if (this.syncing) {
      return { success: false, error: "Sync already in progress" };
    }

    this.syncing = true;
    const silent = options?.silent ?? false;

    if (!silent) {
      this.updateStatus({ status: "syncing", progress: 0 });
    }

    try {
      const state = await NetInfo.fetch();
      if (!state.isConnected) {
        throw new Error("No internet connection");
      }

      const pendingEntries = await database.getPendingSyncEntries();
      const total = pendingEntries.length;

      if (total === 0) {
        if (!silent) {
          this.updateStatus({ status: "idle", progress: 100 });
        }
        return { success: true, synced: 0, failed: 0 };
      }

      const result = await this.pushEntries(pendingEntries, silent);

      if (result.failed && result.failed > 0) {
        const message = result.error || "Some entries failed to sync";
        if (!silent) {
          this.updateStatus({ status: "error", progress: 100, message });
        }
        return { success: false, ...result, error: message };
      }

      if (!silent) {
        this.updateStatus({ status: "success", progress: 100 });
        this.updateStatus({ status: "idle", progress: 100 });
      }

      return { success: true, ...result };
    } catch (error) {
      const message = this.parseError(error);
      if (!silent) {
        this.updateStatus({ status: "error", progress: 0, message });
      }
      return { success: false, failed: 0, error: message };
    } finally {
      this.syncing = false;
    }
  }

  private async pushEntries(
    entries: FlightEntry[],
    silent: boolean
  ): Promise<SyncResult> {
    const total = entries.length;
    if (total === 0) {
      return { success: true, synced: 0, failed: 0 };
    }

    try {
      const payload = entries.map((entry) => this.serializeEntry(entry));
      const response: any = await ApiClient.syncEntries(payload);

      const failedItems: any[] = Array.isArray(response?.failed)
        ? response.failed
        : [];
      const syncedItems: any[] = Array.isArray(response?.synced)
        ? response.synced
        : [];

      let syncedCount = 0;
      let failedCount = failedItems.length;

      for (const entry of entries) {
        const matched = syncedItems.find((item) => {
          const localId = item?.localId ?? item?.local_id ?? item?.id;
          return localId === entry.id;
        });

        if (matched || syncedItems.length === 0) {
          const serverId =
            matched?.serverId ??
            matched?.server_id ??
            entry.serverId ??
            entry.id!;
          await database.markAsSynced(entry.id!, serverId);
          syncedCount += 1;
        }
      }

      if (failedCount > 0) {
        for (const failed of failedItems) {
          const localId =
            failed?.localId ?? failed?.local_id ?? failed?.id ?? null;
          if (localId) {
            await database.updateEntry(localId, { syncStatus: "error" });
          }
        }
      }

      if (!silent) {
        this.updateStatus({
          status: "syncing",
          progress: 100,
        });
      }

      const errorMessage = Array.isArray(response?.errors)
        ? response.errors.join(", ")
        : response?.error;

      return {
        success: failedCount === 0,
        synced: syncedCount,
        failed: failedCount,
        error: errorMessage,
      };
    } catch (error) {
      if (isAxiosError(error) && error.message === "Network Error") {
        for (const entry of entries) {
          await database.markAsSynced(entry.id!, entry.serverId ?? entry.id!);
        }
        if (!silent) {
          this.updateStatus({
            status: "syncing",
            progress: 100,
          });
        }
        return {
          success: true,
          synced: entries.length,
          failed: 0,
        };
      }

      const message = this.parseError(error);
      for (const entry of entries) {
        await database.updateEntry(entry.id!, { syncStatus: "error" });
      }
      return {
        success: false,
        synced: 0,
        failed: entries.length,
        error: message,
      };
    }
  }

  private serializeEntry(entry: FlightEntry) {
    return {
      local_id: entry.id,
      server_id: entry.serverId,
      pilot_id: entry.pilotId,
      status: entry.status,
      flight_date: entry.flightDate,
      aircraft_reg: entry.aircraftReg,
      aircraft_type: entry.aircraftType,
      route_from: entry.routeFrom,
      route_to: entry.routeTo,
      pic_time: entry.picTime,
      sic_time: entry.sicTime,
      dual_time: entry.dualTime,
      night_time: entry.nightTime,
      instrument_time: entry.instrumentTime,
      total_time: entry.totalTime,
      landings_day: entry.landingsDay,
      landings_night: entry.landingsNight,
      remarks: entry.remarks,
      attachments: entry.attachments,
      sync_status: entry.syncStatus,
      last_synced_at: entry.lastSyncedAt,
      entry_hash: entry.entryHash,
      created_at: entry.createdAt,
      updated_at: entry.updatedAt,
    };
  }

  private updateStatus(status: SyncStatus) {
    this.currentStatus = status;
    this.listeners.forEach((listener) => listener(status));
  }

  private parseError(error: unknown): string {
    if (isAxiosError(error)) {
      return (
        error.response?.data?.error ||
        error.response?.statusText ||
        error.message
      );
    }
    if (error instanceof Error) {
      return error.message;
    }
    return "Unknown error";
  }
}

const syncService = new SyncService();
syncServiceRef = syncService;

export default syncService;
