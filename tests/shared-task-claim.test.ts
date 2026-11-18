import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    taskOccurrence: {
      upsert: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn()
    },
    occurrenceCompletion: { create: vi.fn() }
  };

  return {
    tx,
    prisma: {
      task: { findFirst: vi.fn(), update: vi.fn() },
      $transaction: vi.fn((callback: (transaction: typeof tx) => unknown) => callback(tx))
    },
    getRealContext: vi.fn(),
    getRealHouseholdSnapshot: vi.fn(),
    recurrenceFromLabel: vi.fn(),
    periodKeyForRecurrence: vi.fn()
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/real/household", () => ({
  getRealContext: mocks.getRealContext,
  getRealHouseholdSnapshot: mocks.getRealHouseholdSnapshot,
  recurrenceFromLabel: mocks.recurrenceFromLabel
}));
vi.mock("@/lib/real/recurrence", () => ({ periodKeyForRecurrence: mocks.periodKeyForRecurrence }));

import { PATCH } from "@/app/api/tasks/route";

const pendingOccurrence = (overrides: Record<string, unknown> = {}) => ({
  id: "occurrence-1",
  status: "PENDING",
  periodKey: "week:2026-11-09",
  completedCount: 0,
  targetCompletions: 3,
  responsibilityTypeSnapshot: "SHARED",
  responsibleMemberIdSnapshot: null,
  loadSnapshot: 2,
  claimedByUserId: null,
  claimedAt: null,
  ...overrides
});

describe("PATCH /api/tasks shared claim and completion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRealContext.mockResolvedValue({
      dbUser: { id: "user-1" },
      household: { id: "house-1", timezone: "America/Sao_Paulo" },
      membership: { id: "member-1" }
    });
    mocks.getRealHouseholdSnapshot.mockResolvedValue({ tasks: [{ id: "task-1", claimOwnedByCurrentUser: true }] });
    mocks.periodKeyForRecurrence.mockReturnValue("week:2026-11-09");
    mocks.prisma.task.findFirst.mockResolvedValue({
      id: "task-1",
      status: "ACTIVE",
      responsibilityType: "SHARED",
      responsibleMemberId: null,
      recurrenceKind: "WEEKLY",
      recurrenceInterval: 1,
      weeklyTarget: 3,
      recurrenceAnchor: new Date("2026-11-09T12:00:00.000Z"),
      load: 2
    });
  });

  it("atomically reserves a shared weekly occurrence and makes a repeated claim idempotent", async () => {
    mocks.tx.taskOccurrence.upsert.mockResolvedValueOnce(pendingOccurrence());
    mocks.tx.taskOccurrence.updateMany.mockResolvedValueOnce({ count: 1 });

    const response = await PATCH(new Request("http://localhost/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: "task-1", action: "claim" })
    }));

    expect(response.status).toBe(200);
    const upsert = mocks.tx.taskOccurrence.upsert.mock.calls[0][0];
    expect(upsert.create).toMatchObject({ targetCompletions: 3, responsibilityTypeSnapshot: "SHARED" });
    expect(mocks.tx.taskOccurrence.updateMany).toHaveBeenCalledWith({
      where: { id: "occurrence-1", status: "PENDING", claimedByUserId: null },
      data: { claimedByUserId: "user-1", claimedAt: expect.any(Date) }
    });
  });

  it("returns the latest task when another member wins the claim race", async () => {
    mocks.tx.taskOccurrence.upsert.mockResolvedValueOnce(pendingOccurrence({ claimedByUserId: "user-2" }));
    mocks.getRealHouseholdSnapshot.mockResolvedValue({ tasks: [{ id: "task-1", claimOwnerName: "Ana" }] });

    const response = await PATCH(new Request("http://localhost/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: "task-1", action: "claim" })
    }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toContain("Outra pessoa");
    expect(body.task.claimOwnerName).toBe("Ana");
    expect(mocks.tx.taskOccurrence.updateMany).not.toHaveBeenCalled();
  });

  it("requires the claimant to complete a shared occurrence", async () => {
    mocks.tx.taskOccurrence.upsert.mockResolvedValueOnce(pendingOccurrence());

    const response = await PATCH(new Request("http://localhost/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: "task-1" })
    }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toContain("Vou cuidar");
    expect(mocks.tx.taskOccurrence.updateMany).not.toHaveBeenCalled();
    expect(mocks.tx.occurrenceCompletion.create).not.toHaveBeenCalled();
  });

  it("keeps the same person assigned after a partial weekly completion", async () => {
    mocks.tx.taskOccurrence.upsert.mockResolvedValueOnce(pendingOccurrence({ completedCount: 1, claimedByUserId: "user-1", claimedAt: new Date("2026-11-10T12:00:00.000Z") }));
    mocks.tx.taskOccurrence.updateMany.mockResolvedValueOnce({ count: 1 });

    const response = await PATCH(new Request("http://localhost/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: "task-1" })
    }));

    expect(response.status).toBe(200);
    const update = mocks.tx.taskOccurrence.updateMany.mock.calls[0][0];
    expect(update.data).toMatchObject({ status: "PENDING", completedCount: 2, claimedByUserId: "user-1" });
    expect(mocks.tx.occurrenceCompletion.create).toHaveBeenCalledWith({
      data: { occurrenceId: "occurrence-1", completedById: "user-1", starsGranted: 0 }
    });
  });

  it("releases the claim when the weekly target is complete", async () => {
    mocks.tx.taskOccurrence.upsert.mockResolvedValueOnce(pendingOccurrence({ completedCount: 2, claimedByUserId: "user-1", claimedAt: new Date("2026-11-10T12:00:00.000Z") }));
    mocks.tx.taskOccurrence.updateMany.mockResolvedValueOnce({ count: 1 });

    const response = await PATCH(new Request("http://localhost/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: "task-1" })
    }));

    expect(response.status).toBe(200);
    const update = mocks.tx.taskOccurrence.updateMany.mock.calls[0][0];
    expect(update.data).toMatchObject({ status: "COMPLETED", completedCount: 3, claimedByUserId: null, claimedAt: null, starsGrantedSnapshot: 6 });
    expect(mocks.tx.occurrenceCompletion.create).toHaveBeenCalledWith({
      data: { occurrenceId: "occurrence-1", completedById: "user-1", starsGranted: 6 }
    });
  });
});

