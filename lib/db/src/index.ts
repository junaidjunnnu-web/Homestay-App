import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const connectionString = process.env.DATABASE_URL;
const isNeon =
  connectionString.includes("neon.tech") ||
  connectionString.includes("neon.database");

export const pool = new Pool({
  connectionString,
  max: Number(process.env.DB_POOL_MAX ?? 10),
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS ?? 30_000),
  connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS ?? 10_000),
  ...(isNeon ? { ssl: { rejectUnauthorized: false } } : {}),
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client:", err);
});

export const db = drizzle(pool, { schema });

export * from "./schema";
