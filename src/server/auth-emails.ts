import "server-only";
import { createTranslator } from "next-intl";
import { LOCALE } from "@/i18n/request";
import messages from "../../messages/pt-BR.json";
import { db } from "./db";
import { createEmailSender, type EmailSender } from "./email";

/** Reset links sent per account per hour. Better Auth also limits requests per IP. */
export const MAX_RESET_EMAILS_PER_HOUR = 3;
const HOUR_MS = 60 * 60 * 1000;

let sender: EmailSender | undefined;
const emailSender = () => (sender ??= createEmailSender());

const t = createTranslator({ locale: LOCALE, messages, namespace: "emails" });

/** Points a Better Auth link at our own page, whatever the request asked for. */
function withCallback(url: string, callbackURL: string): string {
  const link = new URL(url);
  link.searchParams.set("callbackURL", callbackURL);
  return link.href;
}

/**
 * Sends the reset link unless the account already got MAX_RESET_EMAILS_PER_HOUR in the
 * last hour. Better Auth stores the token before calling this, so the count includes it.
 * Returns whether the e-mail was sent.
 */
export async function sendPasswordResetEmail(user: { id: string; email: string }, url: string): Promise<boolean> {
  const recent = await db.verification.count({
    where: {
      identifier: { startsWith: "reset-password:" },
      value: user.id,
      createdAt: { gt: new Date(Date.now() - HOUR_MS) },
    },
  });
  if (recent > MAX_RESET_EMAILS_PER_HOUR) return false;

  await emailSender().send({
    to: user.email,
    subject: t("resetPassword.subject"),
    text: t("resetPassword.text", { url: withCallback(url, "/redefinir-senha") }),
  });
  return true;
}

/**
 * Confirms the e-mail of a new account or, when `user.email` differs from the saved one,
 * the new address of an e-mail change (which only happens after the click).
 */
export async function sendConfirmationEmail(user: { id: string; email: string }, url: string) {
  const saved = await db.user.findUnique({ where: { id: user.id }, select: { email: true } });
  const kind = saved && saved.email !== user.email ? "changeEmail" : "confirmEmail";
  await emailSender().send({
    to: user.email,
    subject: t(`${kind}.subject`),
    text: t(`${kind}.text`, { url: withCallback(url, "/email-confirmado") }),
  });
}
