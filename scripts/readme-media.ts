/**
 * Regenerates the README images in docs/screenshots/: the logo, the home page (light and
 * dark), the README code of a published habit, a habit page, the phone view and the GIF of a
 * habit being marked.
 *
 * Needs, in this order:
 *   docker compose up -d && npm run db:migrate && npm run db:seed
 *   npm run build && npm run start      (or npm run dev; the app must answer on :3100)
 *   npm run readme:media
 *
 * Uses the local example account only (dev@habithub.local), never real data. The GIF needs
 * ffmpeg on the PATH. Run the seed again before each run: the script marks today's habits.
 */
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium, type Browser, type BrowserContextOptions, type Page } from "@playwright/test";
import { Client } from "pg";

const BASE_URL = process.env.README_MEDIA_URL ?? "http://localhost:3100";
const OUT = path.resolve("docs/screenshots");
const EMAIL = "dev@habithub.local";
const PASSWORD = "senha-de-dev-123";
const DESKTOP = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };
/** The two desktop captures in the README gallery share this size. */
const GALLERY = { width: 1280, height: 720 };

async function sql(query: string, params: unknown[] = []) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(query, params);
  } finally {
    await client.end();
  }
}

/**
 * The example account, confirmed (no reminder banner), with a recent reading streak and
 * "Ler" published under the username "exemplo" (for the README code capture).
 */
async function prepareExampleAccount() {
  await sql("UPDATE users SET email_verified = true, username = 'exemplo' WHERE email = $1", [EMAIL]);
  await sql(
    "UPDATE habits SET is_public = true WHERE name = 'Ler' AND user_id = (SELECT id FROM users WHERE email = $1)",
    [EMAIL],
  );
  await sql(
    `INSERT INTO habit_entries (habit_id, date, value, skipped, updated_at)
     SELECT h.id, d::date, 20 + (extract(day FROM d)::int % 7), false, now()
     FROM habits h JOIN users u ON u.id = h.user_id,
          generate_series(current_date - 11, current_date - 1, interval '1 day') d
     WHERE u.email = $1 AND h.name = 'Ler'
     ON CONFLICT (habit_id, date) DO UPDATE SET value = EXCLUDED.value, skipped = false, skip_reason = null`,
    [EMAIL],
  );
}

function contextOptions(viewport: { width: number; height: number }): BrowserContextOptions {
  return { baseURL: BASE_URL, viewport, deviceScaleFactor: 2, locale: "pt-BR", timezoneId: "America/Sao_Paulo" };
}

/** A page in the given theme (next-themes reads it from localStorage). */
async function themedPage(browser: Browser, theme: "light" | "dark", viewport = DESKTOP, storageState?: string) {
  const context = await browser.newContext({ ...contextOptions(viewport), storageState });
  await context.addInitScript((value) => localStorage.setItem("theme", value), theme);
  return context.newPage();
}

async function signIn(page: Page) {
  await page.goto("/entrar");
  await page.getByRole("textbox", { name: "E-mail" }).fill(EMAIL);
  await page.getByLabel("Senha", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/painel$/);
}

async function settle(page: Page) {
  await page.mouse.move(0, 0);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400);
}

/** The wordmark alone, large, on a transparent background. */
async function logo(browser: Browser, theme: "light" | "dark") {
  const page = await themedPage(browser, theme);
  await page.goto("/");
  const mark = page.locator("header nav > :first-child");
  await mark.evaluate((element) => {
    (element as HTMLElement).style.fontSize = "56px";
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
  });
  await settle(page);
  // Named after the reader's theme: white text for dark pages, black text for light ones.
  await mark.screenshot({ path: path.join(OUT, `logo-${theme}.png`), omitBackground: true });
  await page.context().close();
}

/** The home page down to the end of its first block (the hero), just above the divider. */
async function home(browser: Browser, theme: "light" | "dark") {
  const page = await themedPage(browser, theme);
  await page.goto("/");
  await page.getByRole("img", { name: /^Ler:/ }).waitFor();
  await settle(page);
  const hero = await page.locator("main section").first().boundingBox();
  await page.screenshot({
    path: path.join(OUT, `inicio-${theme === "light" ? "claro" : "escuro"}.png`),
    clip: { x: 0, y: 0, width: DESKTOP.width, height: Math.floor(hero!.y + hero!.height - 16) },
  });
  await page.context().close();
}

/** Draws a cursor, since recorded videos do not show the mouse. */
function cursorScript() {
  window.addEventListener("DOMContentLoaded", () => {
    const dot = document.createElement("div");
    dot.style.cssText =
      "position:fixed;z-index:2147483647;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;" +
      "background:rgba(255,255,255,.35);border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.5);" +
      "pointer-events:none;transition:transform .12s;left:-100px;top:-100px";
    document.body.append(dot);
    window.addEventListener("mousemove", (event) => {
      dot.style.left = `${event.clientX}px`;
      dot.style.top = `${event.clientY}px`;
    });
    window.addEventListener("mousedown", () => (dot.style.transform = "scale(.7)"));
    window.addEventListener("mouseup", () => (dot.style.transform = ""));
  });
}

