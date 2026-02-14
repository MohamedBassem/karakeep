import "dotenv/config";

import type { Config } from "drizzle-kit";

import serverConfig from "@karakeep/shared/config";

const isPostgresql = serverConfig.database.type === "postgresql";

const sqliteConfig = {
  dialect: "sqlite" as const,
  schema: "./schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: serverConfig.dataDir ? `${serverConfig.dataDir}/db.db` : "./db.db",
  },
};

const postgresqlConfig = {
  dialect: "postgresql" as const,
  schema: "./schema-pg.ts",
  out: "./drizzle-pg",
  dbCredentials: {
    url: serverConfig.database.url ?? "",
  },
};

export default (
  isPostgresql ? postgresqlConfig : sqliteConfig
) satisfies Config;
