import { expect, test } from "@playwright/test";
import { card, createHabit, reloadAfterSave, signUp, todayCell } from "./helpers";

test("skip today and undo it", async ({ page }) => {
  await signUp(page);
  await createHabit(page, { name: "Meditar" });
  const meditate = card(page, "Meditar");

  await todayCell(meditate).click();
  await page.getByRole("dialog").getByRole("button", { name: "Pular dia" }).click();
  await expect(todayCell(meditate)).toHaveAttribute("data-kind", "skipped");
  await expect(meditate.getByText("Hoje foi pulado.")).toBeVisible();

  await reloadAfterSave(page);
  await todayCell(card(page, "Meditar")).click();
  await page.getByRole("dialog").getByRole("button", { name: "Desfazer pulo" }).click();
  await expect(todayCell(card(page, "Meditar"))).toHaveAttribute("data-kind", "pending");
});

test("skipping a day that has a value asks before discarding it", async ({ page }) => {
  await signUp(page);
  await createHabit(page, { name: "Correr", target: 5, unit: "km" });
  const running = card(page, "Correr");
  await running.getByRole("button", { name: "Aumentar" }).click();

  await todayCell(running).click();
  const menu = page.getByRole("dialog");
  await menu.getByRole("button", { name: "Pular dia" }).click();
  await menu.getByRole("button", { name: "Apagar 1 km e pular?" }).click();
  await expect(todayCell(running)).toHaveAttribute("data-kind", "skipped");
  await expect(running.getByLabel("Quantidade de hoje")).toHaveValue("0");
});

test("habit page shows stats; a habit can be archived, restored and deleted", async ({ page }) => {
  await signUp(page);
  await createHabit(page, { name: "Ler" });
  await card(page, "Ler").getByRole("button", { name: "Marcar hoje" }).click();
  await reloadAfterSave(page);

  await card(page, "Ler").getByRole("link", { name: "Ler" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Ler" })).toBeVisible();
  const stats = page.getByRole("region", { name: "Estatísticas" });
  await expect(stats.getByText("Sequência atual")).toBeVisible();
  await expect(stats.getByText("100%")).toBeVisible();

  await page.getByRole("button", { name: "Arquivar" }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await expect(card(page, "Ler")).toHaveCount(0);

  await page.getByRole("link", { name: "Hábitos arquivados (1)" }).click();
  await page.getByRole("button", { name: "Desarquivar" }).click();
  await expect(page.getByText("Nenhum hábito arquivado.")).toBeVisible();

  await page.goto("/painel");
  await card(page, "Ler").getByRole("link", { name: "Ler" }).click();
  await page.getByRole("button", { name: "Excluir" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Excluir hábito" }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await expect(page.getByText("Nenhum hábito ainda")).toBeVisible();
});

test("theme can be switched and is remembered", async ({ page }) => {
  await signUp(page);
  await page.getByRole("button", { name: "Tema escuro" }).click();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
});
