import { expect, type Page } from "@playwright/test";

const randomOctet = () => Math.floor(Math.random() * 256);

export async function signUp(page: Page) {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  // Auth endpoints allow 3 attempts per 10 s per IP in production; each test acts as its own client.
  const ip = `10.${randomOctet()}.${randomOctet()}.${randomOctet()}`;
  await page.setExtraHTTPHeaders({ "x-forwarded-for": ip });
  await page.goto("/cadastro");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("senha-segura-123");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/painel$/);
  return email;
}

export async function createHabit(
  page: Page,
  { name, target, unit }: { name: string; target?: number; unit?: string },
) {
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
export async function reloadAfterSave(page: Page) {
  await expect(page.locator('article[aria-busy="true"]')).toHaveCount(0);
  await page.reload();
}

export function card(page: Page, name: string) {
  return page.getByRole("article", { name });
}

/** Today's square in a habit's grid. */
export function todayCell(container: ReturnType<Page["locator"]>) {
  return container.locator('[data-today="true"]');
}

/** The streak scoreboard of a habit ("12 dias seguidos"). */
export function streak(container: ReturnType<Page["locator"]>) {
  return container.locator("[data-streak]");
}
