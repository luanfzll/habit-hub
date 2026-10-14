import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import { Client } from "pg";

/** Where the app saves the e-mails it "sends" during the tests (see playwright.config.ts). */
export const OUTBOX = process.env.EMAIL_OUTBOX_DIR || ".outbox";

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

/** Runs a query straight on the app's database, for states the UI cannot reach in a test. */
export async function sql(query: string, params: unknown[] = []) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(query, params);
  } finally {
    await client.end();
  }
}

/** Sign-ups are open to everyone in the tests, so publishing needs a confirmed e-mail. */
export async function confirmEmail(email: string) {
  await sql(`UPDATE users SET email_verified = true WHERE email = $1`, [email]);
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

/** The UI updates optimistically; wait until nothing is still saving before reloading. */
export async function reloadAfterSave(page: Page) {
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
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

/** The "Hábitos de hoje" panel. */
export function todayHabits(page: Page) {
  return page.getByRole("region", { name: "Hábitos de hoje" });
}

/** The "Tarefas do dia" panel. */
export function todayTasks(page: Page) {
  return page.getByRole("region", { name: "Tarefas do dia" });
}

/** The link in the newest e-mail to `to` whose subject matches, waiting for it to be sent. */
export async function emailLink(to: string, subject: RegExp): Promise<string> {
  let link = "";
  await expect
    .poll(
      async () => {
        const files = (await readdir(OUTBOX).catch(() => [] as string[])).filter((f) => f.endsWith(".json")).sort();
        const emails = await Promise.all(
          files.map(async (file) => JSON.parse(await readFile(path.join(OUTBOX, file), "utf8"))),
        );
        const email = emails.filter((e) => e.to === to && subject.test(e.subject)).at(-1);
        link = email?.text.match(/https?:\/\/\S+/)?.[0] ?? "";
        return link;
      },
      { message: `e-mail to ${to} matching ${subject}` },
    )
    .not.toBe("");
  return link;
}
