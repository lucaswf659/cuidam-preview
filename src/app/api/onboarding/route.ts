import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { mockHouseholdForSession, saveMockHousehold } from "@/lib/mock/store";
import { recurrenceFromLabel } from "@/lib/real/household";
import { periodKeyForRecurrence } from "@/lib/real/recurrence";

const mockMode = process.env.NEXT_PUBLIC_CUIDAM_MOCK !== "false";

export const onboardingPayloadSchema = z.object({
  name: z.string().trim().min(1).max(80),
  houseName: z.string().trim().min(1).max(80),
  areas: z.array(z.object({ id: z.string().max(40), name: z.string().max(80), icon: z.string().max(12) })).max(20)
});

const suggestedTasks: Record<string, Array<{ name: string; responsibility: "Você" | "Nós"; recurrence: string; load: number }>> = {
  kitchen: [
    { name: "Limpar bancada", responsibility: "Você", recurrence: "Diária", load: 2 },
    { name: "Esvaziar lava-louças", responsibility: "Nós", recurrence: "Diária", load: 2 },
    { name: "Limpar geladeira", responsibility: "Nós", recurrence: "Mensal", load: 3 }
  ],
  living: [
    { name: "Aspirar sala", responsibility: "Nós", recurrence: "Semanal", load: 2 },
    { name: "Organizar sala", responsibility: "Você", recurrence: "3× por semana", load: 1 }
  ],
  bedroom: [
    { name: "Trocar roupa de cama", responsibility: "Você", recurrence: "Semanal", load: 2 },
    { name: "Aspirar quartos", responsibility: "Nós", recurrence: "Semanal", load: 2 }
  ],
  bathroom: [
    { name: "Limpar banheiro", responsibility: "Você", recurrence: "Semanal", load: 3 },
    { name: "Repor papel higiênico", responsibility: "Você", recurrence: "Semanal", load: 1 },
    { name: "Limpar espelho", responsibility: "Nós", recurrence: "Semanal", load: 1 }
  ],
  office: [{ name: "Organizar mesa", responsibility: "Você", recurrence: "Semanal", load: 1 }],
  pets: [
    { name: "Alimentar pets", responsibility: "Nós", recurrence: "Diária", load: 2 },
    { name: "Comprar ração", responsibility: "Você", recurrence: "Mensal", load: 2 }
  ]
};

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
    const tasks = areas.flatMap((area) => (suggestedTasks[area.id] ?? []).map((task, index) => ({
      ...task,
      id: `mock-task-${area.id}-${index}`,
      areaId: area.id,
      completed: false
    })));
    const household = saveMockHousehold(sessionId, {
      id: `mock-household-${Date.now()}`,
      name: parsed.data.houseName,
      ownerName: parsed.data.name,
      ownerEmail: decodeURIComponent(sessionId.replace("mock-", "")),
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

      return (suggestedTasks[area.id] ?? []).map((suggestion) => {
        const recurrence = recurrenceFromLabel(suggestion.recurrence);
        const responsibilityType = suggestion.responsibility === "Nós" ? "SHARED" as const : "PERSON" as const;
        return {
          key: JSON.stringify([areaId, suggestion.name]),
          recurrence,
          responsibilityType,
          responsibleMemberId: responsibilityType === "PERSON" ? membership.id : null,
          load: suggestion.load,
          data: {
            householdId: household.id,
            areaId,
            name: suggestion.name,
            responsibilityType,
            responsibleMemberId: responsibilityType === "PERSON" ? membership.id : null,
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
