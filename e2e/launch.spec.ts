import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { card, signUp, streak } from "./helpers";

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations).toEqual([]);
}

// The examples are drawn with the visitor's "today", and training is only on Mon/Wed/Fri,
// so the browser clock is fixed to keep the counts the same on every day of the week.
const WEDNESDAY = new Date("2026-10-14T12:00:00-03:00");
const THURSDAY = new Date("2026-10-15T12:00:00-03:00");

test("the home page shows an example grid and links to the privacy page", async ({ page }) => {
  await page.clock.setFixedTime(WEDNESDAY);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Seus hábitos numa grade, um quadradinho por dia." }),
  ).toBeVisible();
  await expect(page.getByText("2 de 3 feitos")).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Meditar" })).toContainText("falta hoje");
  const reading = page.getByRole("listitem").filter({ hasText: "Ler" });
  await expect(reading).toContainText("feito hoje");
  await expect(streak(reading)).toHaveText(/^5\s*dias seguidos$/);
  await expect(reading.getByRole("img", { name: "Últimas 12 semanas de Ler" })).toBeVisible();
  // The README preview is drawn by the same function as the real README image.
  await expect(page.getByRole("img", { name: "Ler: 5 dias seguidos" })).toBeVisible();
  await expectNoAxeViolations(page);

  await page.getByRole("link", { name: "Privacidade" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Privacidade" })).toBeVisible();
  await expect(page.getByRole("link", { name: "habithub.mail@gmail.com" }).first()).toHaveAttribute(
    "href",
    "mailto:habithub.mail@gmail.com",
  );
  await expectNoAxeViolations(page);
});

test("on a day off, the training example says so instead of counting it", async ({ page }) => {
  await page.clock.setFixedTime(THURSDAY);
  await page.goto("/");
  await expect(page.getByText("1 de 2 feitos")).toBeVisible();
  const training = page.getByRole("listitem").filter({ hasText: "Treinar" });
  await expect(training).toContainText("Folga hoje");
  await expect(training.getByText("Treinar", { exact: true })).toBeVisible();
  await expect(streak(training)).toHaveText(/^4\s*dias seguidos$/);
});

test("a suggestion on the empty dashboard fills the new-habit form", async ({ page }) => {
  await signUp(page);
  await page.getByRole("link", { name: "Beber 8 copos de água" }).click();
  await expect(page.getByRole("textbox", { name: "Nome" })).toHaveValue("Beber água");
  await expect(page.getByRole("spinbutton", { name: "Meta diária" })).toHaveValue("8");
  await expect(page.getByRole("textbox", { name: "Unidade (opcional)" })).toHaveValue("copos");
  await page.getByRole("button", { name: "Criar hábito" }).click();

  await expect(page).toHaveURL(/\/painel$/);
  await expect(card(page, "Beber água").getByText("8 copos por dia")).toBeVisible();
});
