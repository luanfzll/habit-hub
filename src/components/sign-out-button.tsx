"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const t = useTranslations("common");
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        await authClient.signOut();
        router.replace("/");
        router.refresh();
      }}
    >
      {t("signOut")}
    </Button>
  );
}
