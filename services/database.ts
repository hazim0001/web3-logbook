import * as SQLite from "expo-sqlite";

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
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
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
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_flight_date ON flight_entries(flight_date);
        CREATE INDEX IF NOT EXISTS idx_sync_status ON flight_entries(sync_status);
        CREATE INDEX IF NOT EXISTS idx_server_id ON flight_entries(server_id);
      `);
    } catch (error) {
      console.error("Database init error:", error);
      throw error;
    }

    this.initialized = true;
    console.log("Database initialized");
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
        server_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
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
    };
  }

  private toSnakeCase(value: string): string {
    return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}

export default new Database();
