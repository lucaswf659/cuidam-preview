import { expect, test, type Browser, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { periodKeyForRecurrence } from "../../src/lib/real/recurrence";

const prefix = process.env.CUIDAM_E2E_EMAIL_PREFIX ?? "cuidam-e2e+";
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const password = "CuidamE2e!2026";

test("papel anon do PostgreSQL não consegue ler dados de casas", async () => {
  const prisma = new PrismaClient();
  const marker = `E2E RLS ${runId}`;
  let householdId: string | undefined;

  try {
    const household = await prisma.household.create({ data: { name: marker, timezone: "America/Sao_Paulo" } });
    householdId = household.id;
    const visibleRows = await prisma.$transaction(async (tx) => {
      // Simulate Supabase's Data API table grant, then verify RLS itself blocks rows.
      await tx.$executeRawUnsafe('GRANT SELECT ON TABLE public."Household" TO anon');
      await tx.$executeRawUnsafe("SET LOCAL ROLE anon");
      const rows = await tx.household.findMany({ where: { name: marker }, select: { id: true } });
      await tx.$executeRawUnsafe("RESET ROLE");
      await tx.$executeRawUnsafe('REVOKE SELECT ON TABLE public."Household" FROM anon');
      return rows;
    });
    expect(visibleRows).toEqual([]);
  } finally {
    if (householdId) await prisma.household.delete({ where: { id: householdId } });
    await prisma.$disconnect();
  }
});

async function signUp(page: Page, email: string, name: string) {
  await page.goto("/");
  await page.getByRole("link", { name: "Organizar nossa casa" }).click();
  await expect(page.getByRole("heading", { name: "Vamos deixar isso fácil." })).toBeVisible();
  await page.getByLabel("Seu nome").fill(name);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Continuar" }).click();
}

async function openLoginForm(page: Page) {
  await page.goto("/entrar?mode=login");
  const loginHeading = page.getByRole("heading", { name: "Que bom ter você de volta." });
  await expect(loginHeading).toBeVisible();
}

async function createHouse(page: Page, name: string) {
  await expect(page.getByRole("heading", { name: "Que nome vamos dar à sua casa?" })).toBeVisible();
  await page.getByLabel("Nome da casa").fill(name);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "O que faz parte da casa?" })).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "Convide alguém, se fizer sentido." })).toBeVisible();
  await page.getByRole("button", { name: "Fazer depois" }).click();
  await page.getByRole("button", { name: "Ir para Hoje" }).click();
  await expect(page).toHaveURL(/\/today$/);
}

async function addTask(page: Page, name: string, responsibility: "Você" | "Nós") {
  const responsePromise = page.waitForResponse((response) => response.url().endsWith("/api/tasks") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Adicionar tarefa" }).click();
  await page.getByLabel("Nome da tarefa").fill(name);
  await page.getByLabel("Responsabilidade").selectOption(responsibility);
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.task.load).toBe(3);
  await expect(page.locator(".task-card").filter({ hasText: name })).toBeVisible();
  return body.task.id as string;
}