/** Dashboard: ticking "Ler" in Today completes it, and its grid square and streak light up. */
async function gif(browser: Browser, storageState: string) {
  const videoDir = mkdtempSync(path.join(tmpdir(), "habithub-video-"));
  const size = { width: 1280, height: 720 };
  const context = await browser.newContext({
    ...contextOptions(size),
    deviceScaleFactor: 1,
    storageState,
    recordVideo: { dir: videoDir, size },
  });
  await context.addInitScript((value) => localStorage.setItem("theme", value), "dark");
  await context.addInitScript(cursorScript);
  const started = Date.now();
  const page = await context.newPage();
  await page.goto("/painel");
  const today = page.getByRole("region", { name: "Hábitos de hoje" });
  await today.waitFor();
  // Today's panel at the top, the "Ler" card's grid below it.
  await today.evaluate((element) => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 24));
  await page.waitForLoadState("networkidle");
  const ready = (Date.now() - started) / 1000;

  await page.mouse.move(640, 600);
  await page.waitForTimeout(1600);
  const box = (await today.getByRole("checkbox", { name: "Ler" }).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 25 });
  await page.waitForTimeout(350);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(3600);
  const ended = (Date.now() - started) / 1000;
  await context.close();

  const video = (await page.video()!.path())!;
  const output = path.join(OUT, "marcar-habito.gif");
  execFileSync("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-ss",
    ready.toFixed(2),
    "-t",
    (ended - ready).toFixed(2),
    "-i",
    video,
    "-vf",
    "fps=15,scale=880:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=4",
    "-loop",
    "0",
    output,
  ]);
  rmSync(videoDir, { recursive: true, force: true });
  console.info(`GIF: ${(ended - ready).toFixed(1)} s, ${(statSync(output).size / 1024 / 1024).toFixed(2)} MB`);
}

async function main() {
  await prepareExampleAccount();
  const browser = await chromium.launch();
  try {
    for (const theme of ["light", "dark"] as const) {
      await logo(browser, theme);
      await home(browser, theme);
    }

    // Signed in once; the session is reused by the other captures.
    const login = await themedPage(browser, "dark");
    await signIn(login);
    const storageState = path.join(mkdtempSync(path.join(tmpdir(), "habithub-session-")), "state.json");
    await login.context().storageState({ path: storageState });
    await login.context().close();

    await gif(browser, storageState);

    // The habit page scrolled to "Perfil público": the README image preview and its code.
    const share = await themedPage(browser, "dark", DESKTOP, storageState);
    await share.goto("/painel");
    await share.getByRole("article", { name: "Ler" }).getByRole("link", { name: "Ler" }).click();
    const section = share.getByRole("region", { name: "Perfil público" });
    const preview = section.getByRole("img", { name: "Ler no HabitHub" });
    await preview.waitFor();
    // The preview for the other theme stays hidden (and lazy), so only the visible one counts.
    await share.waitForFunction(() =>
      [...document.querySelectorAll<HTMLImageElement>("img[alt='Ler no HabitHub']")].some(
        (img) => img.offsetParent !== null && img.complete && img.naturalWidth > 0,
      ),
    );
    await settle(share);
    // Same size as the habit page capture, starting at the section (it sits at the end
    // of the page, so scrolling cannot bring it to the top of the window).
    const top = await section.evaluate((element) => element.getBoundingClientRect().top + window.scrollY - 24);
    await share.screenshot({
      path: path.join(OUT, "codigo-readme-escuro.png"),
      fullPage: true,
      clip: { x: 0, y: Math.floor(top), ...GALLERY },
    });
    await share.context().close();

    const habit = await themedPage(browser, "light", DESKTOP, storageState);
    await habit.goto("/painel");
    await habit.getByRole("article", { name: "Ler" }).getByRole("link", { name: "Ler" }).click();
    await habit.getByRole("heading", { level: 1, name: "Ler" }).waitFor();
    await settle(habit);
    await habit.screenshot({ path: path.join(OUT, "habito-claro.png"), clip: { x: 0, y: 0, ...GALLERY } });
    await habit.context().close();

    const phone = await themedPage(browser, "dark", PHONE, storageState);
    await phone.goto("/painel");
    await phone.getByRole("region", { name: "Hábitos de hoje" }).waitFor();
    await settle(phone);
    // Down to the end of the "Tarefas do dia" card, not in the middle of the next one.
    const tasks = await phone.getByRole("region", { name: "Tarefas do dia" }).boundingBox();
    await phone.screenshot({
      path: path.join(OUT, "celular-escuro.png"),
      clip: { x: 0, y: 0, width: PHONE.width, height: Math.ceil(tasks!.y + tasks!.height + 24) },
    });
    await phone.context().close();
  } finally {
    await browser.close();
  }
  console.info(`Images saved in ${OUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
