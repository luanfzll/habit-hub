import "server-only";
import * as Sentry from "@sentry/nextjs";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { after } from "next/server";
import { isValidTimeZone } from "@/domain/calendar-date";
import { sendConfirmationEmail, sendPasswordResetEmail } from "./auth-emails";
import { db } from "./db";
import { isSignupAllowed } from "./signup-policy";

const DAY_IN_SECONDS = 60 * 60 * 24;

/**
 * Changing the e-mail asks for the current password, like changing the password does.
 * Otherwise whoever holds an open session could move the account to an address of their
 * own and then reset the password. Checked here, before Better Auth's own endpoint, so a
 * direct call to /api/auth/change-email cannot skip it and its rate limit still applies.
 */
async function requireCurrentPassword(ctx: Parameters<Parameters<typeof createAuthMiddleware>[0]>[0]) {
  const wrong = () => APIError.from("BAD_REQUEST", { code: "INVALID_PASSWORD", message: "Invalid password" });
  const session = await getSessionFromCtx(ctx);
  const password = (ctx.body as { password?: unknown } | undefined)?.password;
  if (!session || typeof password !== "string" || password.length > 128) throw wrong();
  const account = await ctx.context.internalAdapter.findCredentialAccount(session.user.id);
  if (!account?.password || !(await ctx.context.password.verify({ hash: account.password, password }))) {
    throw wrong();
  }
}

/**
 * E-mails go out after the response, so how long sending takes does not reveal whether
 * an account exists. Outside a request (scripts, tests) the task simply runs on its own.
 */
function runAfterResponse(task: Promise<unknown>) {
  const reported = task.catch((error) => {
    console.error(error);
    Sentry.captureException(error);
  });
  try {
    after(() => reported);
  } catch {
    // Not inside a request: nothing to wait for.
  }
}

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // Single-use link, valid for 1 hour (Better Auth's default), to /redefinir-senha.
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail(user, url);
    },
    revokeSessionsOnPasswordReset: true,
  },
  emailVerification: {
    // Never blocks using the app: the e-mail is only required to publish (once sign-ups open).
    sendOnSignUp: true,
    expiresIn: DAY_IN_SECONDS,
    sendVerificationEmail: ({ user, url }) => sendConfirmationEmail(user, url),
  },
  session: {
    // 30 days, renewed while the person keeps using the app.
    expiresIn: 30 * DAY_IN_SECONDS,
    updateAge: DAY_IN_SECONDS,
  },
  user: {
    // The address only changes after the link sent to the new one is opened.
    changeEmail: { enabled: true },
    additionalFields: {
      timezone: { type: "string", required: true, input: true },
    },
  },
  rateLimit: {
    // On Vercel each instance has its own memory, so counters must live in the database.
    storage: "database",
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!isSignupAllowed(user.email)) {
            throw APIError.from("FORBIDDEN", { code: "SIGNUPS_CLOSED", message: "Sign-ups are closed" });
          }
          if (typeof user.timezone !== "string" || !isValidTimeZone(user.timezone)) {
            throw new APIError("BAD_REQUEST", { message: "Invalid time zone" });
          }
        },
      },
      // /update-user accepts the time zone too; an invalid one would break every page
      // that computes "today" for this account (and its public profile and images).
      update: {
        before: async (user) => {
          if ("timezone" in user && (typeof user.timezone !== "string" || !isValidTimeZone(user.timezone))) {
            throw new APIError("BAD_REQUEST", { message: "Invalid time zone" });
          }
        },
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/change-email") await requireCurrentPassword(ctx);
    }),
  },
  advanced: {
    backgroundTasks: { handler: runAfterResponse },
  },
  // Must stay last: lets Server Actions set auth cookies.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
