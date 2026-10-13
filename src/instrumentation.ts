import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry-options";

export function register() {
  Sentry.init(sentryOptions(process.env.VERCEL_ENV));
}

// Reports errors thrown while rendering Server Components, Route Handlers and Server Actions.
export const onRequestError = Sentry.captureRequestError;
