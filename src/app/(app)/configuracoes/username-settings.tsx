"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { UsernameForm } from "@/components/username-form";

export function UsernameSettings({ current, origin }: { current: string | null; origin: string }) {
  const t = useTranslations();
  return (
    <UsernameForm
      current={current}
      origin={origin}
      submitLabel={t("common.save")}
      hint={t("username.changeHint")}
      onSaved={() => void toast.success(t("username.saved"))}
    />
  );
}
