import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    area: { findFirst: vi.fn() },
    membership: { findFirst: vi.fn() },
    task: { create: vi.fn() }
  },
  getRealContext: vi.fn(),
  getRealHouseholdSnapshot: vi.fn(),
  recurrenceFromLabel: vi.fn(),
  periodKeyForRecurrence: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/real/household", () => ({
  getRealContext: mocks.getRealContext,
  getRealHouseholdSnapshot: mocks.getRealHouseholdSnapshot,
  recurrenceFromLabel: mocks.recurrenceFromLabel
}));
vi.mock("@/lib/real/recurrence", () => ({ periodKeyForRecurrence: mocks.periodKeyForRecurrence }));

import { POST } from "@/app/api/tasks/route";

describe("POST /api/tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRealContext.mockResolvedValue({
      dbUser: { id: "user-1" },
      household: { id: "house-1", timezone: "America/Sao_Paulo" },
      membership: { id: "member-1" }
    });
    mocks.getRealHouseholdSnapshot.mockResolvedValue(null);
    mocks.recurrenceFromLabel.mockReturnValue({ recurrenceKind: "DAILY", recurrenceInterval: 1, weeklyTarget: 1 });
    mocks.periodKeyForRecurrence.mockReturnValue("2026-09-28");
    mocks.prisma.area.findFirst.mockResolvedValue({ id: "area-1" });
    mocks.prisma.task.create.mockResolvedValue({ id: "task-1" });
  });

  it("cria a tarefa e a primeira ocorrência juntas numa gravação aninhada", async () => {
    const response = await POST(new Request("http://localhost/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Limpar bancada",
        areaId: "area-1",
        responsibility: "Você",
        recurrence: "Diária",
        load: 2
      })
    }));

    expect(response.status).toBe(201);
    expect(mocks.prisma.task.create).toHaveBeenCalledOnce();
    const [{ data }] = mocks.prisma.task.create.mock.calls[0];
    expect(data).toMatchObject({
      householdId: "house-1",
      areaId: "area-1",
      name: "Limpar bancada",
      responsibilityType: "PERSON",
      responsibleMemberId: "member-1",
      occurrences: {
        create: {
          periodKey: "2026-09-28",
          targetCompletions: 1,
          responsibilityTypeSnapshot: "PERSON",
          responsibleMemberIdSnapshot: "member-1",
          loadSnapshot: 2
        }
      }
    });
    expect(mocks.prisma).not.toHaveProperty("$transaction");
  });
});

