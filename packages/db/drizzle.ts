import "dotenv/config";

import { createRequire } from "node:module";
import path from "path";
import Database from "better-sqlite3";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import serverConfig from "@karakeep/shared/config";

import { instrumentDatabase } from "./instrumentation";
import * as schema from "./schema";

type SqliteDB = ReturnType<typeof createSqliteDB>;

function createSqliteDB() {
  const databaseURL = serverConfig.dataDir
    ? `${serverConfig.dataDir}/db.db`
    : "./db.db";

  const sqlite = new Database(databaseURL);

  if (serverConfig.database.walMode) {
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("synchronous = NORMAL");
  } else {
    sqlite.pragma("journal_mode = DELETE");
  }
  sqlite.pragma("cache_size = -65536");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("temp_store = MEMORY");

  instrumentDatabase(sqlite);

  return drizzleSqlite(sqlite, { schema });
}

function createPgDB(): SqliteDB {
  // Use createRequire to synchronously load PG module so that `pg`
  // dependency is not loaded when using SQLite.
  const esmRequire = createRequire(import.meta.url);
  const { pgDb } = esmRequire("./drizzle-pg") as typeof import("./drizzle-pg");
  // The PG drizzle instance is runtime-compatible with the SQLite type.
  // Both support the same query builder API (select, insert, update, delete, query, transaction).
  return pgDb as unknown as SqliteDB;
}

function createDB(): SqliteDB {
  if (serverConfig.database.type === "postgresql") {
    return createPgDB();
  }
  return createSqliteDB();
}

export const db = createDB();
export type DB = typeof db;

export function getInMemoryDB(runMigrations: boolean) {
  const mem = new Database(":memory:");
  const db = drizzleSqlite(mem, { schema, logger: false });
  if (runMigrations) {
    migrate(db, { migrationsFolder: path.resolve(__dirname, "./drizzle") });
  }
  return db;
}
