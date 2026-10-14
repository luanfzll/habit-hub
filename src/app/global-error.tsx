"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Last-resort error page, shown when even the root layout fails. It replaces the
 * layout, so it cannot rely on the app's fonts, theme or translations.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{ fontFamily: "system-ui, sans-serif", padding: "3rem 1.5rem", maxWidth: "32rem", margin: "0 auto" }}
      >
        <h1 style={{ fontSize: "1.5rem" }}>O HabitHub não conseguiu carregar esta página.</h1>
        <p>O erro foi registrado. Tente de novo; se continuar, volte mais tarde.</p>
        <button type="button" onClick={reset} style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}>
          Tentar de novo
        </button>
      </body>
    </html>
  );
}
