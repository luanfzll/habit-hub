import "dotenv/config";
import { Client } from "pg";

/** Removes the accounts created by the tests, so local runs don't pile up in the dev database. */
export default async function globalTeardown() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(`DELETE FROM users WHERE email LIKE 'e2e-%@example.com'`);
  } finally {
    await client.end();
  }
}
