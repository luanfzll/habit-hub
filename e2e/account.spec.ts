import { expect, test } from "@playwright/test";
import { emailLink, signUp } from "./helpers";

test("reset a forgotten password through the e-mailed link", async ({ page }) => {
  const email = await signUp(page);
  await page.context().clearCookies();

  await page.goto("/entrar");
  await page.getByRole("link", { name: "Esqueceu a senha?" }).click();
  await expect(page.getByRole("heading", { name: "Recuperar senha" })).toBeVisible();
  // Role queries skip the hidden copy of the sign-in page that Next keeps mounted.
  await page.getByRole("textbox", { name: "E-mail" }).fill(email);
  await page.getByRole("button", { name: "Enviar link" }).click();
  await expect(page.getByRole("heading", { name: "Confira seu e-mail" })).toBeVisible();

  const link = await emailLink(email, /^Redefina sua senha/);
  await page.goto(link);
  await expect(page).toHaveURL(/\/redefinir-senha\?token=/);
  // Role queries skip hidden copies of the page, which Next may keep for a moment after loading.
  await page.getByRole("textbox", { name: "Nova senha" }).fill("outra-senha-456");
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(page).toHaveURL(/\/entrar$/);

  await page.getByRole("textbox", { name: "E-mail" }).fill(email);
  await page.getByRole("textbox", { name: "Senha", exact: true }).fill("outra-senha-456");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/painel$/);

  // The link only works once.
  await page.goto(link);
  await expect(page.getByRole("heading", { name: "Link inválido ou expirado" })).toBeVisible();
});

test("confirm the e-mail through the link; the reminder stays until then", async ({ page }) => {
  const email = await signUp(page);
  const reminder = page.getByText(`Confirme seu e-mail pelo link que enviamos para ${email}.`);
  await expect(reminder).toBeVisible();
  await page.getByRole("button", { name: "Reenviar link" }).click();
  await expect(page.getByText(`Link enviado para ${email}.`)).toBeVisible();

  await page.goto(await emailLink(email, /^Confirme seu e-mail/));
  await expect(page.getByRole("heading", { name: "E-mail confirmado" })).toBeVisible();
  await page.getByRole("link", { name: "Ir para o painel" }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await expect(reminder).toBeHidden();
});

test("change the password and the e-mail in the settings", async ({ page }) => {
  const email = await signUp(page);
  await page.goto("/configuracoes");
  const account = page.getByRole("region", { name: "Conta" });
  // Both forms have a "Senha atual" field.
  const passwordForm = account.locator("form").filter({ has: page.getByLabel("Nova senha") });
  const emailForm = account.locator("form").filter({ has: page.getByLabel("Novo e-mail") });

  await passwordForm.getByLabel("Senha atual").fill("senha-errada-1");
  await passwordForm.getByLabel("Nova senha").fill("nova-senha-789");
  await passwordForm.getByRole("button", { name: "Trocar senha" }).click();
  await expect(passwordForm.getByText("A senha atual está incorreta.")).toBeVisible();
  await passwordForm.getByLabel("Senha atual").fill("senha-segura-123");
  await passwordForm.getByRole("button", { name: "Trocar senha" }).click();
  await expect(page.getByText("Senha alterada.", { exact: false })).toBeVisible();

  // Changing the e-mail asks for the current password, and the address only changes
  // after the link sent to the new one is opened.
  const newEmail = email.replace("e2e-", "e2e-novo-");
  await emailForm.getByLabel("Novo e-mail").fill(newEmail);
  await emailForm.getByLabel("Senha atual").fill("senha-segura-123");
  await emailForm.getByRole("button", { name: "Trocar e-mail" }).click();
  await expect(emailForm.getByText("A senha atual está incorreta.")).toBeVisible();
  await emailForm.getByLabel("Senha atual").fill("nova-senha-789");
  await emailForm.getByRole("button", { name: "Trocar e-mail" }).click();
  await expect(account.getByText(`Enviamos um link para ${newEmail}.`, { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("region", { name: "Conta" }).getByText(email)).toBeVisible();

  await page.goto(await emailLink(newEmail, /^Confirme seu novo e-mail/));
  await expect(page.getByRole("heading", { name: "E-mail confirmado" })).toBeVisible();
  await page.goto("/configuracoes");
  await expect(page.getByRole("region", { name: "Conta" }).getByText(`${newEmail} (confirmado)`)).toBeVisible();
});
