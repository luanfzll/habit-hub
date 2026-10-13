import { expect, test } from "@playwright/test";
import { card, createHabit, reloadAfterSave, signUp, streak, todayCell } from "./helpers";

test("skip today with a reason, see it in the history and undo it", async ({ page }) => {
  await signUp(page);
  await createHabit(page, { name: "Meditar" });
  const meditate = card(page, "Meditar");

  await todayCell(meditate).click();
  const menu = page.getByRole("dialog");
  await menu.getByRole("button", { name: "Pular dia" }).click();
  await menu.getByLabel("Motivo (opcional)").fill("Plantão no hospital");
  await menu.getByRole("button", { name: "Confirmar pulo" }).click();
  await expect(todayCell(meditate)).toHaveAttribute("data-kind", "skipped");
  await expect(todayCell(meditate)).toHaveAccessibleName(/pulado \(Plantão no hospital\)/);
  await expect(meditate.getByText("Hoje foi pulado.")).toBeVisible();

  await reloadAfterSave(page);
  await card(page, "Meditar").getByRole("link", { name: "Meditar" }).click();
  const history = page.getByRole("region", { name: "Dias pulados" });
  await expect(history.getByText("Plantão no hospital")).toBeVisible();

  await todayCell(page.getByRole("article")).click();
  await page.getByRole("dialog").getByRole("button", { name: "Desfazer pulo" }).click();
  await expect(todayCell(page.getByRole("article"))).toHaveAttribute("data-kind", "pending");
  await expect(history).toHaveCount(0);
});

test("skipping a day that has a value warns that it will be discarded", async ({ page }) => {
  await signUp(page);
  await createHabit(page, { name: "Correr", target: 5, unit: "km" });
  const running = card(page, "Correr");
  await running.getByRole("button", { name: "Aumentar" }).click();

  await todayCell(running).click();
  const menu = page.getByRole("dialog");
  await menu.getByRole("button", { name: "Pular dia" }).click();
  await expect(menu.getByText("Isso apaga 1 km registrados neste dia.")).toBeVisible();
  await menu.getByRole("button", { name: "Confirmar pulo" }).click();
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
  await expect(stats.getByText("Maior sequência")).toBeVisible();
  await expect(streak(page.getByRole("article", { name: "Ler" }))).toHaveText(/^1\s*dia seguido$/);
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
