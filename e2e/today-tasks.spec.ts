import { expect, test } from "@playwright/test";
import { reloadAfterSave, signUp, sql, todayTasks } from "./helpers";

/** Pretends a task was created two days ago, as if the days had turned without it being done. */
async function ageTask(email: string, title: string) {
  await sql(
    `UPDATE tasks SET created_for = created_for - 2
     WHERE title = $1 AND user_id = (SELECT id FROM users WHERE email = $2)`,
    [title, email],
  );
}

test("add, complete and delete tasks for the day", async ({ page }) => {
  await signUp(page);
  const tasks = todayTasks(page);
  await expect(tasks.getByText("Nenhuma tarefa por enquanto.", { exact: false })).toBeVisible();

  await tasks.getByLabel("Nova tarefa").fill("Comprar pão");
  await tasks.getByLabel("Nova tarefa").press("Enter");
  await tasks.getByLabel("Nova tarefa").fill("Ligar para a dentista");
  await tasks.getByRole("button", { name: "Adicionar tarefa" }).click();

  const bread = tasks.getByRole("checkbox", { name: "Comprar pão" });
  await bread.click();
  await expect(bread).toHaveAttribute("aria-checked", "true");

  await tasks.getByRole("button", { name: "Excluir “Ligar para a dentista”" }).click();
  await expect(tasks.getByText("Ligar para a dentista")).toHaveCount(0);

  // Done tasks stay visible, crossed out, for the rest of the day.
  await reloadAfterSave(page);
  await expect(todayTasks(page).getByRole("checkbox", { name: "Comprar pão" })).toHaveAttribute("aria-checked", "true");
  await expect(todayTasks(page).getByText("Ligar para a dentista")).toHaveCount(0);
});

test("an unfinished task carries over to the following days", async ({ page }) => {
  const email = await signUp(page);
  const tasks = todayTasks(page);
  await tasks.getByLabel("Nova tarefa").fill("Renovar a CNH");
  await tasks.getByLabel("Nova tarefa").press("Enter");
  await expect(tasks.getByRole("checkbox", { name: "Renovar a CNH" })).toBeEnabled();

  await ageTask(email, "Renovar a CNH");
  await reloadAfterSave(page);

  const carried = todayTasks(page).getByRole("checkbox", { name: /Renovar a CNH/ });
  await expect(carried).toHaveAttribute("aria-checked", "false");
  await expect(carried).toContainText(/desde \w{3}\., \d{2}\/\d{2}/);
});
