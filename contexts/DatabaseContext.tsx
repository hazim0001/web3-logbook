import React, { createContext, useContext, useEffect, useState } from "react";
import database, { FlightEntry } from "../services/database";

interface DatabaseContextType {
  flights: FlightEntry[];
  loading: boolean;
  addFlight: (
    flight: Omit<
      FlightEntry,
      | "id"
      | "createdAt"
      | "updatedAt"
      | "syncStatus"
      | "status"
      | "entryHash"
      | "lastSyncedAt"
    >
  ) => Promise<void>;
  updateFlight: (id: number, flight: Partial<FlightEntry>) => Promise<void>;
  deleteFlight: (id: number) => Promise<void>;
  getFlightById: (id: number) => FlightEntry | undefined;
  refreshFlights: () => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(
  undefined
);

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [flights, setFlights] = useState<FlightEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await database.init();
        await loadFlights();
      } catch (error) {
        console.error("Error initializing database:", error);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const loadFlights = async () => {
    try {
      const entries = await database.getAllEntries();
      setFlights(entries);
    } catch (error) {
      console.error("Error loading flights:", error);
    }
  };

  const addFlight = async (
    flight: Omit<
      FlightEntry,
      | "id"
      | "createdAt"
      | "updatedAt"
      | "syncStatus"
      | "status"
      | "entryHash"
      | "lastSyncedAt"
    >
  ) => {
    try {
      await database.createEntry({
        ...flight,
        syncStatus: "pending",
        status: "draft",
      });
      await loadFlights();
    } catch (error) {
      console.error("Error adding flight:", error);
      throw error;
    }
  };

  const updateFlight = async (id: number, flight: Partial<FlightEntry>) => {
    try {
      await database.updateEntry(id, {
        ...flight,
        syncStatus: flight.syncStatus ?? "pending",
      });
      await loadFlights();
    } catch (error) {
      console.error("Error updating flight:", error);
      throw error;
    }
  };

  const deleteFlight = async (id: number) => {
    try {
      await database.deleteEntry(id);
      await loadFlights();
    } catch (error) {
      console.error("Error deleting flight:", error);
      throw error;
    }
  };

  const getFlightById = (id: number): FlightEntry | undefined => {
    return flights.find((f) => f.id === id);
  };

  const refreshFlights = async () => {
    await loadFlights();
  };

  return (
    <DatabaseContext.Provider
      value={{
        flights,
        loading,
        addFlight,
        updateFlight,
        deleteFlight,
        getFlightById,
        refreshFlights,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error("useDatabase must be used within a DatabaseProvider");
  }
  return context;
};
