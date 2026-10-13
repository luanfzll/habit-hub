import type { BrowserOptions, NodeOptions } from "@sentry/nextjs";

/**
 * Shared Sentry settings. Errors only (no performance tracing, no session replay).
 * The SDK collects a lot by default, so every category of personal data is turned
 * off: no cookies, request bodies, query values, database parameters or local
 * variables (they could hold e-mails or skip reasons). Only the user agent is kept,
 * and the internal user id is attached on the server (see server/session.ts).
 * Disabled unless NEXT_PUBLIC_SENTRY_DSN is set, so development and tests send nothing.
 */
export function sentryOptions(environment: string | undefined): BrowserOptions & NodeOptions {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  return {
    dsn,
    enabled: Boolean(dsn),
    environment: environment ?? "development",
    tracesSampleRate: 0,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: { request: { allow: ["user-agent"] }, response: false },
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
    },
  };
}
