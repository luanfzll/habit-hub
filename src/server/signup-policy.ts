/**
 * Who may create an account, from SIGNUP_ALLOWLIST:
 * - "*": anyone;
 * - comma-separated e-mails: only those;
 * - unset: anyone outside production, nobody in production (closed unless configured).
 */
export function isSignupAllowed(email: string, env: Record<string, string | undefined> = process.env): boolean {
  const setting = env.SIGNUP_ALLOWLIST?.trim();
  if (!setting) return env.NODE_ENV !== "production";
  if (setting === "*") return true;
  const allowed = setting
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}

/** True once sign-ups are open to anyone ("*"); from then on publishing requires a confirmed e-mail. */
export function isSignupOpenToEveryone(env: Record<string, string | undefined> = process.env): boolean {
  return env.SIGNUP_ALLOWLIST?.trim() === "*";
}
