import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: { invitation: { updateMany: vi.fn() } },
  getRealContext: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/real/household", () => ({ getRealContext: mocks.getRealContext }));

import { DELETE } from "@/app/api/invite/route";

describe("DELETE /api/invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRealContext.mockResolvedValue({ household: { id: "house-1" } });
    mocks.prisma.invitation.updateMany.mockResolvedValue({ count: 1 });
  });

  it("cancels a pending invite only in the active household", async () => {
    const response = await DELETE(new Request("http://localhost/api/invite", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationId: "invite-1" })
    }));

    expect(response.status).toBe(200);
    expect(mocks.prisma.invitation.updateMany).toHaveBeenCalledWith({
      where: { id: "invite-1", householdId: "house-1", status: "PENDING" },
      data: { status: "CANCELLED" }
    });
  });

  it("does not claim success when the invite is no longer pending", async () => {
    mocks.prisma.invitation.updateMany.mockResolvedValue({ count: 0 });

    const response = await DELETE(new Request("http://localhost/api/invite", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationId: "invite-1" })
    }));

    expect(response.status).toBe(404);
  });
});

