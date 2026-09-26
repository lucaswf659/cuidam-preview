import { prisma } from "@/lib/prisma";
import { periodKeyForRecurrence } from "@/lib/real/recurrence";

export async function ensureCurrentOccurrences(householdId: string, date = new Date(), timeZone = "America/Sao_Paulo") {
  const tasks = await prisma.task.findMany({ where: { householdId, status: "ACTIVE" } });
  const currentTasks = tasks.flatMap((task) => {
    const periodKey = periodKeyForRecurrence(task, date, timeZone);
    return periodKey ? [{ task, periodKey }] : [];
  });
  if (!currentTasks.length) return;

  await prisma.$transaction(async (tx) => {
    // A period never carries unfinished work into the next one. Partial or
    // untouched occurrences become history instead of creating a debt queue.
    await tx.taskOccurrence.updateMany({
      where: {
        status: "PENDING",
        OR: currentTasks.map(({ task, periodKey }) => ({
          taskId: task.id,
          periodKey: { not: periodKey }
        }))
      },
      data: { status: "MISSED" }
    });

    // The unique (taskId, periodKey) key makes this safe to run concurrently.
    await tx.taskOccurrence.createMany({
      data: currentTasks.map(({ task, periodKey }) => ({
        taskId: task.id,
        periodKey,
        scheduledFor: date,
        targetCompletions: task.recurrenceKind === "WEEKLY" ? Math.max(1, task.weeklyTarget) : 1,
        responsibilityTypeSnapshot: task.responsibilityType,
        responsibleMemberIdSnapshot: task.responsibleMemberId,
        loadSnapshot: task.load
      })),
      skipDuplicates: true
    });
  });
}

export async function ensureAllCurrentOccurrences(date = new Date()) {
  const households = await prisma.household.findMany({ select: { id: true, timezone: true } });
  for (const household of households) {
    await ensureCurrentOccurrences(household.id, date, household.timezone);
  }
  return households.length;
}
