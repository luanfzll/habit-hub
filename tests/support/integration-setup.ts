import "dotenv/config";
import { afterAll, beforeEach } from "vitest";

// Must run before anything imports the database client.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

const { db } = await import("@/server/db");

beforeEach(async () => {
  await db.$executeRawUnsafe(
    'TRUNCATE "users", "sessions", "accounts", "verifications", "rate_limits", "habits" CASCADE',
  );
});

afterAll(async () => {
  await db.$disconnect();
});
