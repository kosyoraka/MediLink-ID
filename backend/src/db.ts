import { Pool } from "pg";

function getSslConfig() {
  const rejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED;

  if (rejectUnauthorized === undefined) return undefined;

  return {
    rejectUnauthorized: rejectUnauthorized.toLowerCase() === "true",
  };
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: getSslConfig(),
});
