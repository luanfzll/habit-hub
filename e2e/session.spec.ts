import { expect, test } from "@playwright/test";

test("a stale session cookie leads to the sign-in page instead of a redirect loop", async ({
  page,
  context,
  baseURL,
}) => {
  // A cookie whose session no longer exists (expired, revoked or deleted).
  await context.addCookies([{ name: "better-auth.session_token", value: "stale.signature", url: baseURL! }]);

  await page.goto("/painel");
  await expect(page).toHaveURL(/\/entrar$/);
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();

  // It stays there instead of bouncing back to the dashboard.
  await page.waitForTimeout(1000);
  await expect(page).toHaveURL(/\/entrar$/);
});
