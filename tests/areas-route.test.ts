import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    area: { findFirst: vi.fn(), update: vi.fn() },
    task: { updateMany: vi.fn() }
  };
  return {
    tx,
    prisma: { $transaction: vi.fn(async (callback: (transaction: typeof tx) => unknown) => callback(tx)) },
    getRealContext: vi.fn(),
    getRealHouseholdSnapshot: vi.fn()
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/real/household", () => ({
  getRealContext: mocks.getRealContext,
  getRealHouseholdSnapshot: mocks.getRealHouseholdSnapshot
}));

import { PATCH } from "@/app/api/areas/route";

describe("PATCH /api/areas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRealContext.mockResolvedValue({ household: { id: "house-1" } });
    mocks.tx.area.findFirst.mockResolvedValue({ id: "area-1" });
    mocks.tx.task.updateMany.mockResolvedValue({ count: 2 });
    mocks.tx.area.update.mockResolvedValue({ id: "area-1" });
  });

  it("removes an area from active settings and preserves its history", async () => {
    const response = await PATCH(new Request("http://localhost/api/areas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", areaId: "area-1" })
    }));

    expect(response.status).toBe(200);
    expect(mocks.tx.task.updateMany).toHaveBeenCalledWith({
      where: { householdId: "house-1", areaId: "area-1", status: "ACTIVE" },
      data: expect.objectContaining({ status: "ARCHIVED", archivedAt: expect.any(Date) })
    });
    expect(mocks.tx.area.update).toHaveBeenCalledWith({
      where: { id: "area-1" },
      data: expect.objectContaining({ status: "ARCHIVED", archivedAt: expect.any(Date) })
    });
    const result = await response.json();
    expect(result).toEqual({ deleted: true, areaId: "area-1" });
  });
});

