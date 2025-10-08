import * as SQLite from "expo-sqlite";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TARGET_SCHEMA_VERSION = 2;
const MIGRATION_CHECK_KEY = "@flightlog:last_migration_check";
const MIGRATION_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

export class MigrationManager {
  private static currentSessionVersion: number | null = null;

  /**
   * Check and run any pending migrations.
   * Called from Database.init()
   */
  static async checkAndRunMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
    try {
      if (this.currentSessionVersion === TARGET_SCHEMA_VERSION) {
        console.log("[Migration] Already at target version in this session");
        return;
      }

      const shouldSkipCheck = await this.shouldSkipMigrationCheck();
      if (shouldSkipCheck) {
        console.log("[Migration] Skipping check (checked recently)");
        this.currentSessionVersion = TARGET_SCHEMA_VERSION;
        return;
      }

      console.log("[Migration] Checking schema version...");
      const currentVersion = await this.getCurrentSchemaVersion(db);
      console.log(`[Migration] Current version: ${currentVersion}`);

      if (currentVersion < TARGET_SCHEMA_VERSION) {
        console.log(
          `[Migration] Migrating from v${currentVersion} to v${TARGET_SCHEMA_VERSION}...`
        );
        await this.runMigrations(db, currentVersion);
        console.log("[Migration] Migration completed successfully");
      } else {
        console.log("[Migration] Already at target version");
      }

      this.currentSessionVersion = TARGET_SCHEMA_VERSION;
      await AsyncStorage.setItem(MIGRATION_CHECK_KEY, new Date().toISOString());
    } catch (error) {
      console.error("[Migration] Migration failed:", error);
      throw new Error(
        "Database migration failed. Please contact support if this persists."
      );
    }
  }

  private static async getCurrentSchemaVersion(
    db: SQLite.SQLiteDatabase
  ): Promise<number> {
    try {
      const tableCheck = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM sqlite_master 
         WHERE type='table' AND name='schema_migrations'`
      );

      if (!tableCheck || tableCheck.count === 0) {
        console.log("[Migration] schema_migrations table not found, version 0");
        return 0;
      }

      const versionRow = await db.getFirstAsync<{ version: number }>(
        "SELECT MAX(version) as version FROM schema_migrations"
      );

      return versionRow?.version ?? 0;
    } catch (error) {
      console.error("[Migration] Error checking version:", error);
      return 0;
    }
  }

  private static async runMigrations(
    db: SQLite.SQLiteDatabase,
    fromVersion: number
  ): Promise<void> {
    if (fromVersion === 0) {
      await this.createSchemaMigrationsTable(db);
    }

    if (fromVersion < 2) {
      await this.runMigration(db, 2, "Extended schema with airports", () =>
        this.migration_v2(db)
      );
    }
  }

  private static async runMigration(
    db: SQLite.SQLiteDatabase,
    version: number,
    description: string,
    migrationFn: () => Promise<void>
  ): Promise<void> {
    console.log(`[Migration] Running migration v${version}: ${description}`);

    try {
      await db.withTransactionAsync(async () => {
        await migrationFn();
        await db.runAsync(
          `INSERT INTO schema_migrations (version, applied_at, description) 
           VALUES (?, ?, ?)`,
          [version, new Date().toISOString(), description]
        );
      });

      console.log(`[Migration] v${version} completed`);
    } catch (error) {
      console.error(`[Migration] v${version} failed:`, error);
      throw error;
    }
  }

  private static async createSchemaMigrationsTable(
    db: SQLite.SQLiteDatabase
  ): Promise<void> {
    console.log("[Migration] Creating schema_migrations table...");
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL,
        description TEXT
      );
    `);
  }

  private static async migration_v2(db: SQLite.SQLiteDatabase): Promise<void> {
    console.log("[Migration v2] Creating airports table...");
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS airports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        icao_code TEXT NOT NULL UNIQUE,
        iata_code TEXT,
        name TEXT NOT NULL,
        city TEXT,
        country TEXT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        timezone TEXT,
        elevation_ft INTEGER,
        type TEXT,
        active INTEGER DEFAULT 1
      );
    `);

    console.log("[Migration v2] Creating airport indexes...");
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_airports_icao ON airports(icao_code);
      CREATE INDEX IF NOT EXISTS idx_airports_iata ON airports(iata_code);
      CREATE INDEX IF NOT EXISTS idx_airports_name ON airports(name);
      CREATE INDEX IF NOT EXISTS idx_airports_city ON airports(city);
      CREATE INDEX IF NOT EXISTS idx_airports_active ON airports(active);
    `);

    const flightTable = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM sqlite_master 
       WHERE type='table' AND name='flight_entries'`
    );

    if (!flightTable || flightTable.count === 0) {
      console.log("[Migration v2] Creating flight_entries table with new schema...");
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS flight_entries (
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
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          departure_airport_id INTEGER,
          arrival_airport_id INTEGER,
          departure_timezone TEXT,
          arrival_timezone TEXT,
          departure_time_utc TEXT,
          arrival_time_utc TEXT,
          night_time_method TEXT DEFAULT 'manual',
          night_time_calculated_at TEXT,
          additional_data TEXT
        );
      `);

      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_flight_date ON flight_entries(flight_date);
        CREATE INDEX IF NOT EXISTS idx_sync_status ON flight_entries(sync_status);
        CREATE INDEX IF NOT EXISTS idx_server_id ON flight_entries(server_id);
        CREATE INDEX IF NOT EXISTS idx_departure_airport ON flight_entries(departure_airport_id);
        CREATE INDEX IF NOT EXISTS idx_arrival_airport ON flight_entries(arrival_airport_id);
        CREATE INDEX IF NOT EXISTS idx_departure_time_utc ON flight_entries(departure_time_utc);
      `);

      console.log("[Migration v2] flight_entries table created for fresh install");
      return;
    }

    console.log("[Migration v2] Adding departure_airport_id column...");
    await db.execAsync(`
      ALTER TABLE flight_entries ADD COLUMN departure_airport_id INTEGER;
    `);

    console.log("[Migration v2] Adding arrival_airport_id column...");
    await db.execAsync(`
      ALTER TABLE flight_entries ADD COLUMN arrival_airport_id INTEGER;
    `);

    console.log("[Migration v2] Adding departure_timezone column...");
    await db.execAsync(`
      ALTER TABLE flight_entries ADD COLUMN departure_timezone TEXT;
    `);

    console.log("[Migration v2] Adding arrival_timezone column...");
    await db.execAsync(`
      ALTER TABLE flight_entries ADD COLUMN arrival_timezone TEXT;
    `);

    console.log("[Migration v2] Adding departure_time_utc column...");
    await db.execAsync(`
      ALTER TABLE flight_entries ADD COLUMN departure_time_utc TEXT;
    `);

    console.log("[Migration v2] Adding arrival_time_utc column...");
    await db.execAsync(`
      ALTER TABLE flight_entries ADD COLUMN arrival_time_utc TEXT;
    `);

    console.log("[Migration v2] Adding night_time_method column...");
    await db.execAsync(`
      ALTER TABLE flight_entries ADD COLUMN night_time_method TEXT DEFAULT 'manual';
    `);

    console.log("[Migration v2] Adding night_time_calculated_at column...");
    await db.execAsync(`
      ALTER TABLE flight_entries ADD COLUMN night_time_calculated_at TEXT;
    `);

    console.log("[Migration v2] Adding additional_data column...");
    await db.execAsync(`
      ALTER TABLE flight_entries ADD COLUMN additional_data TEXT;
    `);

    console.log("[Migration v2] Creating new indexes...");
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_departure_airport ON flight_entries(departure_airport_id);
      CREATE INDEX IF NOT EXISTS idx_arrival_airport ON flight_entries(arrival_airport_id);
      CREATE INDEX IF NOT EXISTS idx_departure_time_utc ON flight_entries(departure_time_utc);
    `);

    console.log("[Migration v2] Migration completed");
  }

  private static async shouldSkipMigrationCheck(): Promise<boolean> {
    try {
      const lastCheck = await AsyncStorage.getItem(MIGRATION_CHECK_KEY);
      if (!lastCheck) {
        return false;
      }

      const lastCheckTime = new Date(lastCheck).getTime();
      const now = Date.now();

      return now - lastCheckTime < MIGRATION_CHECK_INTERVAL;
    } catch (error) {
      console.error("[Migration] Error checking last migration check:", error);
      return false;
    }
  }

  static resetSessionCache(): void {
    this.currentSessionVersion = null;
  }

  static async forceMigrationCheck(): Promise<void> {
    await AsyncStorage.removeItem(MIGRATION_CHECK_KEY);
    this.resetSessionCache();
  }
}
