import * as SQLite from "expo-sqlite";
import { MigrationManager } from "./migrations/MigrationManager";

export interface FlightEntry {
  id?: number;
  serverId?: number;
  pilotId: number;
  status: "draft" | "submitted" | "approved" | "anchored";
  flightDate: string;
  aircraftReg: string;
  aircraftType?: string;
  routeFrom?: string;
  routeTo?: string;
  picTime: number;
  sicTime: number;
  dualTime: number;
  nightTime: number;
  instrumentTime: number;
  totalTime: number;
  landingsDay: number;
  landingsNight: number;
  remarks?: string;
  attachments?: string;
  entryHash?: string;
  batchId?: string;
  version?: string;
  syncStatus: "pending" | "synced" | "error";
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;

  departureAirportId?: number;
  arrivalAirportId?: number;
  departureTimezone?: string;
  arrivalTimezone?: string;
  departureTimeUtc?: string;
  arrivalTimeUtc?: string;
  nightTimeMethod?: "manual" | "calculated" | "estimated";
  nightTimeCalculatedAt?: string;
  additionalData?: string;
}

export interface AdditionalFlightData {
  flightNumber?: string;
  scheduledOut?: string;
  scheduledIn?: string;
  actualOut?: string;
  actualIn?: string;
  fdpStart?: string;
  fdpEnd?: string;
  fdpHours?: number;
  fuelLoaded?: number;
  distanceNm?: number;
  scheduledOutUtc?: string;
  scheduledInUtc?: string;
  actualOutUtc?: string;
  actualInUtc?: string;
  crewMembers?: Array<{
    name: string;
    role: "PIC" | "SIC" | "RELIEF";
    licenseNo?: string;
  }>;
  [key: string]: any;
}

export interface Airport {
  id: number;
  icaoCode: string;
  iataCode?: string;
  name: string;
  city?: string;
  country?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  elevationFt?: number;
  type?: string;
  active: boolean;
}

type FlightRow = {
  id: number;
  server_id: number | null;
  pilot_id: number;
  status: string;
  flight_date: string;
  aircraft_reg: string;
  aircraft_type: string | null;
  route_from: string | null;
  route_to: string | null;
  pic_time: number;
  sic_time: number;
  dual_time: number;
  night_time: number;
  instrument_time: number;
  total_time: number;
  landings_day: number;
  landings_night: number;
  remarks: string | null;
  attachments: string | null;
  entry_hash: string | null;
  sync_status: string;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
  departure_airport_id: number | null;
  arrival_airport_id: number | null;
  departure_timezone: string | null;
  arrival_timezone: string | null;
  departure_time_utc: string | null;
  arrival_time_utc: string | null;
  night_time_method: string | null;
  night_time_calculated_at: string | null;
  additional_data: string | null;
};

type AirportRow = {
  id: number;
  icao_code: string;
  iata_code: string | null;
  name: string;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  timezone: string | null;
  elevation_ft: number | null;
  type: string | null;
  active: number;
};

class Database {
  private db: SQLite.SQLiteDatabase | null = null;
  private initialized = false;

  private async getDb(): Promise<SQLite.SQLiteDatabase> {
    if (!this.db) {
      this.db = await SQLite.openDatabaseAsync("flightlog.db");
    }
    return this.db;
  }

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const db = await this.getDb();
    try {
      console.log("[Database] Initializing database...");

      await db.execAsync(`PRAGMA journal_mode = WAL;`);
      await MigrationManager.checkAndRunMigrations(db);

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

        CREATE INDEX IF NOT EXISTS idx_airports_icao ON airports(icao_code);
        CREATE INDEX IF NOT EXISTS idx_airports_iata ON airports(iata_code);
        CREATE INDEX IF NOT EXISTS idx_airports_name ON airports(name);
        CREATE INDEX IF NOT EXISTS idx_airports_city ON airports(city);
        CREATE INDEX IF NOT EXISTS idx_airports_active ON airports(active);

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
          additional_data TEXT,
          FOREIGN KEY (departure_airport_id) REFERENCES airports(id),
          FOREIGN KEY (arrival_airport_id) REFERENCES airports(id)
        );

