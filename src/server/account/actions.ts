"use server";

import { headers } from "next/headers";
import { auth } from "../auth";
import { getCurrentUser } from "../session";
import { deleteAccount } from "./service";

/** Deletes the account once the person has typed its e-mail, then clears the session cookie. */
export async function deleteAccountAction(typedEmail: string): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user || typeof typedEmail !== "string" || typedEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
    return { ok: false };
  }
  await deleteAccount(user.id);
  // The sessions went with the account; signing out removes the cookie from the browser.
  await auth.api.signOut({ headers: await headers() });
  return { ok: true };
}
