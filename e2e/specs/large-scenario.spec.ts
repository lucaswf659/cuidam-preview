import { expect, test, type Browser, type Page } from "@playwright/test";
import { Prisma, PrismaClient } from "@prisma/client";
import scenario from "../fixtures/large-household.json";
import { periodKeyForRecurrence } from "../../src/lib/real/recurrence";

const prefix = process.env.CUIDAM_E2E_EMAIL_PREFIX ?? "cuidam-e2e+";
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const password = "CuidamE2e!2026";

async function signUp(page: Page, email: string, name: string) {
  await page.goto("/");
  await page.getByRole("link", { name: "Organizar nossa casa" }).click();
  await expect(page.getByRole("heading", { name: "Vamos deixar isso fácil." })).toBeVisible();
  await page.getByLabel("Seu nome").fill(name);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Continuar" }).click();
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

async function seedScenario(prisma: PrismaClient, email: string) {
  const dbUser = await prisma.user.findUniqueOrThrow({ where: { email } });
  const household = await prisma.household.findUniqueOrThrow({
    where: { id: dbUser.activeHouseholdId! },
    include: { memberships: { where: { status: "ACTIVE" }, include: { user: true } }, areas: true }
  });
  expect(household.memberships).toHaveLength(1);

  const areaIds = new Map(household.areas.map((area) => [area.name, area.id]));
  const missingAreas = scenario.areas.filter((area) => !areaIds.has(area.name));
  const maxSortOrder = await prisma.area.aggregate({ where: { householdId: household.id }, _max: { sortOrder: true } });
  for (const [index, area] of missingAreas.entries()) {
    const created = await prisma.area.create({
      data: {
        householdId: household.id,
        name: area.name,
        icon: area.icon,
        sortOrder: (maxSortOrder._max.sortOrder ?? -1) + index + 1
      }
    });
    areaIds.set(area.name, created.id);
  }
  const ownerMembership = household.memberships[0];
  const otherUser = await prisma.user.create({
    data: {
      authProviderId: `e2e-large-${runId}`,
      name: "Alex Teste",
      email: `${prefix}${runId}-scenario-member@example.com`,
      activeHouseholdId: household.id
    }
  });
  const otherMembership = await prisma.membership.create({ data: { householdId: household.id, userId: otherUser.id } });
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const onboardingTasks = await tx.task.findMany({ where: { householdId: household.id }, select: { id: true } });
    const onboardingTaskIds = onboardingTasks.map((task) => task.id);
    if (onboardingTaskIds.length) {
      await tx.occurrenceCompletion.deleteMany({ where: { occurrence: { taskId: { in: onboardingTaskIds } } } });
      await tx.taskOccurrence.deleteMany({ where: { taskId: { in: onboardingTaskIds } } });
      await tx.task.deleteMany({ where: { id: { in: onboardingTaskIds } } });
    }
    await tx.reward.deleteMany({ where: { householdId: household.id } });

    for (const task of scenario.tasks) {
      const targetCompletions = task.recurrence === "threeWeekly" ? 3 : 1;
      const recurrenceKind = task.recurrence === "daily" ? "DAILY" : task.recurrence === "monthly" ? "MONTHLY" : "WEEKLY";
      const responsibilityType = task.responsibility === "shared" ? "SHARED" : "PERSON";
      const responsibleMemberId = task.responsibility === "owner" ? ownerMembership.id : task.responsibility === "other" ? otherMembership.id : null;
      const recurrenceInput = {
        recurrenceKind,
        recurrenceInterval: 1,
        weeklyTarget: targetCompletions,
        recurrenceAnchor: now
      };
      const periodKey = periodKeyForRecurrence(recurrenceInput, now, scenario.timezone);
      if (!periodKey) throw new Error(`Sem período atual para a tarefa ${task.name}`);

      const completions = task.completed
        ? Array.from({ length: targetCompletions }, (_, index) => ({
          completedById: dbUser.id,
          completedAt: now,
          starsGranted: index === targetCompletions - 1 ? task.load * targetCompletions : 0
        }))
        : Array.from({ length: task.partial ?? 0 }, () => ({ completedById: dbUser.id, completedAt: now, starsGranted: 0 }));

      await tx.task.create({
        data: {
          householdId: household.id,
          areaId: areaIds.get(task.area)!,
          name: task.name,
          responsibilityType,
          responsibleMemberId,
          recurrenceKind,
          recurrenceInterval: 1,
          weeklyTarget: targetCompletions,
          recurrenceAnchor: now,
          instructions: task.instructions,
          load: task.load,
          occurrences: {
            create: {
              periodKey,
              scheduledFor: now,
              status: task.completed ? "COMPLETED" : "PENDING",
              targetCompletions,
              completedCount: task.completed ? targetCompletions : task.partial ?? 0,
              responsibilityTypeSnapshot: responsibilityType,
              responsibleMemberIdSnapshot: responsibleMemberId,
              loadSnapshot: task.load,
              completedAt: task.completed ? now : null,
              starsGrantedSnapshot: task.completed ? task.load * targetCompletions : 0,
              ...(task.claimed ? { claimedByUserId: dbUser.id, claimedAt: now } : {}),
              completions: completions.length ? { create: completions } : undefined
            }
          }
        }
      });
    }

    await tx.reward.createMany({
      data: scenario.rewards.map((reward) => ({ householdId: household.id, name: reward.name, cost: reward.cost, recipientType: "HOUSEHOLD" }))
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, maxWait: 10_000, timeout: 45_000 });

  return { householdName: household.name };
}

test("cenário com muitas tarefas: navegação, estados e tempo de resposta", async ({ browser }: { browser: Browser }) => {
  test.setTimeout(150_000);
  const email = `${prefix}${runId}-large-scenario@example.com`;
  const context = await browser.newContext();
  const page = await context.newPage();
  const prisma = new PrismaClient();

  try {
    await signUp(page, email, "Sam Teste");
    await createHouse(page, `E2E ${runId} Cenário grande`);
    await seedScenario(prisma, email);

    const expectedAreas = scenario.areas.map((area) => area.name);
    const expectedTasks = scenario.tasks.map((task) => task.name);
    const expectedRewards = scenario.rewards.map((reward) => reward.name);
    const routeChecks: Record<string, () => Promise<void>> = {
      "/today": async () => {
        await expect(page.locator(".task-card").first()).toBeVisible();
        expect(await page.locator(".task-card").count()).toBeGreaterThan(10);
      },
      "/nos": async () => {
        await expect(page.getByRole("heading", { name: "Quem cuida do quê?" })).toBeVisible();
        for (const name of expectedTasks) await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
      },
      "/casa": async () => {
        await expect(page.locator(".settings-group")).toHaveCount(expectedAreas.length);
        for (const name of expectedAreas) await expect(page.getByText(name, { exact: true })).toBeVisible();
      },
      "/rewards": async () => {
        await expect(page.getByRole("heading", { name: "Para resgatar" })).toBeVisible();
        await expect(page.locator(".reward-card")).toHaveCount(expectedRewards.length);
        for (const name of expectedRewards) await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
      }
    };

    // First navigation warms the local Next.js dev server; its compile time is not included below.
    for (const [route, ready] of Object.entries(routeChecks)) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await ready();
    }

    const samples: Record<string, Array<{ ttfb: number; html: number; ui: number }>> = {};
    for (const route of Object.keys(routeChecks)) samples[route] = [];
    for (let iteration = 0; iteration < 3; iteration += 1) {
      for (const [route, ready] of Object.entries(routeChecks)) {
        const startedAt = performance.now();
        const response = await page.goto(route, { waitUntil: "domcontentloaded" });
        expect(response?.ok()).toBeTruthy();
        await ready();
        const ui = performance.now() - startedAt;
        const timing = await page.evaluate(() => {
          const entry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
          return entry ? { ttfb: entry.responseStart - entry.requestStart, html: entry.responseEnd - entry.requestStart } : null;
        });
        expect(timing).not.toBeNull();
        samples[route].push({ ttfb: timing!.ttfb, html: timing!.html, ui });
      }
    }

    const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
    for (const [route, values] of Object.entries(samples)) {
      console.info(`[E2E perf] ${route} | TTFB ${Math.round(median(values.map((item) => item.ttfb)))} ms | HTML ${Math.round(median(values.map((item) => item.html)))} ms | UI pronta ${Math.round(median(values.map((item) => item.ui)))} ms (mediana de 3)`);
    }

    await page.goto("/today", { waitUntil: "domcontentloaded" });
    const sharedTask = scenario.tasks.find((task) => task.name === "Recolher objetos");
    if (!sharedTask) throw new Error("O fixture precisa ter uma tarefa compartilhada pendente para medir claim e conclusão.");
    const taskCard = page.locator(".task-card").filter({ hasText: sharedTask.name });
    await expect(taskCard).toBeVisible();

    const markNextClick = (markName: string, buttonName: string) => page.evaluate(({ markName, buttonName, taskName }) => {
      const card = [...document.querySelectorAll<HTMLElement>(".task-card")].find((element) => element.innerText.includes(taskName));
      const button = [...(card?.querySelectorAll<HTMLButtonElement>("button") ?? [])].find((element) => element.innerText.includes(buttonName));
      if (!button) throw new Error(`Não encontrei o botão ${buttonName} em ${taskName}`);
      button.addEventListener("click", () => performance.mark(markName), { once: true });
    }, { markName, buttonName, taskName: sharedTask.name });
    const msSinceMark = (markName: string) => page.evaluate((name) => {
      const mark = performance.getEntriesByName(name).at(-1);
      if (!mark) throw new Error(`A marca ${name} não foi registrada.`);
      return performance.now() - mark.startTime;
    }, markName);

    await markNextClick("cuidam-claim-click", "Vou cuidar");
    const claimResponsePromise = page.waitForResponse((response) => response.url().endsWith("/api/tasks") && response.request().method() === "PATCH");
    await taskCard.getByRole("button", { name: "Vou cuidar" }).click();
    await expect(taskCard.getByRole("button", { name: /Concluir/ })).toBeVisible();
    const claimUiMs = await msSinceMark("cuidam-claim-click");
    const claimResponse = await claimResponsePromise;
    expect(claimResponse.ok()).toBeTruthy();
    await claimResponse.finished();
    const claimTiming = claimResponse.request().timing();

    await markNextClick("cuidam-complete-click", "Concluir");
    const completeResponsePromise = page.waitForResponse((response) => response.url().endsWith("/api/tasks") && response.request().method() === "PATCH");
    await taskCard.getByRole("button", { name: /Concluir/ }).click();
    await expect(taskCard).toHaveCount(0);
    const completeUiMs = await msSinceMark("cuidam-complete-click");
    const completeResponse = await completeResponsePromise;
    expect(completeResponse.ok()).toBeTruthy();
    await completeResponse.finished();
    const completeTiming = completeResponse.request().timing();

    console.info(`[E2E ação] Vou cuidar | API ${Math.round(claimTiming.responseEnd - claimTiming.requestStart)} ms | botão Concluir atualizado ${Math.round(claimUiMs)} ms`);
    console.info(`[E2E ação] Concluir | API ${Math.round(completeTiming.responseEnd - completeTiming.requestStart)} ms | tarefa removida de Hoje ${Math.round(completeUiMs)} ms`);
    console.info(`[E2E volume] ${scenario.areas.length} áreas | ${scenario.tasks.length} tarefas | ${scenario.tasks.filter((task) => task.completed).length} concluídas | ${scenario.tasks.filter((task) => task.partial).length} parciais | ${scenario.rewards.length} recompensas | 2 membros`);
  } finally {
    await prisma.$disconnect();
    await context.close().catch(() => undefined);
  }
});
