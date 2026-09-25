import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  getUser: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } })
}));

describe("real onboarding persistence", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_CUIDAM_MOCK", "false");
  });

  it("creates suggested areas, tasks, and occurrences in batches without relying on return order", async () => {
    const tx = {
      user: {
        upsert: vi.fn().mockResolvedValue({ id: "db-user-1" }),
        findUnique: vi.fn().mockResolvedValue({ activeHouseholdId: null }),
        update: vi.fn().mockResolvedValue({})
      },
      $queryRaw: vi.fn().mockResolvedValue([]),
      household: {
        create: vi.fn().mockResolvedValue({ id: "household-1", name: "Nossa casa" })
      },
      membership: {
        create: vi.fn().mockResolvedValue({ id: "membership-1" })
      },
      area: {
        createManyAndReturn: vi.fn(async ({ data }: { data: Array<{ sortOrder: number; name: string; icon: string | null }> }) =>
          data.map((area) => ({ ...area, id: `area-${area.sortOrder}` })).reverse()
        )
      },
      task: {
        createManyAndReturn: vi.fn(async ({ data }: { data: Array<{ areaId: string; name: string }> }) =>
          data.map((task, index) => ({ id: `task-${index}`, ...task })).reverse()
        )
      },
      taskOccurrence: {
        createMany: vi.fn().mockResolvedValue({ count: 10 })
      }
    };

    mocks.getUser.mockResolvedValue({ data: { user: { id: "auth-user-1", email: "lucas@example.com" } } });
    mocks.transaction.mockImplementation(async (callback) => callback(tx));

    const { POST } = await import("@/app/api/onboarding/route");
    const response = await POST(new Request("http://localhost/api/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Lucas",
        houseName: "Nossa casa",
        areas: [
          { id: "kitchen", name: "Cozinha", icon: "🍳" },
          { id: "living", name: "Sala", icon: "🛋️" },
          { id: "bathroom", name: "Banheiro", icon: "🫧" },
          { id: "bedroom", name: "Quartos", icon: "🛏️" }
        ]
      })
    }));

    expect(response.status).toBe(201);
    expect(tx.area.createManyAndReturn).toHaveBeenCalledOnce();
    expect(tx.area.createManyAndReturn.mock.calls[0][0].data).toHaveLength(4);
    expect(tx.task.createManyAndReturn).toHaveBeenCalledOnce();

    const taskInputs = tx.task.createManyAndReturn.mock.calls[0][0].data;
    expect(taskInputs).toHaveLength(10);
    expect(taskInputs.every((task) => ["area-0", "area-1", "area-2", "area-3"].includes(task.areaId))).toBe(true);

    expect(tx.taskOccurrence.createMany).toHaveBeenCalledOnce();
    const occurrences = tx.taskOccurrence.createMany.mock.calls[0][0].data as Array<{
      taskId: string;
      responsibilityTypeSnapshot: string;
    }>;
    expect(occurrences).toHaveLength(10);
    expect(new Set(occurrences.map((occurrence) => occurrence.taskId)).size).toBe(10);

    const taskIdByName = new Map(taskInputs.map((task, index) => [task.name, `task-${index}`]));
    const occurrenceByTaskId = new Map(occurrences.map((occurrence) => [occurrence.taskId, occurrence]));
    expect(occurrenceByTaskId.get(taskIdByName.get("Limpar bancada")!)?.responsibilityTypeSnapshot).toBe("PERSON");
    expect(occurrenceByTaskId.get(taskIdByName.get("Esvaziar lava-louças")!)?.responsibilityTypeSnapshot).toBe("SHARED");
  });
});
