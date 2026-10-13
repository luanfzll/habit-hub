import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function signUp(page: Page) {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  await page.goto("/cadastro");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("senha-segura-123");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/painel$/);
  return email;
}

async function createHabit(page: Page, { name, target, unit }: { name: string; target?: number; unit?: string }) {
  await page
    .getByRole("link", { name: /Novo hábito|Criar primeiro hábito/ })
    .first()
    .click();
  await page.getByLabel("Nome").fill(name);
  if (target) await page.getByLabel("Meta diária").fill(String(target));
  if (unit) await page.getByLabel("Unidade (opcional)").fill(unit);
  await page.getByRole("button", { name: "Criar hábito" }).click();
  await expect(page).toHaveURL(/\/painel$/);
}

/** The UI updates optimistically; wait until no card is still saving before reloading. */
async function reloadAfterSave(page: Page) {
  await expect(page.locator('article[aria-busy="true"]')).toHaveCount(0);
  await page.reload();
}

function card(page: Page, name: string) {
  return page.getByRole("article", { name });
}

test("sign up, create a habit and mark today", async ({ page }) => {
  await signUp(page);
  await expect(page.getByText("Nenhum hábito ainda")).toBeVisible();

  await createHabit(page, { name: "Meditar" });
  const meditate = card(page, "Meditar");
  await expect(meditate.getByText("Nenhum dia seguido")).toBeVisible();

  await meditate.getByRole("button", { name: "Marcar hoje" }).click();
  await expect(meditate.getByRole("button", { name: "Feito hoje" })).toHaveAttribute("aria-pressed", "true");
  await expect(meditate.getByText("1 dia seguido")).toBeVisible();
  await expect(meditate.getByRole("button", { name: /hoje.*: feito|: feito/ })).toHaveAttribute("data-level", "4");

  // Persisted on the server, not only in the optimistic state.
  await reloadAfterSave(page);
  await expect(card(page, "Meditar").getByText("1 dia seguido")).toBeVisible();
});

test("register a quantity towards a daily target", async ({ page }) => {
  await signUp(page);
  await createHabit(page, { name: "Ler", target: 20, unit: "páginas" });
  const reading = card(page, "Ler");

  await reading.getByRole("button", { name: "Aumentar" }).click();
  await expect(reading.getByLabel("Quantidade de hoje")).toHaveValue("1");

  await reading.getByLabel("Quantidade de hoje").fill("20");
  await reading.getByLabel("Quantidade de hoje").press("Enter");
  await expect(reading.getByText("1 dia seguido")).toBeVisible();

  await reloadAfterSave(page);
  await expect(card(page, "Ler").getByLabel("Quantidade de hoje")).toHaveValue("20");
});

test("edit today's value from the grid menu", async ({ page }) => {
  await signUp(page);
  await createHabit(page, { name: "Correr", target: 5, unit: "km" });
  const running = card(page, "Correr");

  await running.getByRole("button", { name: /hoje: ainda não registrado/ }).click();
  const menu = page.getByRole("dialog");
  await menu.getByLabel(/Quantidade/).fill("3");
  await menu.getByRole("button", { name: "Salvar" }).click();

  // 3 of 5 is 60%, the second tone.
  await expect(running.getByRole("button", { name: /hoje: 3 de 5 km/ })).toHaveAttribute("data-level", "2");
});

test("dashboard has no detectable accessibility violations", async ({ page }) => {
  await signUp(page);
  await createHabit(page, { name: "Beber água", target: 8, unit: "copos" });
  // After a client-side navigation the title is updated a moment later.
  await expect(page).toHaveTitle(/HabitHub/);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations).toEqual([]);
});
