import React, { createContext, useContext, useEffect, useState } from "react";
import database from "../services/database";

interface DatabaseContextType {
  dbReady: boolean;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(
  undefined
);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initializeDatabase();
  }, []);

  const initializeDatabase = async () => {
    try {
      await database.init();
      setDbReady(true);
      console.log("Database initialized successfully");
    } catch (error) {
      console.error("Failed to initialize database:", error);
      setTimeout(initializeDatabase, 2000);
    }
  };

  return (
    <DatabaseContext.Provider value={{ dbReady }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error("useDatabase must be used within DatabaseProvider");
  }
  return context;
}
