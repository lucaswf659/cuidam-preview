import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    user: {
      upsert: vi.fn(),
      update: vi.fn()
    },
    membership: {
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn()
    },
    invitation: {
      update: vi.fn()
    }
  };

  return {
    tx,
    prisma: {
      invitation: { findUnique: vi.fn(), update: vi.fn() },
      $transaction: vi.fn((callback: (transaction: typeof tx) => unknown) => callback(tx))
    },
    createClient: vi.fn()
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

import { POST } from "@/app/api/invite/[token]/route";

describe("POST /api/invite/[token]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.invitation.findUnique.mockResolvedValue({
      id: "invite-1",
      householdId: "house-1",
      email: "convidado@example.com",
      status: "PENDING",
      expiresAt: new Date(Date.now() + 60_000),
      household: { id: "house-1", name: "Casa de teste" }
    });
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-2", email: "convidado@example.com", user_metadata: { name: "Convidado" } } } }) }
    });
    mocks.tx.user.upsert.mockResolvedValue({ id: "user-2", activeHouseholdId: null });
    mocks.tx.membership.findUnique.mockResolvedValue(null);
    mocks.tx.membership.count.mockResolvedValue(1);
  });

  it("vincula a segunda conta à casa convidada e aceita o convite", async () => {
    const response = await POST(new Request("http://localhost/api/invite/token"), { params: Promise.resolve({ token: "token" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ accepted: true, householdId: "house-1" });
    expect(mocks.tx.membership.create).toHaveBeenCalledWith({ data: { householdId: "house-1", userId: "user-2", role: "MEMBER", status: "ACTIVE" } });
    expect(mocks.tx.user.update).toHaveBeenCalledWith({ where: { id: "user-2" }, data: { activeHouseholdId: "house-1" } });
    expect(mocks.tx.invitation.update).toHaveBeenCalledWith({ where: { id: "invite-1" }, data: { status: "ACCEPTED", acceptedAt: expect.any(Date) } });
  });
});

