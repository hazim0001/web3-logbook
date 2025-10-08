import initSqlJs, { Database as SqlJsDatabaseType, SqlJsStatic } from "sql.js";
import path from "path";

type RunResult = {
  lastInsertRowId: number;
  changes: number;
};

type RowObject = Record<string, any>;

const sqlPromise: Promise<SqlJsStatic> = initSqlJs({
  locateFile: (file: string) =>
    path.join(__dirname, "..", "node_modules", "sql.js", "dist", file),
});

function splitStatements(sql: string): string[] {
  return sql
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0)
    .map((statement) => `${statement};`);
}

class MockSQLiteDatabase {
  private db: SqlJsDatabaseType;

  constructor(database: SqlJsDatabaseType) {
    this.db = database;
  }

  async execAsync(sql: string): Promise<void> {
    for (const statement of splitStatements(sql)) {
      this.db.run(statement);
    }
  }

  async runAsync(sql: string, params: any[] = []): Promise<RunResult> {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    while (stmt.step()) {
      // consume all results if any
    }
    stmt.free();

    const lastInsert = this.db.exec(
      "SELECT last_insert_rowid() as id;"
    )[0]?.values?.[0]?.[0];
    const changes = this.db.getRowsModified();

    return {
      lastInsertRowId: typeof lastInsert === "number" ? lastInsert : 0,
      changes,
    };
  }

  async getFirstAsync<T extends RowObject>(
    sql: string,
    params: any[] = []
  ): Promise<T | null> {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);

    const row = stmt.step() ? (stmt.getAsObject() as T) : null;
    stmt.free();
    return row;
  }

  async getAllAsync<T extends RowObject>(
    sql: string,
    params: any[] = []
  ): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);

    const rows: T[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as T);
    }
    stmt.free();
    return rows;
  }

  async withTransactionAsync(callback: () => Promise<void>): Promise<void> {
    this.db.run("BEGIN TRANSACTION;");
    try {
      await callback();
      this.db.run("COMMIT;");
    } catch (error) {
      this.db.run("ROLLBACK;");
      throw error;
    }
  }

  async closeAsync(): Promise<void> {
    this.db.close();
  }
}

export type SQLiteDatabase = MockSQLiteDatabase;

export async function openDatabaseAsync(
  _name?: string
): Promise<MockSQLiteDatabase> {
  const SQL = await sqlPromise;
  const database = new SQL.Database();
  return new MockSQLiteDatabase(database);
}

export default {
  openDatabaseAsync,
};

