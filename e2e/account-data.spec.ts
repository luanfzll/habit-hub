import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { createHabit, signUp } from "./helpers";

test("download the data, then delete the account for good", async ({ page }) => {
  const email = await signUp(page);
  await createHabit(page, { name: "Ler" });
  await page.goto("/configuracoes");
  const data = page.getByRole("region", { name: "Seus dados" });

  const download = page.waitForEvent("download");
  await data.getByRole("link", { name: "Baixar meus dados" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^habithub-\d{4}-\d{2}-\d{2}\.json$/);
  const exported = JSON.parse(await readFile(await file.path(), "utf8"));
  expect(exported.account.email).toBe(email);
  expect(exported.habits.map((habit: { name: string }) => habit.name)).toEqual(["Ler"]);

  await data.getByRole("button", { name: "Excluir conta" }).click();
  const dialog = page.getByRole("alertdialog");
  const confirm = dialog.getByRole("button", { name: "Excluir conta" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel(`Digite ${email} para confirmar`).fill(email);
  await confirm.click();
  await expect(page.getByText("Sua conta foi excluída.")).toBeVisible();
  await expect(page).toHaveURL(/\/$/);

  // The account no longer exists.
  await page.goto("/entrar");
  await page.getByRole("textbox", { name: "E-mail" }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("senha-segura-123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
});
