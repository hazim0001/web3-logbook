import React, { createContext, useContext, useState, useEffect } from "react";
import NetInfo from "@react-native-community/netinfo";
import { useDatabase } from "./DatabaseContext";
import database from "../services/database";

interface SyncStatus {
  isOnline: boolean;
  lastSyncTime: Date | null;
  pendingChanges: number;
  syncing: boolean;
}

interface SyncContextType {
  syncStatus: SyncStatus;
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { flights, refreshFlights } = useDatabase();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    lastSyncTime: null,
    pendingChanges: 0,
    syncing: false,
  });

  useEffect(() => {
    // Monitor network status
    const unsubscribe = NetInfo.addEventListener((state) => {
      setSyncStatus((prev) => ({
        ...prev,
        isOnline: state.isConnected ?? false,
      }));

      // Auto-sync when coming online
      if (
        state.isConnected &&
        !syncStatus.syncing &&
        syncStatus.pendingChanges > 0
      ) {
        syncNow();
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const pending = flights.filter(
      (flight) => flight.syncStatus !== "synced"
    ).length;

    setSyncStatus((prev) => ({
      ...prev,
      pendingChanges: pending,
    }));
  }, [flights]);

  const syncNow = async () => {
    if (syncStatus.syncing || !syncStatus.isOnline) return;

    setSyncStatus((prev) => ({ ...prev, syncing: true }));

    try {
      // Simulate API sync
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const unsynced = flights.filter(
        (flight) => flight.syncStatus !== "synced" && flight.id
      );

      await Promise.all(
        unsynced.map((flight) =>
          database.markAsSynced(
            flight.id!,
            flight.serverId ?? flight.id!
          )
        )
      );

      await refreshFlights();

      setSyncStatus((prev) => ({
        ...prev,
        syncing: false,
        lastSyncTime: new Date(),
        pendingChanges: 0,
      }));
    } catch (error) {
      console.error("Sync failed:", error);
      setSyncStatus((prev) => ({ ...prev, syncing: false }));
    }
  };

  return (
    <SyncContext.Provider value={{ syncStatus, syncNow }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error("useSync must be used within a SyncProvider");
  }
  return context;
};
