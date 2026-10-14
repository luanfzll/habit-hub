"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { UsernameForm } from "@/components/username-form";
import { Button } from "@/components/ui/button";
import { MAX_PUBLIC_HABITS } from "@/domain/habit-config";
import { escapeXml } from "@/lib/embed-svg";
import { setHabitPublicAction } from "@/server/public/actions";
import type { HabitView } from "@/server/habits/service";

/**
 * Publishing a habit and the code for its README image. The first time, the person
 * picks a username here, since it forms the profile address.
 */
export function ShareHabit({ habit, username, origin }: { habit: HabitView; username: string | null; origin: string }) {
  const t = useTranslations("share");
  const tCommon = useTranslations("common");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const host = origin.replace(/^https?:\/\//, "");

  async function setPublic(isPublic: boolean) {
    const result = await setHabitPublicAction(habit.id, isPublic);
    if (result.ok) {
      setError(null);
      if (!isPublic) toast(t("unpublished", { name: habit.name }));
    } else if (result.error === "limitReached") {
      setError(t("limitReached", { max: MAX_PUBLIC_HABITS }));
    } else if (result.error === "emailNotVerified") {
      setError(t("emailNotVerified"));
    } else {
      setError(tCommon("saveFailed"));
    }
  }

  return (
    <section
      aria-labelledby="share-title"
      aria-busy={pending}
      className="flex flex-col gap-5 rounded-[1.75rem] bg-card p-5 text-card-foreground sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id="share-title" className="text-lg font-semibold">
          {t("title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {habit.isPublic && username
            ? t.rich("isPublic", {
                address: `${host}/u/${username}`,
                link: (chunks) => (
                  <Link href={`/u/${username}`} className="text-foreground underline underline-offset-4">
                    {chunks}
                  </Link>
                ),
              })
            : t("isPrivate", { max: MAX_PUBLIC_HABITS })}
        </p>
      </div>

      {!habit.isPublic &&
        (username ? (
          <Button className="self-start" disabled={pending} onClick={() => startTransition(() => setPublic(true))}>
            {pending ? tCommon("saving") : t("publish")}
          </Button>
        ) : (
          <UsernameForm
            className="max-w-md"
            current={null}
            origin={origin}
            submitLabel={t("publish")}
            hint={t("chooseUsername")}
            onSaved={() => setPublic(true)}
          />
        ))}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {habit.isPublic && (
        <>
          <ReadmeCode habit={habit} origin={origin} />
          <div className="flex flex-col gap-2 border-t pt-5">
            <Button
              variant="outline"
              className="self-start"
              disabled={pending}
              onClick={() => startTransition(() => setPublic(false))}
            >
              {t("unpublish")}
            </Button>
            <p className="text-xs text-muted-foreground">{t("unpublishHint")}</p>
          </div>
        </>
      )}
    </section>
  );
}

/**
 * A <picture> that GitHub resolves to the light or dark image according to the
 * reader's theme. The preview follows the app's theme instead.
 */
function ReadmeCode({ habit, origin }: { habit: HabitView; origin: string }) {
  const t = useTranslations("share");
  const path = `/api/embed/${habit.publicId}.svg`;
  const alt = t("imageAlt", { name: habit.name });
  const code = [
    "<picture>",
    `  <source media="(prefers-color-scheme: dark)" srcset="${origin}${path}?theme=dark">`,
    `  <img alt="${escapeXml(alt)}" src="${origin}${path}?theme=light">`,
    "</picture>",
  ].join("\n");

  function copy() {
    navigator.clipboard.writeText(code).then(
      () => toast.success(t("copied")),
      () => toast.error(t("copyFailed")),
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="font-semibold">{t("readme")}</h3>
        <p className="text-sm text-muted-foreground">{t("readmeHint")}</p>
      </div>
      {/* Shrinks to fit narrow screens, as GitHub does with wide README images. */}
      <div className="rounded-xl bg-background p-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- an SVG drawn by our own route; nothing to optimize */}
        <img src={`${path}?theme=light`} alt={alt} loading="lazy" className="block h-auto max-w-full dark:hidden" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${path}?theme=dark`} alt={alt} loading="lazy" className="hidden h-auto max-w-full dark:block" />
      </div>
      <pre className="overflow-x-auto rounded-xl bg-muted p-4 font-mono text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
      <Button className="self-start" onClick={copy}>
        {t("copy")}
      </Button>
    </div>
  );
}
