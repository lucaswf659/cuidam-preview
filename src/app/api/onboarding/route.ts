import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { mockHouseholdForSession, saveMockHousehold } from "@/lib/mock/store";
import { recurrenceFromLabel } from "@/lib/real/household";
import { periodKeyForRecurrence } from "@/lib/real/recurrence";
import { onboardingPayloadSchema } from "@/lib/real/onboarding-schema";

const mockMode = process.env.NEXT_PUBLIC_CUIDAM_MOCK !== "false";

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user && user.email ? user : null;
}

export async function GET() {
  if (mockMode) {
    const household = mockHouseholdForSession((await cookies()).get("cuidam_mock_session")?.value);
    return NextResponse.json({ household: household ? { id: household.id, name: household.name, areas: household.areas } : null });
  }
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { authProviderId: user.id },
    include: { activeHousehold: { include: { areas: { where: { status: "ACTIVE" }, orderBy: { sortOrder: "asc" } } } } }
  });
  if (!dbUser?.activeHousehold) return NextResponse.json({ household: null });
  return NextResponse.json({ household: { id: dbUser.activeHousehold.id, name: dbUser.activeHousehold.name, areas: dbUser.activeHousehold.areas } });
}

export async function POST(request: Request) {
  const parsed = onboardingPayloadSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Confira os dados informados." }, { status: 400 });

  if (mockMode) {
    const sessionId = (await cookies()).get("cuidam_mock_session")?.value;
    if (!sessionId) return NextResponse.json({ error: "Sua sessão mock expirou. Volte e entre novamente." }, { status: 401 });
    const existing = mockHouseholdForSession(sessionId);
    if (existing) return NextResponse.json({ householdId: existing.id, created: false }, { status: 200 });
    const areas = parsed.data.areas.map((area, index) => ({ ...area, sortOrder: index }));
    const tasks = parsed.data.tasks.map((task, index) => ({
      ...task,
      id: `mock-task-${task.areaId}-${index}`,
      completed: false
    }));
    const household = saveMockHousehold(sessionId, {
      id: `mock-household-${Date.now()}`,
      name: parsed.data.houseName,
      ownerName: parsed.data.name,
      ownerEmail: decodeURIComponent(sessionId.replace("mock-", "")),
      memberCount: 1,
      areas,
      tasks
    });
    return NextResponse.json({ householdId: household.id, created: true }, { status: 201 });
  }

  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });

  const result = await prisma.$transaction(async (tx) => {
    const dbUser = await tx.user.upsert({
      where: { authProviderId: user.id },
      update: { name: parsed.data.name, email: user.email! },
      create: { authProviderId: user.id, name: parsed.data.name, email: user.email! }
    });
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${dbUser.id} FOR UPDATE`;
    const lockedUser = await tx.user.findUnique({ where: { id: dbUser.id } });
    const existing = lockedUser?.activeHouseholdId
      ? await tx.household.findUnique({ where: { id: lockedUser.activeHouseholdId } })
      : null;
    if (existing) return { household: existing, created: false };

    const household = await tx.household.create({ data: { name: parsed.data.houseName, timezone: "America/Sao_Paulo" } });
    const membership = await tx.membership.create({ data: { householdId: household.id, userId: dbUser.id, role: "MEMBER", status: "ACTIVE" } });
    const createdAreas = parsed.data.areas.length
      ? await tx.area.createManyAndReturn({
        data: parsed.data.areas.map((area, sortOrder) => ({
          householdId: household.id,
          name: area.name,
          icon: area.icon,
          sortOrder,
          status: "ACTIVE" as const
        })),
        select: { id: true, sortOrder: true }
      })
      : [];
    const areaIdBySortOrder = new Map(createdAreas.map((area) => [area.sortOrder, area.id]));
    const now = new Date();
    const taskSeeds = parsed.data.areas.flatMap((area, index) => {
      const areaId = areaIdBySortOrder.get(index);
      if (!areaId) throw new Error("An onboarding area was not returned after creation.");

      return parsed.data.tasks.filter((task) => task.areaId === area.id).map((suggestion) => {
        const recurrence = recurrenceFromLabel(suggestion.recurrence);
        const responsibilityType = suggestion.responsibility === "Nós" ? "SHARED" as const : "PERSON" as const;
        const responsibleMemberId = suggestion.responsibility === "Você" ? membership.id : null;
        return {
          key: JSON.stringify([areaId, suggestion.name]),
          recurrence,
          responsibilityType,
          responsibleMemberId,
          load: suggestion.load,
          data: {
            householdId: household.id,
            areaId,
            name: suggestion.name,
            responsibilityType,
            responsibleMemberId,
            ...recurrence,
            recurrenceAnchor: now,
            load: suggestion.load,
            status: "ACTIVE" as const
          }
        };
      });
    });
    const createdTasks = taskSeeds.length
      ? await tx.task.createManyAndReturn({
        data: taskSeeds.map((seed) => seed.data),
        select: { id: true, areaId: true, name: true }
      })
      : [];
    const taskSeedByKey = new Map(taskSeeds.map((seed) => [seed.key, seed]));
    const occurrenceData = createdTasks.map((task) => {
      const seed = taskSeedByKey.get(JSON.stringify([task.areaId, task.name]));
      if (!seed) throw new Error("An onboarding task was not returned after creation.");

      return {
        taskId: task.id,
        periodKey: periodKeyForRecurrence({ ...seed.recurrence, recurrenceAnchor: now }, now, "America/Sao_Paulo")!,
        scheduledFor: now,
        responsibilityTypeSnapshot: seed.responsibilityType,
        responsibleMemberIdSnapshot: seed.responsibleMemberId,
        loadSnapshot: seed.load
      };
    });
    if (occurrenceData.length) await tx.taskOccurrence.createMany({ data: occurrenceData });
    await tx.user.update({ where: { id: dbUser.id }, data: { activeHouseholdId: household.id } });
    return { household, created: true };
  });

  return NextResponse.json({ householdId: result.household.id, created: result.created }, { status: result.created ? 201 : 200 });
}
