import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { card, confirmEmail, createHabit, reloadAfterSave, signUp, todayHabits } from "./helpers";

test("publish a habit: username, public profile, README code and image", async ({ page, request }) => {
  const email = await signUp(page);
  await confirmEmail(email);
  await createHabit(page, { name: "Programar" });
  await createHabit(page, { name: "Diário" });
  await todayHabits(page).getByRole("checkbox", { name: "Programar" }).click();
  await reloadAfterSave(page);
  await card(page, "Programar").getByRole("link", { name: "Programar" }).click();

  // The first publication asks for the username that forms the profile address.
  const share = page.getByRole("region", { name: "Perfil público" });
  const username = `e2e-${Date.now().toString(36)}`;
  await share.getByLabel("Nome de usuário").fill(username.toUpperCase());
  await expect(share.getByText(`/u/${username}`)).toBeVisible();
  await share.getByRole("button", { name: "Tornar público" }).click();
  const profileLink = share.getByRole("link", { name: new RegExp(`/u/${username}$`) });
  await expect(profileLink).toBeVisible();

  const code = (await share.locator("pre").textContent()) ?? "";
  expect(code).toMatch(/^<picture>\n {2}<source media="\(prefers-color-scheme: dark\)" srcset="[^"]+\?theme=dark">/);
  const image = await request.get(code.match(/src="([^"]+)"/)![1]);
  expect(image.headers()["content-type"]).toContain("image/svg+xml");
  expect(await image.text()).toContain("1 dia seguido");

  // Visitors see only the public habit, and search engines are asked to stay away.
  const visit = await request.get(`/u/${username}`);
  const html = await visit.text();
  expect(html).toContain("Programar");
  expect(html).not.toContain("Diário");
  expect(html).toMatch(/<meta name="robots" content="noindex, nofollow"/);

  await profileLink.click();
  await expect(page.getByRole("heading", { level: 1, name: username })).toBeVisible();
  await expect(page.getByRole("article", { name: "Programar" }).locator('[data-today="true"]')).toHaveAttribute(
    "data-kind",
    "done",
  );
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations).toEqual([]);

  // Back to private: the profile disappears and READMEs show the placeholder.
  await page.goBack();
  await page.getByRole("region", { name: "Perfil público" }).getByRole("button", { name: "Tornar privado" }).click();
  await expect(
    page.getByRole("region", { name: "Perfil público" }).getByRole("button", { name: "Tornar público" }),
  ).toBeVisible();
  expect(await (await request.get(`/u/${username}`)).text()).toContain("Página não encontrada");
  expect(await (await request.get(code.match(/src="([^"]+)"/)![1])).text()).toContain("Hábito indisponível");
});

test("the username can be changed in the settings", async ({ page }) => {
  await signUp(page);
  await page.goto("/configuracoes");
  // Role queries skip the hidden copy of the previous screen that Next keeps mounted.
  const field = page.getByRole("textbox", { name: "Nome de usuário" });
  const form = page.locator("form").filter({ has: field });
  await field.fill("admin");
  await form.getByRole("button", { name: "Salvar" }).click();
  await expect(form.getByText("Esse nome é reservado. Escolha outro.")).toBeVisible();

  const username = `e2e-${Date.now().toString(36)}`;
  await field.fill(username);
  await form.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Nome de usuário salvo.")).toBeVisible();
  await page.reload();
  await expect(field).toHaveValue(username);
});
