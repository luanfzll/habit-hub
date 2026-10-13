import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { isValidTimeZone } from "@/domain/calendar-date";
import { db } from "./db";
import { isSignupAllowed } from "./signup-policy";

const DAY_IN_SECONDS = 60 * 60 * 24;

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  session: {
    // 30 days, renewed while the person keeps using the app.
    expiresIn: 30 * DAY_IN_SECONDS,
    updateAge: DAY_IN_SECONDS,
  },
  user: {
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
    },
  },
  // Must stay last: lets Server Actions set auth cookies.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
