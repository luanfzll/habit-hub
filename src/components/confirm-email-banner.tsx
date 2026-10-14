"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

/** Fixed reminder while the e-mail is not confirmed. It never blocks using the app. */
export function ConfirmEmailBanner({ email }: { email: string }) {
  const t = useTranslations("confirmEmail");
  const tAuth = useTranslations("auth");
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function resend() {
    setPending(true);
    const { error } = await authClient.sendVerificationEmail({ email, callbackURL: "/email-confirmado" });
    setPending(false);
    if (!error) toast.success(t("sent", { email }));
    else if (error.code === "EMAIL_ALREADY_VERIFIED") router.refresh();
    else toast.error(tAuth(error.status === 429 ? "tooManyAttempts" : "genericError"));
  }

  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-3 text-sm sm:flex-row sm:items-center"
    >
      <p className="flex-1">{t("text", { email })}</p>
      <Button size="sm" variant="outline" className="self-start sm:self-auto" disabled={pending} onClick={resend}>
        {t("resend")}
      </Button>
    </div>
  );
}
