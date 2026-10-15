import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // The "N" button in the corner during development. Compile and runtime errors still show.
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    // A stray lockfile in a parent folder would otherwise be taken as the workspace root.
    root: import.meta.dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Source maps are uploaded to Sentry only when SENTRY_AUTH_TOKEN is set (Vercel builds),
// then deleted so they are never served to browsers.
export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI && !process.env.VERCEL,
  widenClientFileUpload: true,
  telemetry: false,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
});
