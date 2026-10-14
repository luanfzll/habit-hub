import "server-only";
import { headers } from "next/headers";

/** Address the app was opened at, so copied links point to the same deployment (production, preview or local). */
export async function requestOrigin(): Promise<string> {
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host") ?? "localhost:3000";
  const protocol = list.get("x-forwarded-proto")?.split(",")[0] ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}
