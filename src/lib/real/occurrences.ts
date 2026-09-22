import { prisma } from "@/lib/prisma";
import { periodKeyForRecurrence } from "@/lib/real/recurrence";

export async function ensureCurrentOccurrences(householdId: string, date = new Date(), timeZone = "America/Sao_Paulo") {
  const tasks = await prisma.task.findMany({ where: { householdId, status: "ACTIVE" } });
  await prisma.$transaction(async (tx) => {
    for (const task of tasks) {
      const periodKey = periodKeyForRecurrence(task, date, timeZone);
      if (!periodKey) continue;
      // A period never carries unfinished work into the next one. Partial or
      // untouched occurrences become history instead of creating a debt queue.
      await tx.taskOccurrence.updateMany({
        where: { taskId: task.id, status: "PENDING", periodKey: { not: periodKey } },
        data: { status: "MISSED" }
      });
      await tx.taskOccurrence.upsert({
        where: { taskId_periodKey: { taskId: task.id, periodKey } },
        create: {
          taskId: task.id,
          periodKey,
          scheduledFor: date,
          targetCompletions: task.recurrenceKind === "WEEKLY" ? Math.max(1, task.weeklyTarget) : 1,
          responsibilityTypeSnapshot: task.responsibilityType,
          responsibleMemberIdSnapshot: task.responsibleMemberId,
          loadSnapshot: task.load
        },
        update: {}
      });
    }
  });
}

export async function ensureAllCurrentOccurrences(date = new Date()) {
  const households = await prisma.household.findMany({ select: { id: true, timezone: true } });
  for (const household of households) {
    await ensureCurrentOccurrences(household.id, date, household.timezone);
  }
  return households.length;
}
