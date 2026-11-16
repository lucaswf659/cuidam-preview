import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => {
  const reward = { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() };
  const taskOccurrence = { aggregate: vi.fn() };
  const rewardRedemption = { aggregate: vi.fn(), create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() };
  const membership = { findFirst: vi.fn(), findMany: vi.fn() };
  const tx = { reward, taskOccurrence, rewardRedemption };
  return { reward, taskOccurrence, rewardRedemption, membership, tx, prisma: { reward, taskOccurrence, rewardRedemption, membership, $transaction: vi.fn() }, getRealContext: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/real/household", () => ({ getRealContext: mocks.getRealContext }));

import { GET, PATCH } from "@/app/api/rewards/route";

describe("/api/rewards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRealContext.mockResolvedValue({ dbUser: { id: "user-1" }, household: { id: "house-1" } });
    mocks.reward.findFirst.mockResolvedValue({ id: "reward-1", householdId: "house-1", cost: 5, recipientType: "HOUSEHOLD", recipientMemberId: null, status: "ACTIVE" });
    mocks.taskOccurrence.aggregate.mockResolvedValue({ _sum: { starsGrantedSnapshot: 10 } });
    mocks.rewardRedemption.aggregate.mockResolvedValue({ _sum: { costSnapshot: 2 } });
    mocks.rewardRedemption.findFirst.mockResolvedValue(null);
    mocks.rewardRedemption.create.mockResolvedValue({ id: "redemption-1" });
    mocks.prisma.$transaction.mockImplementation((run) => run(mocks.tx));
  });

  it("calculates one shared household balance from earned stars minus redemptions", async () => {
    mocks.reward.findMany.mockResolvedValue([]);
    mocks.membership.findMany.mockResolvedValue([]);
    mocks.rewardRedemption.findMany.mockResolvedValue([]);
    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ balance: 8, rewards: [], history: [] });
  });

  it("creates a redemption with the current cost snapshot inside a serializable transaction", async () => {
    const response = await PATCH(new Request("http://localhost/api/rewards", { method: "PATCH", body: JSON.stringify({ rewardId: "reward-1", action: "redeem", idempotencyKey: "stable-test-key-0001" }) }));
    expect(response.status).toBe(200);
    expect(mocks.prisma.$transaction).toHaveBeenCalledOnce();
    expect(mocks.rewardRedemption.create).toHaveBeenCalledWith({ data: expect.objectContaining({ requestKey: "stable-test-key-0001", rewardId: "reward-1", householdId: "house-1", redeemedByUserId: "user-1", costSnapshot: 5 }) });
  });

  it("rejects redemption when the current shared balance is too low", async () => {
    mocks.taskOccurrence.aggregate.mockResolvedValue({ _sum: { starsGrantedSnapshot: 4 } });
    mocks.rewardRedemption.aggregate.mockResolvedValue({ _sum: { costSnapshot: 0 } });
    const response = await PATCH(new Request("http://localhost/api/rewards", { method: "PATCH", body: JSON.stringify({ rewardId: "reward-1", action: "redeem", idempotencyKey: "stable-test-key-0002" }) }));
    expect(response.status).toBe(409);
    expect(mocks.rewardRedemption.create).not.toHaveBeenCalled();
  });

  it("returns the prior redemption for a repeated idempotency key without charging twice", async () => {
    mocks.rewardRedemption.findFirst.mockResolvedValue({ id: "redemption-existing", costSnapshot: 5 });
    const response = await PATCH(new Request("http://localhost/api/rewards", { method: "PATCH", body: JSON.stringify({ rewardId: "reward-1", action: "redeem", idempotencyKey: "stable-test-key-0003" }) }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ redemption: { id: "redemption-existing" } });
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("returns the committed redemption after a concurrent serializable conflict", async () => {
    const prior = { id: "redemption-concurrent", costSnapshot: 5 };
    mocks.rewardRedemption.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(prior);
    mocks.prisma.$transaction.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("serialization conflict", {
      code: "P2034",
      clientVersion: Prisma.prismaVersion.client
    }));

    const response = await PATCH(new Request("http://localhost/api/rewards", { method: "PATCH", body: JSON.stringify({ rewardId: "reward-1", action: "redeem", idempotencyKey: "stable-test-key-0004" }) }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ redemption: { id: "redemption-concurrent" } });
  });
});

