/**
 * Database-agnostic error helpers for handling constraint violations.
 * Works with both SQLite (better-sqlite3) and PostgreSQL (pg).
 */

/**
 * Returns true if the error is a unique constraint violation
 * for either SQLite or PostgreSQL.
 */
export function isUniqueConstraintError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;

  // SQLite: SqliteError with code SQLITE_CONSTRAINT_UNIQUE
  if ("code" in e && e.code === "SQLITE_CONSTRAINT_UNIQUE") return true;

  // PostgreSQL: error code 23505 = unique_violation
  if ("code" in e && e.code === "23505") return true;

  return false;
}

/**
 * Returns true if the error is a primary key constraint violation
 * for either SQLite or PostgreSQL.
 */
export function isPrimaryKeyConstraintError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;

  // SQLite: SqliteError with code SQLITE_CONSTRAINT_PRIMARYKEY
  if ("code" in e && e.code === "SQLITE_CONSTRAINT_PRIMARYKEY") return true;

  // PostgreSQL: error code 23505 = unique_violation (PK violations are also unique violations in PG)
  if ("code" in e && e.code === "23505") return true;

  return false;
}

/**
 * Returns true if the error is any kind of constraint violation
 * (unique, primary key, foreign key, check, etc.)
 */
export function isConstraintError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;

  // SQLite: codes start with SQLITE_CONSTRAINT
  if (
    "code" in e &&
    typeof e.code === "string" &&
    e.code.startsWith("SQLITE_CONSTRAINT")
  )
    return true;

  // PostgreSQL: Class 23 — Integrity Constraint Violation
  if (
    "code" in e &&
    typeof e.code === "string" &&
    e.code.startsWith("23")
  )
    return true;

  return false;
}
