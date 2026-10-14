import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { card, signUp, streak } from "./helpers";

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations).toEqual([]);
}

test("the home page shows an example grid and links to the privacy page", async ({ page }) => {
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
