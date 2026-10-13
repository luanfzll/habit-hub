"use client";

import { useTranslations } from "next-intl";
import { useSyncExternalStore, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateTimezoneAction } from "@/server/settings/actions";

const DISMISS_KEY = "habithub:timezone-banner-dismissed";

function browserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function readDismissed(): string | null {
  try {
    return window.localStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
}

/** Offers to switch the profile time zone when the browser is somewhere else. */
export function TimezoneBanner({ profileTimezone }: { profileTimezone: string }) {
  const t = useTranslations();
  const [hidden, setHidden] = useState(false);
  const [pending, startTransition] = useTransition();
  // The browser time zone only exists on the client; the server renders nothing.
  const browser = useSyncExternalStore(
    () => () => {},
    browserTimezone,
    () => null,
  );
  const dismissedFor = useSyncExternalStore(
    () => () => {},
    readDismissed,
    () => null,
  );

  if (!browser || browser === profileTimezone || dismissedFor === browser || hidden) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, browser);
    } catch {
      // Storage may be unavailable (private mode); hiding for this visit is enough.
    }
    setHidden(true);
  };

  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-3 text-sm sm:flex-row sm:items-center"
    >
      <p className="flex-1">{t("timezoneBanner.text", { browser, profile: profileTimezone })}</p>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await updateTimezoneAction(browser);
              if (!result.ok) toast.error(t("common.saveFailed"));
            })
          }
        >
          {t("timezoneBanner.update", { browser })}
        </Button>
        <Button size="sm" variant="ghost" onClick={dismiss}>
          {t("timezoneBanner.dismiss")}
        </Button>
      </div>
    </div>
  );
}
