import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { MockArea, MockHousehold, MockResponsibility, MockTask } from "@/lib/mock/store";
import { ensureCurrentOccurrences } from "@/lib/real/occurrences";

export function recurrenceFromLabel(label: string) {
  if (label === "Diária") return { recurrenceKind: "DAILY" as const, recurrenceInterval: 1, weeklyTarget: 1 };
  if (label === "3× por semana") return { recurrenceKind: "WEEKLY" as const, recurrenceInterval: 1, weeklyTarget: 3 };
  if (label === "Mensal") return { recurrenceKind: "MONTHLY" as const, recurrenceInterval: 1, weeklyTarget: 1 };
  return { recurrenceKind: "WEEKLY" as const, recurrenceInterval: 1, weeklyTarget: 1 };
}

export function recurrenceLabel(kind: string, interval: number, weeklyTarget: number) {
  if (kind === "DAILY") return "Diária";
  if (kind === "MONTHLY") return "Mensal";
  if (kind === "EVERY_N_WEEKS") return `A cada ${interval} semanas`;
  return weeklyTarget > 1 ? `${weeklyTarget}× por semana` : "Semanal";
}

export async function getRealContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const dbUser = await prisma.user.findUnique({
    where: { authProviderId: user.id },
    include: {
      memberships: { where: { status: "ACTIVE" } },
      activeHousehold: true
    }
  });
  if (!dbUser?.activeHousehold) return null;

  const membership = dbUser.memberships.find((item) => item.householdId === dbUser.activeHouseholdId);
  if (!membership) return null;
  return { user, dbUser, household: dbUser.activeHousehold, membership };
}

export async function getRealHouseholdSnapshot(): Promise<MockHousehold | null> {
  const context = await getRealContext();
  if (!context) return null;

  await ensureCurrentOccurrences(context.household.id, new Date(), context.household.timezone);
  const household = await prisma.household.findUnique({
    where: { id: context.household.id },
    include: {
      areas: { where: { status: "ACTIVE" }, orderBy: { sortOrder: "asc" } },
      invitations: { where: { status: "PENDING" }, orderBy: { createdAt: "desc" }, take: 1 },
      tasks: {
        include: {
          occurrences: { orderBy: { scheduledFor: "desc" }, take: 1 }
        },
        orderBy: { createdAt: "asc" }
      }
    }
  });
  if (!household) return null;

  const areas: MockArea[] = household.areas.map((area) => ({
    id: area.id,
    name: area.name,
    icon: area.icon ?? "🏡",
    sortOrder: area.sortOrder
  }));
  const tasks: MockTask[] = household.tasks.map((task) => {
    const occurrence = task.occurrences[0];
    let responsibility: MockResponsibility = "Outra pessoa";
    if (task.responsibilityType === "SHARED") responsibility = "Nós";
    else if (task.responsibleMemberId === context.membership.id) responsibility = "Você";
    return {
      id: task.id,
      name: task.name,
      areaId: task.areaId,
      responsibility,
      recurrence: recurrenceLabel(task.recurrenceKind, task.recurrenceInterval, task.weeklyTarget),
      load: task.load,
      completed: occurrence?.status === "COMPLETED" || Boolean(occurrence && occurrence.completedCount >= occurrence.targetCompletions),
      completedAt: occurrence?.completedAt?.toISOString(),
      archived: task.status === "ARCHIVED"
    };
  });

  return {
    id: household.id,
    name: household.name,
    ownerName: context.dbUser.name,
    ownerEmail: context.dbUser.email,
    areas,
    tasks,
    inviteEmail: household.invitations[0]?.email
  };
}
