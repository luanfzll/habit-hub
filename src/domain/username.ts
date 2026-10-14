/** Public profile names: /u/<username>. Stored lowercase; compared without case. */

export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$/;

/** Names that could pass as the app itself. */
const RESERVED = new Set([
  "admin",
  "administrador",
  "ajuda",
  "api",
  "app",
  "contato",
  "equipe",
  "habithub",
  "help",
  "moderador",
  "oficial",
  "root",
  "sistema",
  "staff",
  "suporte",
  "support",
]);

export type UsernameProblem = "format" | "reserved";

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function usernameProblem(username: string): UsernameProblem | null {
  if (!USERNAME_PATTERN.test(username)) return "format";
  if (RESERVED.has(username)) return "reserved";
  return null;
}
