import "dotenv/config";
import { rm } from "node:fs/promises";
import { Client } from "pg";
import { OUTBOX } from "./helpers";

/** Removes the accounts and e-mails created by the tests, so local runs don't pile up. */
export default async function globalTeardown() {
  await rm(OUTBOX, { recursive: true, force: true });
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(`DELETE FROM users WHERE email LIKE 'e2e-%@example.com'`);
  } finally {
    await client.end();
  }
}
