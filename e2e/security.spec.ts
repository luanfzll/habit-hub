import { expect, test, type Page } from "@playwright/test";
import { card, confirmEmail, createHabit, signUp } from "./helpers";

test("every response carries the security headers", async ({ request }) => {
  for (const path of ["/", "/entrar", "/api/embed/naoexiste1.svg"]) {
    const headers = (await request.get(path)).headers();
    expect(headers["content-security-policy"], path).toContain("frame-ancestors 'none'");
    expect(headers["content-security-policy"], path).toContain("object-src 'none'");
    expect(headers["x-frame-options"], path).toBe("DENY");
    expect(headers["x-content-type-options"], path).toBe("nosniff");
    expect(headers["referrer-policy"], path).toBe("strict-origin-when-cross-origin");
  }
});

/** Records what the Content Security Policy blocks, on every page the browser loads. */
async function recordViolations(page: Page) {
  await page.addInitScript(() => {
    const store = window as unknown as { cspViolations: string[] };
    store.cspViolations = [];
    document.addEventListener("securitypolicyviolation", (event) =>
      store.cspViolations.push(`${event.violatedDirective} ${event.blockedURI}`),
    );
  });
  return () => page.evaluate(() => (window as unknown as { cspViolations: string[] }).cspViolations);
}

test("the app works under the Content Security Policy", async ({ page }) => {
  const violations = await recordViolations(page);
  const visited: string[] = [];
  const check = async () => {
    visited.push(page.url());
    expect(await violations(), page.url()).toEqual([]);
  };

  await page.goto("/");
  await expect(page.getByRole("img", { name: /^Ler:/ })).toBeVisible();
  await check();

  const email = await signUp(page);
  await confirmEmail(email);
  await createHabit(page, { name: "Programar" });
  await check();

  // The habit page with the README preview, which loads the SVG image.
  await card(page, "Programar").getByRole("link", { name: "Programar" }).click();
  const share = page.getByRole("region", { name: "Perfil público" });
  await share.getByLabel("Nome de usuário").fill(`csp-${Date.now().toString(36)}`);
  await share.getByRole("button", { name: "Tornar público" }).click();
  const preview = share.getByRole("img", { name: "Programar no HabitHub" });
  await expect(preview).toBeVisible();
  await expect.poll(() => preview.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await check();

  await share.getByRole("link", { name: /\/u\// }).click();
  await expect(page.getByRole("article", { name: "Programar" })).toBeVisible();
  await check();

  for (const path of ["/configuracoes", "/privacidade"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await check();
  }
  expect(visited.length).toBeGreaterThan(4);
});
