import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(),
    user: { findUnique: vi.fn(), updateMany: vi.fn() },
    membership: { findUnique: vi.fn(), count: vi.fn(), updateMany: vi.fn() },
    household: { findUnique: vi.fn(), updateMany: vi.fn() }
  };
  return {
    tx,
    prisma: {
      user: { findUnique: vi.fn() },
      $transaction: vi.fn(async (callback: (transaction: typeof tx) => unknown) => callback(tx))
    },
    createClient: vi.fn()
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

import { POST } from "@/app/api/household/reactivate/route";

const request = (householdId = "house-1") => new Request("http://localhost/api/household/reactivate", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ householdId })
});
const formRequest = (householdId = "house-1") => new Request("http://localhost/api/household/reactivate", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ householdId })
});

describe("POST /api/household/reactivate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1", email: "person@example.com" } } }) } });
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "user-1" });
    mocks.tx.user.findUnique.mockResolvedValue({ activeHouseholdId: null });
    mocks.tx.membership.findUnique.mockResolvedValue({ id: "membership-1", status: "LEFT" });
    mocks.tx.household.findUnique.mockResolvedValue({ id: "house-1", status: "INACTIVE" });
    mocks.tx.membership.count.mockResolvedValue(0);
    mocks.tx.household.updateMany.mockResolvedValue({ count: 1 });
    mocks.tx.membership.updateMany.mockResolvedValue({ count: 1 });
    mocks.tx.user.updateMany.mockResolvedValue({ count: 1 });
  });

  it("reactivates only a previous membership in an inactive house", async () => {
    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ reactivated: true, householdId: "house-1" });
    expect(mocks.tx.household.updateMany).toHaveBeenCalledWith({ where: { id: "house-1", status: "INACTIVE" }, data: { status: "ACTIVE" } });
    expect(mocks.tx.membership.updateMany).toHaveBeenCalledWith({ where: { id: "membership-1", status: "LEFT" }, data: { status: "ACTIVE", leftAt: null } });
    expect(mocks.tx.user.updateMany).toHaveBeenCalledWith({ where: { id: "user-1", activeHouseholdId: null }, data: { activeHouseholdId: "house-1" } });
  });

  it("accepts the native form and redirects to Today after reactivation", async () => {
    const response = await POST(formRequest());

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/today");
    expect(mocks.tx.household.updateMany).toHaveBeenCalledOnce();
  });

  it("does not reactivate a house while another member remains", async () => {
    mocks.tx.membership.count.mockResolvedValue(1);

    const response = await POST(request());

    expect(response.status).toBe(409);
    expect(mocks.tx.household.updateMany).not.toHaveBeenCalled();
    expect(mocks.tx.membership.updateMany).not.toHaveBeenCalled();
  });

  it("rejects a house that the signed-in account never belonged to", async () => {
    mocks.tx.membership.findUnique.mockResolvedValue(null);

    const response = await POST(request("house-other"));

    expect(response.status).toBe(404);
    expect(mocks.tx.household.updateMany).not.toHaveBeenCalled();
  });
});
