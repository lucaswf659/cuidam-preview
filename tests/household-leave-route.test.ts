import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(),
    membership: { updateMany: vi.fn(), count: vi.fn() },
    user: { updateMany: vi.fn() },
    household: { updateMany: vi.fn() },
    invitation: { updateMany: vi.fn() }
  };
  return {
    tx,
    prisma: { $transaction: vi.fn(async (callback: (transaction: typeof tx) => unknown) => callback(tx)) },
    getRealContext: vi.fn()
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/real/household", () => ({ getRealContext: mocks.getRealContext }));

import { POST } from "@/app/api/household/leave/route";

describe("POST /api/household/leave", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRealContext.mockResolvedValue({
      household: { id: "house-1" },
      dbUser: { id: "user-1" },
      membership: { id: "membership-1" }
    });
    mocks.tx.membership.updateMany.mockResolvedValue({ count: 1 });
    mocks.tx.membership.count.mockResolvedValue(0);
    mocks.tx.user.updateMany.mockResolvedValue({ count: 1 });
    mocks.tx.household.updateMany.mockResolvedValue({ count: 1 });
    mocks.tx.invitation.updateMany.mockResolvedValue({ count: 0 });
  });

  it("marks the current membership as left and clears the active household", async () => {
    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ left: true, deactivated: true });
    expect(mocks.tx.membership.updateMany).toHaveBeenCalledWith({
      where: { id: "membership-1", householdId: "house-1", userId: "user-1", status: "ACTIVE" },
      data: { status: "LEFT", leftAt: expect.any(Date) }
    });
    expect(mocks.tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: "user-1", activeHouseholdId: "house-1" },
      data: { activeHouseholdId: null }
    });
    expect(mocks.tx.household.updateMany).toHaveBeenCalledWith({
      where: { id: "house-1", status: "ACTIVE" },
      data: { status: "INACTIVE" }
    });
    expect(mocks.tx.invitation.updateMany).toHaveBeenCalledWith({
      where: { householdId: "house-1", status: "PENDING" },
      data: { status: "CANCELLED" }
    });
  });

  it("keeps the house active while another member remains", async () => {
    mocks.tx.membership.count.mockResolvedValue(1);

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ left: true, deactivated: false });
    expect(mocks.tx.household.updateMany).not.toHaveBeenCalled();
    expect(mocks.tx.invitation.updateMany).not.toHaveBeenCalled();
  });

  it("rejects requests without an active household", async () => {
    mocks.getRealContext.mockResolvedValue(null);

    const response = await POST();

    expect(response.status).toBe(401);
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("does not clear the user household when the membership is no longer active", async () => {
    mocks.tx.membership.updateMany.mockResolvedValue({ count: 0 });

    const response = await POST();

    expect(response.status).toBe(409);
    expect(mocks.tx.user.updateMany).not.toHaveBeenCalled();
  });
});
