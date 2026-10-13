import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { card, createHabit, reloadAfterSave, signUp, streak } from "./helpers";

test("sign up, create a habit and mark today", async ({ page }) => {
  await signUp(page);
  await expect(page.getByText("Nenhum hábito ainda")).toBeVisible();

  await createHabit(page, { name: "Meditar" });
  const meditate = card(page, "Meditar");
  await expect(streak(meditate)).toHaveText(/^0\s*dias seguidos$/);

  await meditate.getByRole("button", { name: "Marcar hoje" }).click();
  await expect(meditate.getByRole("button", { name: "Feito hoje" })).toHaveAttribute("aria-pressed", "true");
  await expect(streak(meditate)).toHaveText(/^1\s*dia seguido$/);
  await expect(meditate.getByRole("button", { name: /hoje.*: feito|: feito/ })).toHaveAttribute("data-level", "4");

  // Persisted on the server, not only in the optimistic state.
  await reloadAfterSave(page);
  await expect(streak(card(page, "Meditar"))).toHaveText(/^1\s*dia seguido$/);
});

test("register a quantity towards a daily target", async ({ page }) => {
  await signUp(page);
  await createHabit(page, { name: "Ler", target: 20, unit: "páginas" });
  const reading = card(page, "Ler");

  await reading.getByRole("button", { name: "Aumentar" }).click();
  await expect(reading.getByLabel("Quantidade de hoje")).toHaveValue("1");

  await reading.getByLabel("Quantidade de hoje").fill("20");
  await reading.getByLabel("Quantidade de hoje").press("Enter");
  await expect(streak(reading)).toHaveText(/^1\s*dia seguido$/);

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
