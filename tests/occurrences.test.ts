import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  transaction: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: { findMany: mocks.findMany },
    $transaction: mocks.transaction
  }
}));

import { ensureCurrentOccurrences } from "@/lib/real/occurrences";

describe("ensureCurrentOccurrences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks old pending work and creates current occurrences in two idempotent batches", async () => {
    const date = new Date("2026-09-25T15:00:00.000Z");
    mocks.findMany.mockResolvedValue([
      {
        id: "daily-task",
        recurrenceKind: "DAILY",
        recurrenceInterval: 1,
        weeklyTarget: 1,
        recurrenceAnchor: new Date("2026-09-01T12:00:00.000Z"),
        responsibilityType: "PERSON",
        responsibleMemberId: "member-1",
        load: 2
      },
      {
        id: "weekly-task",
        recurrenceKind: "WEEKLY",
        recurrenceInterval: 1,
        weeklyTarget: 3,
        recurrenceAnchor: new Date("2026-09-01T12:00:00.000Z"),
        responsibilityType: "SHARED",
        responsibleMemberId: null,
        load: 4
      },
      {
        id: "future-task",
        recurrenceKind: "EVERY_N_WEEKS",
        recurrenceInterval: 2,
        weeklyTarget: 1,
        recurrenceAnchor: new Date("2026-10-01T12:00:00.000Z"),
        responsibilityType: "PERSON",
        responsibleMemberId: "member-1",
        load: 1
      }
    ]);

    const tx = {
      taskOccurrence: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        createMany: vi.fn().mockResolvedValue({ count: 2 })
      }
    };
    mocks.transaction.mockImplementation(async (callback) => callback(tx));

    await ensureCurrentOccurrences("household-1", date, "America/Sao_Paulo");

    expect(mocks.findMany).toHaveBeenCalledWith({ where: { householdId: "household-1", status: "ACTIVE" } });
    expect(tx.taskOccurrence.updateMany).toHaveBeenCalledOnce();
    expect(tx.taskOccurrence.updateMany.mock.calls[0][0]).toEqual({
      where: {
        status: "PENDING",
        OR: [
          { taskId: "daily-task", periodKey: { not: "2026-09-25" } },
          { taskId: "weekly-task", periodKey: { not: "week:2026-09-21" } }
        ]
      },
      data: { status: "MISSED" }
    });

    expect(tx.taskOccurrence.createMany).toHaveBeenCalledOnce();
    const createArgs = tx.taskOccurrence.createMany.mock.calls[0][0];
    expect(createArgs.skipDuplicates).toBe(true);
    expect(createArgs.data).toEqual([
      {
        taskId: "daily-task",
        periodKey: "2026-09-25",
        scheduledFor: date,
        targetCompletions: 1,
        responsibilityTypeSnapshot: "PERSON",
        responsibleMemberIdSnapshot: "member-1",
        loadSnapshot: 2
      },
      {
        taskId: "weekly-task",
        periodKey: "week:2026-09-21",
        scheduledFor: date,
        targetCompletions: 3,
        responsibilityTypeSnapshot: "SHARED",
        responsibleMemberIdSnapshot: null,
        loadSnapshot: 4
      }
    ]);
  });

  it("does not open a transaction when no task has an occurrence in the current period", async () => {
    mocks.findMany.mockResolvedValue([]);

    await ensureCurrentOccurrences("household-1", new Date("2026-09-25T15:00:00.000Z"));

    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