        CREATE INDEX IF NOT EXISTS idx_flight_date ON flight_entries(flight_date);
        CREATE INDEX IF NOT EXISTS idx_sync_status ON flight_entries(sync_status);
        CREATE INDEX IF NOT EXISTS idx_server_id ON flight_entries(server_id);
        CREATE INDEX IF NOT EXISTS idx_departure_airport ON flight_entries(departure_airport_id);
        CREATE INDEX IF NOT EXISTS idx_arrival_airport ON flight_entries(arrival_airport_id);
        CREATE INDEX IF NOT EXISTS idx_departure_time_utc ON flight_entries(departure_time_utc);
      `);

      console.log("[Database] Initialization complete");
    } catch (error) {
      console.error("[Database] Initialization error:", error);
      throw error;
    }

    this.initialized = true;
  }

  async searchAirports(query: string, limit: number = 20): Promise<Airport[]> {
    const db = await this.getDb();
    await this.init();

    const searchTerm = `%${query.toUpperCase()}%`;
    const rows = await db.getAllAsync<AirportRow>(
      `SELECT * FROM airports 
       WHERE active = 1 
       AND (
         icao_code LIKE ? 
         OR iata_code LIKE ? 
         OR UPPER(name) LIKE ? 
         OR UPPER(city) LIKE ?
       )
       ORDER BY 
         CASE 
           WHEN icao_code = ? THEN 1
           WHEN iata_code = ? THEN 2
           WHEN icao_code LIKE ? THEN 3
           WHEN iata_code LIKE ? THEN 4
           ELSE 5
         END,
         name
       LIMIT ?`,
      [
        searchTerm,
        searchTerm,
        searchTerm,
        searchTerm,
        query.toUpperCase(),
        query.toUpperCase(),
        `${query.toUpperCase()}%`,
        `${query.toUpperCase()}%`,
        limit,
      ]
    );

    return rows.map((row) => this.mapRowToAirport(row));
  }

  async getAirport(id: number): Promise<Airport | null> {
    const db = await this.getDb();
    await this.init();

    const row = await db.getFirstAsync<AirportRow>(
      "SELECT * FROM airports WHERE id = ?",
      [id]
    );

    return row ? this.mapRowToAirport(row) : null;
  }

  async getAirportByCode(code: string): Promise<Airport | null> {
    const db = await this.getDb();
    await this.init();

    const upperCode = code.toUpperCase();
    const row = await db.getFirstAsync<AirportRow>(
      "SELECT * FROM airports WHERE icao_code = ? OR iata_code = ?",
      [upperCode, upperCode]
    );

    return row ? this.mapRowToAirport(row) : null;
  }

  async bulkInsertAirports(airports: Omit<Airport, "id">[]): Promise<void> {
    const db = await this.getDb();
    await this.init();

    console.log(`Inserting ${airports.length} airports...`);

    await db.withTransactionAsync(async () => {
      for (const airport of airports) {
        await db.runAsync(
          `INSERT OR IGNORE INTO airports (
            icao_code, iata_code, name, city, country,
            latitude, longitude, timezone, elevation_ft, type, active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            airport.icaoCode,
            airport.iataCode ?? null,
            airport.name,
            airport.city ?? null,
            airport.country ?? null,
            airport.latitude,
            airport.longitude,
            airport.timezone ?? null,
            airport.elevationFt ?? null,
            airport.type ?? null,
            airport.active ? 1 : 0,
          ]
        );
      }
    });

    console.log("Airports inserted successfully");
  }

  async getAirportCount(): Promise<number> {
    const db = await this.getDb();
    await this.init();

    const row = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM airports WHERE active = 1"
    );

    return row?.count ?? 0;
  }

  async createEntry(
    entry: Omit<FlightEntry, "id" | "createdAt" | "updatedAt">
  ): Promise<number> {
    const db = await this.getDb();
    await this.init();

    const result = await db.runAsync(
      `INSERT INTO flight_entries (
        pilot_id, status, flight_date, aircraft_reg, aircraft_type,
        route_from, route_to, pic_time, sic_time, dual_time,
        night_time, instrument_time, total_time, landings_day, landings_night,
        remarks, attachments, sync_status, entry_hash, last_synced_at,
        server_id, departure_airport_id, arrival_airport_id,
        departure_timezone, arrival_timezone, departure_time_utc, arrival_time_utc,
        night_time_method, night_time_calculated_at, additional_data,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        entry.pilotId,
        entry.status,
        entry.flightDate,
        entry.aircraftReg,
        entry.aircraftType ?? null,
        entry.routeFrom ?? null,
        entry.routeTo ?? null,
        entry.picTime,
        entry.sicTime,
        entry.dualTime,
        entry.nightTime,
        entry.instrumentTime,
        entry.totalTime,
        entry.landingsDay,
        entry.landingsNight,
        entry.remarks ?? null,
        entry.attachments ?? null,
        entry.syncStatus,
        entry.entryHash ?? null,
        entry.lastSyncedAt ?? null,
        entry.serverId ?? null,
        entry.departureAirportId ?? null,
        entry.arrivalAirportId ?? null,
        entry.departureTimezone ?? null,
        entry.arrivalTimezone ?? null,
        entry.departureTimeUtc ?? null,
        entry.arrivalTimeUtc ?? null,
        entry.nightTimeMethod ?? "manual",
        entry.nightTimeCalculatedAt ?? null,
        entry.additionalData ?? null,
      ]
    );

    return result.lastInsertRowId;
  }

  async updateEntry(id: number, updates: Partial<FlightEntry>): Promise<void> {
    if (!updates || Object.keys(updates).length === 0) {
      return;
    }

    const db = await this.getDb();
    await this.init();

    const fields = Object.keys(updates)
      .filter((key) => key !== "id" && key !== "createdAt")
      .map((key) => `${this.toSnakeCase(key)} = ?`);

    const values = Object.entries(updates)
      .filter(([key]) => key !== "id" && key !== "createdAt")
      .map(([, value]) => value ?? null);

    await db.runAsync(
      `UPDATE flight_entries SET ${fields.join(
        ", "
      )}, updated_at = datetime('now') WHERE id = ?`,
      [...values, id]
    );
  }

  async getEntry(id: number): Promise<FlightEntry | null> {
    const db = await this.getDb();
    await this.init();

    const row = await db.getFirstAsync<FlightRow>(
      "SELECT * FROM flight_entries WHERE id = ?",
      [id]
    );

    if (!row) {
      return null;
    }

    return this.mapRowToEntry(row);
  }

  async getAllEntries(filters?: {
    status?: string;
    limit?: number;
  }): Promise<FlightEntry[]> {
    const db = await this.getDb();
    await this.init();

    let query = "SELECT * FROM flight_entries";
    const params: any[] = [];

    if (filters?.status) {
      query += " WHERE status = ?";
      params.push(filters.status);
    }

    query += " ORDER BY flight_date DESC, created_at DESC";

    if (filters?.limit) {
      query += " LIMIT ?";
      params.push(filters.limit);
    }

    const rows = await db.getAllAsync<FlightRow>(query, params);
    return rows.map((row) => this.mapRowToEntry(row));
  }

  async getPendingSyncEntries(): Promise<FlightEntry[]> {
    const db = await this.getDb();
    await this.init();

    const rows = await db.getAllAsync<FlightRow>(
      "SELECT * FROM flight_entries WHERE sync_status = ? ORDER BY created_at ASC",
      ["pending"]
    );

    return rows.map((row) => this.mapRowToEntry(row));
  }

  async deleteEntry(id: number): Promise<void> {
    const db = await this.getDb();
    await this.init();
    await db.runAsync("DELETE FROM flight_entries WHERE id = ?", [id]);
  }

  async markAsSynced(id: number, serverId: number): Promise<void> {
    const db = await this.getDb();
    await this.init();

    await db.runAsync(
      `UPDATE flight_entries
       SET sync_status = 'synced', server_id = ?, last_synced_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`,
      [serverId, id]
    );
  }

  async getStats(): Promise<{
    total: number;
    pending: number;
    synced: number;
    lastSyncedAt: string | null;
  }> {
    const db = await this.getDb();
    await this.init();

    const row = await db.getFirstAsync<{
      total: number;
      pending: number;
      synced: number;
      lastSyncedAt: string | null;
    }>(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN sync_status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN sync_status = 'synced' THEN 1 ELSE 0 END) as synced,
        MAX(last_synced_at) as lastSyncedAt
       FROM flight_entries`
    );

    return {
      total: row?.total ?? 0,
      pending: row?.pending ?? 0,
      synced: row?.synced ?? 0,
      lastSyncedAt: row?.lastSyncedAt ?? null,
    };
  }

  private mapRowToEntry(row: FlightRow): FlightEntry {
    return {
      id: row.id,
      serverId: row.server_id ?? undefined,
      pilotId: row.pilot_id,
      status: row.status as FlightEntry["status"],
      flightDate: row.flight_date,
      aircraftReg: row.aircraft_reg,
      aircraftType: row.aircraft_type ?? undefined,
      routeFrom: row.route_from ?? undefined,
      routeTo: row.route_to ?? undefined,
      picTime: row.pic_time,
      sicTime: row.sic_time,
      dualTime: row.dual_time,
      nightTime: row.night_time,
      instrumentTime: row.instrument_time,
      totalTime: row.total_time,
      landingsDay: row.landings_day,
      landingsNight: row.landings_night,
      remarks: row.remarks ?? undefined,
      attachments: row.attachments ?? undefined,
      entryHash: row.entry_hash ?? undefined,
      batchId: undefined,
      version: undefined,
      syncStatus: row.sync_status as FlightEntry["syncStatus"],
      lastSyncedAt: row.last_synced_at ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      departureAirportId: row.departure_airport_id ?? undefined,
      arrivalAirportId: row.arrival_airport_id ?? undefined,
      departureTimezone: row.departure_timezone ?? undefined,
      arrivalTimezone: row.arrival_timezone ?? undefined,
      departureTimeUtc: row.departure_time_utc ?? undefined,
      arrivalTimeUtc: row.arrival_time_utc ?? undefined,
      nightTimeMethod: (row.night_time_method as FlightEntry["nightTimeMethod"]) ?? "manual",
      nightTimeCalculatedAt: row.night_time_calculated_at ?? undefined,
      additionalData: row.additional_data ?? undefined,
    };
  }

  private mapRowToAirport(row: AirportRow): Airport {
    return {
      id: row.id,
      icaoCode: row.icao_code,
      iataCode: row.iata_code ?? undefined,
      name: row.name,
      city: row.city ?? undefined,
      country: row.country ?? undefined,
      latitude: row.latitude,
      longitude: row.longitude,
      timezone: row.timezone ?? undefined,
      elevationFt: row.elevation_ft ?? undefined,
      type: row.type ?? undefined,
      active: row.active === 1,
    };
  }

  private toSnakeCase(value: string): string {
    return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}

export default new Database();
