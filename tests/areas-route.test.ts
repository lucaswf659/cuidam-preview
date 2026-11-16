import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    area: { findMany: vi.fn(), findFirst: vi.fn(), aggregate: vi.fn(), update: vi.fn() },
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

  it("archives an area and its active tasks without deleting history", async () => {
    const response = await PATCH(new Request("http://localhost/api/areas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "archive", areaId: "area-1" })
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
  });

  it("rejects an order that omits an active area", async () => {
    mocks.tx.area.findMany.mockResolvedValue([{ id: "area-1" }, { id: "area-2" }]);

    const response = await PATCH(new Request("http://localhost/api/areas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reorder", areaIds: ["area-1"] })
    }));

    expect(response.status).toBe(409);
    expect(mocks.tx.area.update).not.toHaveBeenCalled();
  });

  it("moves areas in the requested order", async () => {
    mocks.tx.area.findMany.mockResolvedValue([{ id: "area-1" }, { id: "area-2" }]);
    mocks.tx.area.aggregate.mockResolvedValue({ _max: { sortOrder: 5 } });
    mocks.getRealHouseholdSnapshot.mockResolvedValue({ areas: [{ id: "area-2" }, { id: "area-1" }] });

    const response = await PATCH(new Request("http://localhost/api/areas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reorder", areaIds: ["area-2", "area-1"] })
    }));

    expect(response.status).toBe(200);
    expect(mocks.tx.area.update).toHaveBeenNthCalledWith(1, { where: { id: "area-2" }, data: { sortOrder: 6 } });
    expect(mocks.tx.area.update).toHaveBeenNthCalledWith(2, { where: { id: "area-1" }, data: { sortOrder: 7 } });
  });
});

