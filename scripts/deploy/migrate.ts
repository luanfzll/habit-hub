/**
 * Runs on Vercel before `next build` (the `vercel-build` script).
 *
 * - Production: backs up the database as a Neon branch, then applies migrations.
 *   Without the Neon credentials the build fails: production is never migrated without a backup.
 * - Preview: applies migrations only when MIGRATE_PREVIEW_DATABASE=true, which is set once
 *   the Neon integration gives every preview its own database branch. Otherwise a preview
 *   could migrate the production database.
 * - Anywhere else (local builds, CI): does nothing.
 */
import { execFileSync } from "node:child_process";
import { backupProductionDatabase } from "./neon-backups";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required to deploy to production`);
  return value;
}

function migrate() {
  execFileSync("npx", ["prisma", "migrate", "deploy"], { stdio: "inherit" });
}

async function main() {
  const environment = process.env.VERCEL_ENV;

  if (environment === "production") {
    const backup = await backupProductionDatabase(required("NEON_API_KEY"), required("NEON_PROJECT_ID"));
    console.info(`[deploy] Backup branch created: ${backup}`);
    migrate();
  } else if (environment === "preview" && process.env.MIGRATE_PREVIEW_DATABASE === "true") {
    migrate();
  } else {
    console.info(`[deploy] No migrations for environment "${environment ?? "local"}".`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
