import { expect, test, type Page } from "@playwright/test";

const prefix = process.env.CUIDAM_E2E_EMAIL_PREFIX ?? "cuidam-e2e+";
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const password = "CuidamE2e!2026";

async function signUp(page: Page, email: string) {
  await page.goto("/");
  await page.getByRole("link", { name: "Organizar nossa casa" }).click();
  await page.getByLabel("Seu nome").fill("Pessoa móvel E2E");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Continuar" }).click();
}

async function createHouse(page: Page) {
  await expect(page.getByRole("heading", { name: "Que nome vamos dar à sua casa?" })).toBeVisible();
  await page.getByLabel("Nome da casa").fill(`E2E ${runId} Casa móvel`);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "O que faz parte da casa?" })).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "Convide alguém, se fizer sentido." })).toBeVisible();
  await page.getByRole("button", { name: "Fazer depois" }).click();
  await page.getByRole("button", { name: "Ir para Hoje" }).click();
  await expect(page).toHaveURL(/\/today$/);
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth
  }));
  expect(dimensions.document, `overflow horizontal: ${dimensions.document}px em viewport de ${dimensions.viewport}px`).toBeLessThanOrEqual(dimensions.viewport + 2);
}

test("jornada principal mobile: filtrar por cômodo, navegar e concluir tarefa", async ({ browser }) => {
  test.setTimeout(150_000);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await context.newPage();

  try {
    await signUp(page, `${prefix}${runId}-mobile@example.com`);
    await createHouse(page);

    const navigation = page.getByRole("navigation", { name: "Navegação principal" });
    await expect(navigation.getByRole("link")).toHaveCount(4);
    for (const link of await navigation.getByRole("link").all()) {
      expect(await link.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    }

    const filters = page.getByRole("group", { name: "Filtrar tarefas por cômodo" });
    await expect(filters.getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "true");
    const kitchenFilter = filters.getByRole("button", { name: /Cozinha/ });
    expect(await kitchenFilter.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    await kitchenFilter.tap();
    await expect(kitchenFilter).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("heading", { name: "Cozinha" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await filters.getByRole("button", { name: "Todos" }).tap();
    await page.getByRole("button", { name: "Adicionar tarefa" }).tap();
    await page.getByLabel("Nome da tarefa").fill(`Tarefa móvel ${runId}`);
    await page.getByRole("button", { name: "Adicionar", exact: true }).tap();

    const taskCard = page.locator(".task-card").filter({ hasText: `Tarefa móvel ${runId}` });
    await expect(taskCard).toBeVisible();
    await taskCard.getByRole("button", { name: /Concluir/ }).tap();
    await expect(taskCard).toHaveCount(0);

    for (const [label, heading, route] of [
      ["Nós", "Quem cuida do quê?", "/nos"],
      ["Configurações", "Pessoas", "/casa"],
      ["Recompensas", "Para resgatar", "/rewards"]
    ]) {
      await navigation.getByRole("link", { name: label }).tap();
      await expect(page).toHaveURL(new RegExp(`${route}$`));
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  } finally {
    await context.close().catch(() => undefined);
  }
});
