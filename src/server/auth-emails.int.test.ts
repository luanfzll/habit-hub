import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { createUser } from "../../tests/support/factories";
import { MAX_RESET_EMAILS_PER_HOUR, sendConfirmationEmail, sendPasswordResetEmail } from "./auth-emails";
import { db } from "./db";

const LINK = "http://localhost:3100/api/auth/reset-password/abc?callbackURL=";
let printed: MockInstance<typeof console.info>;

beforeEach(() => {
  // The console sender prints each e-mail; keep the test output clean and inspect it instead.
  printed = vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => printed.mockRestore());

/** What Better Auth stores for each reset request, `minutesAgo` minutes ago. */
async function resetRequest(userId: string, minutesAgo = 0) {
  await db.verification.create({
    data: {
      id: randomUUID(),
      identifier: `reset-password:${randomUUID()}`,
      value: userId,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date(Date.now() - minutesAgo * 60 * 1000),
    },
  });
}

describe("password reset e-mails", () => {
  it(`go out at most ${MAX_RESET_EMAILS_PER_HOUR} times per account per hour`, async () => {
    const user = await createUser();
    await resetRequest(user.id, 90);
    for (let i = 1; i <= MAX_RESET_EMAILS_PER_HOUR; i++) {
      await resetRequest(user.id);
      expect(await sendPasswordResetEmail(user, LINK)).toBe(true);
    }
    await resetRequest(user.id);
    expect(await sendPasswordResetEmail(user, LINK)).toBe(false);
    expect(printed).toHaveBeenCalledTimes(MAX_RESET_EMAILS_PER_HOUR);
  });

  it("link to the app's own page", async () => {
    const user = await createUser();
    await resetRequest(user.id);
    await sendPasswordResetEmail(user, LINK);
    expect(printed.mock.calls[0][0]).toContain("callbackURL=%2Fredefinir-senha");
  });
});

describe("confirmation e-mails", () => {
  it("tell a new account apart from an e-mail change", async () => {
    const user = await createUser();
    await sendConfirmationEmail(user, "http://localhost:3100/api/auth/verify-email?token=x");
    await sendConfirmationEmail(
      { ...user, email: "novo@example.com" },
      "http://localhost:3100/api/auth/verify-email?token=y",
    );
    expect(printed.mock.calls[0][0]).toContain("Subject: Confirme seu e-mail no HabitHub");
    expect(printed.mock.calls[1][0]).toContain("To: novo@example.com");
    expect(printed.mock.calls[1][0]).toContain("Subject: Confirme seu novo e-mail no HabitHub");
    expect(printed.mock.calls[1][0]).toContain("callbackURL=%2Femail-confirmado");
  });
});
