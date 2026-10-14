"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
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
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { deleteAccountAction } from "@/server/account/actions";

const EXPORT_URL = "/api/export";

/** Download a copy of the data, or delete the account for good. */
export function AccountData({ email }: { email: string }) {
  const t = useTranslations("accountData");
  return (
    <>
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="font-medium">{t("exportTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("exportHint")}</p>
        </div>
        <a href={EXPORT_URL} download className={buttonVariants({ variant: "outline", className: "self-start" })}>
          {t("export")}
        </a>
      </div>
      <Separator />
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="font-medium">{t("deleteTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("deleteHint")}</p>
        </div>
        <DeleteAccountDialog email={email} />
      </div>
    </>
  );
}

function DeleteAccountDialog({ email }: { email: string }) {
  const t = useTranslations("accountData");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const id = useId();
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();
  const matches = typed.trim().toLowerCase() === email.toLowerCase();

  function confirm() {
    startTransition(async () => {
      const result = await deleteAccountAction(typed);
      if (!result.ok) {
        toast.error(tCommon("saveFailed"));
        return;
      }
      toast.success(t("deleted"));
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <AlertDialog onOpenChange={(open) => !open && setTyped("")}>
      <AlertDialogTrigger render={<Button variant="destructive" className="self-start" />}>
        {t("deleteTitle")}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("dialogTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("dialogDescription")}{" "}
            {t.rich("exportFirst", {
              link: (chunks) => (
                <a href={EXPORT_URL} download>
                  {chunks}
                </a>
              ),
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (matches) confirm();
          }}
        >
          <Field>
            <FieldLabel htmlFor={id}>{t("confirmLabel", { email })}</FieldLabel>
            <Input
              id={id}
              type="email"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </Field>
        </form>
        <AlertDialogFooter>
          <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
          <Button variant="destructive" disabled={!matches || pending} onClick={confirm}>
            {pending ? t("deleting") : t("confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
