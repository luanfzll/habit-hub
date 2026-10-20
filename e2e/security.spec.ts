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
    expect(headers["cross-origin-opener-policy"], path).toBe("same-origin");
    expect(headers["x-powered-by"], path).toBeUndefined();
  }
});

test("account changes through Better Auth's own routes are checked too", async ({ page }) => {
  await signUp(page);
  const origin = new URL(page.url()).origin;
  const post = (path: string, data: object) => page.request.post(`/api/auth/${path}`, { data, headers: { origin } });

  // Without the current password, a stolen session cannot move the account to another address.
  const noPassword = await post("change-email", { newEmail: "outro@example.com" });
  expect(noPassword.status()).toBe(400);
  expect((await noPassword.json()).code).toBe("INVALID_PASSWORD");
  const wrongPassword = await post("change-email", { newEmail: "outro@example.com", password: "errada-123" });
  expect((await wrongPassword.json()).code).toBe("INVALID_PASSWORD");

  // An invalid time zone would break every page that computes "today" for the account.
  expect((await post("update-user", { timezone: "Nao/Existe" })).ok()).toBe(false);
  await page.goto("/painel");
  await expect(page.getByRole("heading", { level: 1, name: "Hoje" })).toBeVisible();
});

test("a form sent before the page finishes loading keeps the password out of the URL", async ({ browser }) => {
  // Without JavaScript the browser submits the form itself, as it does before hydration.
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL: "http://localhost:3100" });
  const page = await context.newPage();
  for (const path of ["/entrar", "/cadastro"]) {
    await page.goto(path);
    await page.getByRole("textbox", { name: "E-mail" }).fill("alguem@example.com");
    await page.getByLabel("Senha", { exact: true }).fill("senha-secreta-123");
    await page.locator("form").getByRole("button").last().click();
    await page.waitForLoadState();
    expect(page.url(), path).not.toContain("senha-secreta");
    expect(page.url(), path).not.toContain("alguem");
  }
  await context.close();
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
