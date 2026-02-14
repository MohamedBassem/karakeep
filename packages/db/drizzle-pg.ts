import "dotenv/config";

import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

import serverConfig from "@karakeep/shared/config";

import * as schemaPg from "./schema-pg";

const pool = new pg.Pool({
  connectionString: serverConfig.database.url,
});

export const pgDb = drizzle(pool, { schema: schemaPg });
