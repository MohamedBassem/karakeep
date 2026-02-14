import "dotenv/config";

import serverConfig from "@karakeep/shared/config";

if (serverConfig.database.type === "postgresql") {
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  const { pgDb } = await import("./drizzle-pg");
  await migrate(pgDb, { migrationsFolder: "./drizzle-pg" });
} else {
  const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
  const { db } = await import("./drizzle");
  migrate(db, { migrationsFolder: "./drizzle" });
}