async function api(page: Page, url: string, method: string, body?: unknown) {
  return page.evaluate(async ({ url, method, body }) => {
    const response = await fetch(url, { method, headers: { "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json() };
  }, { url, method, body });
}

test("conta, casa, tarefa compartilhada, convite, isolamento e resgate idempotente", async ({ browser }: { browser: Browser }) => {
  test.setTimeout(120_000);
  const ownerEmail = `${prefix}${runId}-owner@example.com`;
  const guestEmail = `${prefix}${runId}-guest@example.com`;
  const isolatedEmail = `${prefix}${runId}-isolated@example.com`;
  const owner = await browser.newContext();
  const guest = await browser.newContext();
  const isolated = await browser.newContext();
  const ownerPage = await owner.newPage();
  const guestPage = await guest.newPage();
  const isolatedPage = await isolated.newPage();

  try {
    await signUp(ownerPage, ownerEmail, "Pessoa E2E");
    await createHouse(ownerPage, `E2E ${runId} Casa A`);
    await expect(ownerPage.getByRole("heading", { name: /Pessoa ☀️/ })).toBeVisible();
    await ownerPage.getByRole("button", { name: "Sair" }).click();
    await expect(ownerPage).toHaveURL(/\/$/);
    await openLoginForm(ownerPage);
    await ownerPage.getByLabel("E-mail").fill(ownerEmail);
    await ownerPage.getByLabel("Senha").fill(password);
    await ownerPage.getByRole("button", { name: "Entrar" }).click();
    await expect(ownerPage).toHaveURL(/\/today$/);
    await expect(ownerPage.getByRole("heading", { name: /Pessoa ☀️/ })).toBeVisible();

    const onboarding = await api(ownerPage, "/api/onboarding", "GET");
    const earnedTaskName = `E2E tarefa estrelas ${runId}`;
    const earnedTaskResponse = await api(ownerPage, "/api/tasks", "POST", {
      name: earnedTaskName,
      areaId: onboarding.body.household.areas[0].id,
      responsibility: "Você",
      recurrence: "Diária",
      load: 5
    });
    expect(earnedTaskResponse.status).toBe(201);
    const earnedTaskId = earnedTaskResponse.body.task.id as string;
    await ownerPage.reload();
    await ownerPage.locator(".task-card").filter({ hasText: earnedTaskName }).getByRole("button", { name: /Concluir/ }).click();
    await expect(ownerPage.locator(".task-card").filter({ hasText: earnedTaskName })).toHaveCount(0);

    const sharedTaskId = await addTask(ownerPage, `E2E tarefa compartilhada ${runId}`, "Nós");
    await ownerPage.getByRole("link", { name: "Configurações" }).click();
    await ownerPage.getByLabel("E-mail", { exact: true }).fill(guestEmail);
    await ownerPage.getByRole("button", { name: "Gerar link do convite" }).click();
    await expect(ownerPage.getByRole("status")).toContainText("Link do convite pronto");
    const inviteUrl = await ownerPage.getByLabel("Link do convite").inputValue();
    expect(inviteUrl).toContain("/convite/");
    const inviteToken = new URL(inviteUrl).pathname.split("/").filter(Boolean).at(-1);
    expect(inviteToken).toBeTruthy();
    const inviteCheck = await api(ownerPage, `/api/invite/${encodeURIComponent(inviteToken!)}`, "GET");
    expect(inviteCheck.status).toBe(200);

    await guestPage.goto(inviteUrl);
    await expect(guestPage.getByRole("heading", { name: /Entre para cuidar da/ })).toBeVisible();
    await guestPage.getByLabel("Seu nome").fill("Pessoa convidada E2E");
    await guestPage.getByLabel("E-mail").fill(guestEmail);
    await guestPage.getByLabel("Senha").fill(password);
    await guestPage.getByRole("button", { name: "Criar conta e entrar" }).click();
    await expect(guestPage.getByRole("heading", { name: "Agora vocês cuidam juntos." })).toBeVisible();
    await guestPage.getByRole("button", { name: "Ir para Hoje" }).click();
    await expect(guestPage).toHaveURL(/\/today$/);

    const claims = await Promise.all([
      api(ownerPage, "/api/tasks", "PATCH", { taskId: sharedTaskId, action: "claim" }),
      api(guestPage, "/api/tasks", "PATCH", { taskId: sharedTaskId, action: "claim" })
    ]);
    expect(claims.map((result) => result.status).sort()).toEqual([200, 409]);

    const ownerRewardCreate = await api(ownerPage, "/api/rewards", "POST", { name: `E2E recompensa ${runId}`, cost: 5, recipientType: "HOUSEHOLD" });
    expect(ownerRewardCreate.status).toBe(201);
    const rewardId = ownerRewardCreate.body.reward.id as string;
    const idempotencyKey = `e2e-${runId}-same-redemption-key`;
    const redemptions = await Promise.all([
      api(ownerPage, "/api/rewards", "PATCH", { rewardId, action: "redeem", idempotencyKey }),
      api(guestPage, "/api/rewards", "PATCH", { rewardId, action: "redeem", idempotencyKey })
    ]);
    expect(redemptions.map((result) => result.status)).toEqual([200, 200]);
    expect(redemptions[0].body.redemption.id).toBe(redemptions[1].body.redemption.id);
    const rewardSnapshot = await api(ownerPage, "/api/rewards", "GET");
    expect(rewardSnapshot.body.history.filter((item: { id: string }) => item.id === redemptions[0].body.redemption.id)).toHaveLength(1);
    expect(rewardSnapshot.body.balance).toBe(0);

    await signUp(isolatedPage, isolatedEmail, "Pessoa isolada E2E");
    await createHouse(isolatedPage, `E2E ${runId} Casa B`);
    const foreignTask = await api(isolatedPage, "/api/tasks", "PATCH", { taskId: earnedTaskId, action: "archive" });
    expect(foreignTask.status).toBe(404);
    const foreignArea = await api(isolatedPage, "/api/tasks", "POST", {
      name: `E2E tarefa fora da casa ${runId}`,
      areaId: (await api(ownerPage, "/api/onboarding", "GET")).body.household.areas[0].id,
      responsibility: "Você", recurrence: "Diária", load: 1
    });
    expect(foreignArea.status).toBe(400);
  } finally {
    await Promise.all([owner, guest, isolated].map((context) => context.close().catch(() => undefined)));
  }
});

test("pessoa pode sair da casa atual e aceitar convite de outra casa", async ({ browser }: { browser: Browser }) => {
  test.setTimeout(150_000);
  const inviterEmail = `${prefix}${runId}-switch-inviter@example.com`;
  const invitedEmail = `${prefix}${runId}-switch-invited@example.com`;
  const inviterContext = await browser.newContext();
  const invitedContext = await browser.newContext();
  const inviterPage = await inviterContext.newPage();
  const invitedPage = await invitedContext.newPage();
  const prisma = new PrismaClient();
  let sharedHouseId: string | undefined;

  try {
    await signUp(inviterPage, inviterEmail, "Pessoa que convida E2E");
    await createHouse(inviterPage, `E2E ${runId} Casa para convite`);
    await inviterPage.getByRole("link", { name: "Configurações" }).click();
    await inviterPage.getByLabel("E-mail", { exact: true }).fill(invitedEmail);
    await inviterPage.getByRole("button", { name: "Gerar link do convite" }).click();
    await expect(inviterPage.getByRole("status")).toContainText("Link do convite pronto");
    const inviteUrl = await inviterPage.getByLabel("Link do convite").inputValue();

    await signUp(invitedPage, invitedEmail, "Pessoa que troca de casa E2E");
    await createHouse(invitedPage, `E2E ${runId} Casa atual`);
    await invitedPage.goto(inviteUrl);
    await expect(invitedPage.locator("p[role=alert]")).toContainText("saia da casa atual em Configurações e abra o link novamente");

    await invitedPage.goto("/casa");
    await invitedPage.getByRole("button", { name: "Sair da casa" }).click();
    await expect(invitedPage.getByRole("alertdialog").getByRole("heading", { name: "Sair de E2E" })).toBeVisible();
    await invitedPage.getByRole("alertdialog").getByRole("button", { name: "Sair da casa" }).click();
    await expect(invitedPage).toHaveURL(/\/entrar\?mode=login$/);
    await expect(invitedPage.getByRole("form", { name: "Ou volte para uma casa anterior" }).getByRole("combobox")).not.toHaveValue("");

    await invitedPage.goto(inviteUrl);
    await expect(invitedPage.getByRole("heading", { name: "Agora vocês cuidam juntos." })).toBeVisible();
    await invitedPage.getByRole("button", { name: "Ir para Hoje" }).click();
    await expect(invitedPage).toHaveURL(/\/today$/);

    const sharedHouse = await api(invitedPage, "/api/onboarding", "GET");
    sharedHouseId = sharedHouse.body.household.id as string;
    await inviterPage.goto("/casa");
    await inviterPage.getByRole("button", { name: "Sair da casa" }).click();
    await inviterPage.getByRole("alertdialog").getByRole("button", { name: "Sair da casa" }).click();
    await expect(inviterPage).toHaveURL(/\/entrar\?mode=login$/);
    await expect(prisma.household.findUniqueOrThrow({ where: { id: sharedHouseId } })).resolves.toMatchObject({ status: "ACTIVE" });

    await invitedPage.goto("/casa");
    await invitedPage.getByRole("button", { name: "Sair da casa" }).click();
    await invitedPage.getByRole("alertdialog").getByRole("button", { name: "Sair da casa" }).click();
    await expect(invitedPage).toHaveURL(/\/entrar\?mode=login$/);
    await expect(prisma.household.findUniqueOrThrow({ where: { id: sharedHouseId } })).resolves.toMatchObject({ status: "INACTIVE" });
    await invitedPage.getByRole("form", { name: "Ou volte para uma casa anterior" }).getByRole("combobox").selectOption({ label: `E2E ${runId} Casa para convite` });
    const reopenButton = invitedPage.getByRole("button", { name: "Reabrir casa" });
    await expect(reopenButton).toBeEnabled();
    const [reactivationResult] = await Promise.all([
      invitedPage.waitForResponse((response) => response.url().includes("/api/household/reactivate") && response.request().method() === "POST", { timeout: 10_000 }),
      reopenButton.click()
    ]);
    expect(reactivationResult.status()).toBe(303);
    await expect(invitedPage).toHaveURL(/\/today$/);
    await expect(prisma.household.findUniqueOrThrow({ where: { id: sharedHouseId } })).resolves.toMatchObject({ status: "ACTIVE" });
  } finally {
    await prisma.$disconnect();
    await Promise.all([inviterContext, invitedContext].map((context) => context.close().catch(() => undefined)));
  }
});

test("virada de período marca pendências como perdidas e preserva snapshots ao editar e arquivar", async ({ browser }: { browser: Browser }) => {
  const email = `${prefix}${runId}-recurrence@example.com`;
  const owner = await browser.newContext();
  const page = await owner.newPage();
  const prisma = new PrismaClient();

  try {
    await signUp(page, email, "Pessoa recorrência E2E");
    await createHouse(page, `E2E ${runId} Recorrência`);

    const onboarding = await api(page, "/api/onboarding", "GET");
    expect(onboarding.status).toBe(200);
    const areaId = onboarding.body.household.areas[0].id as string;
    const name = `E2E tarefa de período ${runId}`;
    const created = await api(page, "/api/tasks", "POST", {
      name,
      areaId,
      responsibility: "Você",
      recurrence: "Diária",
      load: 4
    });
    expect(created.status).toBe(201);
    const taskId = created.body.task.id as string;
    const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
    const priorOccurrence = await prisma.taskOccurrence.findFirstOrThrow({ where: { taskId } });
    const expectedCurrentPeriod = periodKeyForRecurrence(task, new Date(), "America/Sao_Paulo");
    expect(expectedCurrentPeriod).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const previousDate = new Date(`${expectedCurrentPeriod}T12:00:00.000Z`);
    previousDate.setUTCDate(previousDate.getUTCDate() - 1);
    const previousPeriod = periodKeyForRecurrence(task, previousDate, "America/Sao_Paulo");
    expect(previousPeriod).not.toBe(expectedCurrentPeriod);
    await prisma.taskOccurrence.update({
      where: { id: priorOccurrence.id },
      data: { periodKey: previousPeriod!, scheduledFor: previousDate, status: "PENDING" }
    });

    const edited = await api(page, "/api/tasks", "PATCH", {
      taskId,
      action: "edit",
      name: `${name} editada`,
      areaId,
      responsibility: "Nós",
      recurrence: "Diária",
      load: 1
    });
    expect(edited.status).toBe(200);

    const occurrences = await prisma.taskOccurrence.findMany({ where: { taskId }, orderBy: { scheduledFor: "asc" } });
    expect(occurrences).toHaveLength(2);
    const missed = occurrences.find((occurrence) => occurrence.periodKey === previousPeriod);
    const current = occurrences.find((occurrence) => occurrence.periodKey === expectedCurrentPeriod);
    expect(missed).toMatchObject({
      status: "MISSED",
      responsibilityTypeSnapshot: "PERSON",
      responsibleMemberIdSnapshot: task.responsibleMemberId,
      loadSnapshot: 4,
      completedCount: 0
    });
    expect(current).toMatchObject({
      status: "PENDING",
      responsibilityTypeSnapshot: "SHARED",
      responsibleMemberIdSnapshot: null,
      loadSnapshot: 1,
      completedCount: 0
    });

    const repeatedEdit = await api(page, "/api/tasks", "PATCH", {
      taskId,
      action: "edit",
      name: `${name} editada`,
      areaId,
      responsibility: "Nós",
      recurrence: "Diária",
      load: 1
    });
    expect(repeatedEdit.status).toBe(200);
    await expect(prisma.taskOccurrence.count({ where: { taskId } })).resolves.toBe(2);

    const archived = await api(page, "/api/tasks", "PATCH", { taskId, action: "archive" });
    expect(archived.status).toBe(200);
    await expect(prisma.task.findUniqueOrThrow({ where: { id: taskId } })).resolves.toMatchObject({ status: "ARCHIVED" });
    await expect(prisma.taskOccurrence.count({ where: { taskId } })).resolves.toBe(2);
    await page.goto("/today");
    await expect(page.locator(".task-card").filter({ hasText: name })).toHaveCount(0);
  } finally {
    await prisma.$disconnect();
    await owner.close().catch(() => undefined);
  }
});

