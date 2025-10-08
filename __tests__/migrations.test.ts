/**
 * @jest-environment node
 */

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("expo-sqlite");

import * as SQLite from "expo-sqlite";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MigrationManager } from "../services/migrations/MigrationManager";

describe("Database Migration System", () => {
  let db: SQLite.SQLiteDatabase;

  beforeEach(async () => {
    db = await SQLite.openDatabaseAsync(":memory:");
    MigrationManager.resetSessionCache();
    await AsyncStorage.clear();
  });

  afterEach(async () => {
    if (db) {
      await db.closeAsync();
    }
    jest.restoreAllMocks();
  });

  describe("Fresh Install (No Existing Tables)", () => {
    it("should create schema_migrations table", async () => {
      await MigrationManager.checkAndRunMigrations(db);

      const result = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM sqlite_master 
         WHERE type='table' AND name='schema_migrations'`
      );

      expect(result?.count).toBe(1);
    });

    it("should run migration v2 and mark as complete", async () => {
      await MigrationManager.checkAndRunMigrations(db);

      const version = await db.getFirstAsync<{ version: number }>(
        "SELECT MAX(version) as version FROM schema_migrations"
      );

      expect(version?.version).toBe(2);
    });

    it("should create airports table", async () => {
      await MigrationManager.checkAndRunMigrations(db);

      const result = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM sqlite_master 
         WHERE type='table' AND name='airports'`
      );

      expect(result?.count).toBe(1);
    });
  });

  describe("Existing Install (V1 Schema)", () => {
    beforeEach(async () => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;

        CREATE TABLE flight_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          server_id INTEGER,
          pilot_id INTEGER NOT NULL,
          status TEXT DEFAULT 'draft',
          flight_date TEXT NOT NULL,
          aircraft_reg TEXT NOT NULL,
          aircraft_type TEXT,
          route_from TEXT,
          route_to TEXT,
          pic_time INTEGER DEFAULT 0,
          sic_time INTEGER DEFAULT 0,
          dual_time INTEGER DEFAULT 0,
          night_time INTEGER DEFAULT 0,
          instrument_time INTEGER DEFAULT 0,
          total_time INTEGER DEFAULT 0,
          landings_day INTEGER DEFAULT 0,
          landings_night INTEGER DEFAULT 0,
          remarks TEXT,
          attachments TEXT,
          entry_hash TEXT,
          sync_status TEXT DEFAULT 'pending',
          last_synced_at TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX idx_flight_date ON flight_entries(flight_date);
        CREATE INDEX idx_sync_status ON flight_entries(sync_status);
        CREATE INDEX idx_server_id ON flight_entries(server_id);
      `);

      await db.runAsync(
        `INSERT INTO flight_entries (
          pilot_id, status, flight_date, aircraft_reg, route_from, route_to,
          pic_time, night_time, total_time, landings_day
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [1, "draft", "2025-03-15", "A6-EXH", "DXB", "LHR", 300, 120, 300, 1]
      );
    });

    it("should detect v1 schema", async () => {
      const tableInfo = await db.getAllAsync<{ name: string }>(
        "PRAGMA table_info(flight_entries)"
      );

      const columnNames = tableInfo.map((col) => col.name);
      expect(columnNames).not.toContain("departure_airport_id");
      expect(columnNames).not.toContain("additional_data");
    });

    it("should add new columns after migration", async () => {
      await MigrationManager.checkAndRunMigrations(db);

      const tableInfo = await db.getAllAsync<{ name: string }>(
        "PRAGMA table_info(flight_entries)"
      );

      const columnNames = tableInfo.map((col) => col.name);
      expect(columnNames).toContain("departure_airport_id");
      expect(columnNames).toContain("arrival_airport_id");
      expect(columnNames).toContain("departure_timezone");
      expect(columnNames).toContain("arrival_timezone");
      expect(columnNames).toContain("departure_time_utc");
      expect(columnNames).toContain("arrival_time_utc");
      expect(columnNames).toContain("night_time_method");
      expect(columnNames).toContain("night_time_calculated_at");
      expect(columnNames).toContain("additional_data");
    });

    it("should preserve existing data after migration", async () => {
      await MigrationManager.checkAndRunMigrations(db);

      const entry = await db.getFirstAsync<{
        aircraft_reg: string;
        route_from: string;
        pic_time: number;
      }>("SELECT aircraft_reg, route_from, pic_time FROM flight_entries WHERE id = 1");

      expect(entry?.aircraft_reg).toBe("A6-EXH");
      expect(entry?.route_from).toBe("DXB");
      expect(entry?.pic_time).toBe(300);
    });

    it("should set default values for new columns", async () => {
      await MigrationManager.checkAndRunMigrations(db);

      const entry = await db.getFirstAsync<{
        departure_airport_id: number | null;
        night_time_method: string | null;
        additional_data: string | null;
      }>(
        "SELECT departure_airport_id, night_time_method, additional_data FROM flight_entries WHERE id = 1"
      );

      expect(entry?.departure_airport_id).toBeNull();
      expect(entry?.night_time_method).toBe("manual");
      expect(entry?.additional_data).toBeNull();
    });

    it("should create indexes on new columns", async () => {
      await MigrationManager.checkAndRunMigrations(db);

      const indexes = await db.getAllAsync<{ name: string }>(
        `SELECT name FROM sqlite_master 
         WHERE type='index' AND tbl_name='flight_entries'`
      );

      const indexNames = indexes.map((idx) => idx.name);
      expect(indexNames).toContain("idx_departure_airport");
      expect(indexNames).toContain("idx_arrival_airport");
      expect(indexNames).toContain("idx_departure_time_utc");
    });
  });

  describe("Session Caching", () => {
    it("should skip migration check in same session", async () => {
      await MigrationManager.checkAndRunMigrations(db);

      const spy = jest.spyOn(db, "getFirstAsync");

      await MigrationManager.checkAndRunMigrations(db);

      expect(spy).not.toHaveBeenCalled();
    });

    it("should check again after session cache is reset", async () => {
      await MigrationManager.checkAndRunMigrations(db);

      MigrationManager.resetSessionCache();
      await AsyncStorage.removeItem("@flightlog:last_migration_check");

      const spy = jest.spyOn(db, "getFirstAsync");
      await MigrationManager.checkAndRunMigrations(db);

      expect(spy).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should rollback transaction on migration failure", async () => {
      await db.execAsync(`
        CREATE TABLE flight_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          pilot_id INTEGER NOT NULL,
          flight_date TEXT NOT NULL
        );
      `);

      await db.execAsync(`
        CREATE TABLE airports (
          id INTEGER PRIMARY KEY,
          invalid_column_that_will_cause_conflict TEXT
        );
      `);

      await expect(
        MigrationManager.checkAndRunMigrations(db)
      ).rejects.toThrow();

      const tableExists = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM sqlite_master 
         WHERE type='table' AND name='schema_migrations'`
      );

      if (tableExists && tableExists.count > 0) {
        const version = await db.getFirstAsync<{ version: number | null }>(
          "SELECT MAX(version) as version FROM schema_migrations"
        );
        expect(version?.version).toBeFalsy();
      }
    });

    it("should retry migration on next app start", async () => {
      await MigrationManager.checkAndRunMigrations(db);

      await MigrationManager.forceMigrationCheck();

      const spy = jest.spyOn(console, "log").mockImplementation(() => {});
      await MigrationManager.checkAndRunMigrations(db);

      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining("Already at target version")
      );
      spy.mockRestore();
    });
  });

  describe("Idempotency", () => {
    it("should safely run migration multiple times", async () => {
      await MigrationManager.checkAndRunMigrations(db);

      await MigrationManager.forceMigrationCheck();
      MigrationManager.resetSessionCache();

      await expect(
        MigrationManager.checkAndRunMigrations(db)
      ).resolves.not.toThrow();

      const version = await db.getFirstAsync<{ version: number }>(
        "SELECT MAX(version) as version FROM schema_migrations"
      );
      expect(version?.version).toBe(2);

      const count = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM schema_migrations"
      );
      expect(count?.count).toBe(1);
    });
  });

  describe("AsyncStorage Integration", () => {
    it("should update last check timestamp after migration", async () => {
      await MigrationManager.checkAndRunMigrations(db);

      const timestamp = await AsyncStorage.getItem(
        "@flightlog:last_migration_check"
      );

      expect(timestamp).toBeTruthy();
      expect(new Date(timestamp!).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it("should skip check if within 24 hours", async () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      await AsyncStorage.setItem("@flightlog:last_migration_check", oneHourAgo);

      await MigrationManager.checkAndRunMigrations(db);

      const spy = jest.spyOn(console, "log").mockImplementation(() => {});

      MigrationManager.resetSessionCache();
      await MigrationManager.checkAndRunMigrations(db);

      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining("Skipping check (checked recently)")
      );
      spy.mockRestore();
    });

    it("should check again after 24 hours", async () => {
      const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      await AsyncStorage.setItem("@flightlog:last_migration_check", yesterday);

      const spy = jest.spyOn(console, "log").mockImplementation(() => {});
      MigrationManager.resetSessionCache();

      await MigrationManager.checkAndRunMigrations(db);

      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining("Checking schema version")
      );
      spy.mockRestore();
    });
  });
});

describe("Database Integration with Migrations", () => {
  it.skip("should run migrations before creating tables", async () => {
    // Integration test placeholder
  });
});
