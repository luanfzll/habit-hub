import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const isDev = process.env.NODE_ENV === "development";
const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

/** Vercel's comments toolbar, shown only on preview deployments. */
const vercelToolbar =
  process.env.VERCEL_ENV === "preview"
    ? {
        script: " https://vercel.live",
        connect: " https://vercel.live wss://ws-us3.pusher.com",
        img: " https://vercel.live https://vercel.com",
        frame: " https://vercel.live",
        style: " https://vercel.live",
        font: " https://vercel.live https://assets.vercel.com",
      }
    : { script: "", connect: "", img: "", frame: "", style: "", font: "" };

/**
 * Content Security Policy without nonces: nonces would make every page dynamic, and the
 * home page is static. Inline scripts stay allowed (Next's bootstrap and the theme script
 * need them), but nothing loads from other origins (except error reports to Sentry), no
 * plugins run, forms only post here and no other site can frame the app.
 * No "upgrade-insecure-requests": HSTS already forces HTTPS on Vercel, and it would break
 * the tests, which run on http://localhost.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}${vercelToolbar.script}`,
  `style-src 'self' 'unsafe-inline'${vercelToolbar.style}`,
  `img-src 'self' data: blob:${vercelToolbar.img}`,
  `font-src 'self'${vercelToolbar.font}`,
  `connect-src 'self'${sentryDsn ? ` ${new URL(sentryDsn).origin}` : ""}${vercelToolbar.connect}`,
  `frame-src 'self'${vercelToolbar.frame}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  // For browsers that ignore frame-ancestors.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
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
