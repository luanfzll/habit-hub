"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteHabitAction } from "@/server/habits/actions";

/** Delete button with a confirmation dialog. Deleting cannot be undone. */
export function DeleteHabitDialog({
  habitId,
  name,
  onDeleted,
}: {
  habitId: string;
  name: string;
  onDeleted?: () => void;
}) {
  const t = useTranslations();
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await deleteHabitAction(habitId);
      if (!result.ok) {
        toast.error(t("common.saveFailed"));
        return;
      }
      toast.success(t("deleteHabit.deleted", { name }));
      onDeleted?.();
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" className="text-destructive" />}>
        {t("deleteHabit.button")}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteHabit.title", { name })}</AlertDialogTitle>
          <AlertDialogDescription>{t("deleteHabit.description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <Button variant="destructive" disabled={pending} onClick={confirm}>
            {t("deleteHabit.confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
