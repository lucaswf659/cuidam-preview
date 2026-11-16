import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRealContext } from "@/lib/real/household";

function validName(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= 80;
}

function validCost(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0 && Number(value) <= 999;
}

export async function GET() {
  const context = await getRealContext();
  if (!context) return NextResponse.json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });

  const [rewards, earned, redeemed, members, history] = await Promise.all([
    prisma.reward.findMany({ where: { householdId: context.household.id, status: "ACTIVE" }, orderBy: { createdAt: "asc" } }),
    prisma.taskOccurrence.aggregate({ where: { task: { householdId: context.household.id }, status: "COMPLETED" }, _sum: { starsGrantedSnapshot: true } }),
    prisma.rewardRedemption.aggregate({ where: { householdId: context.household.id }, _sum: { costSnapshot: true } }),
    prisma.membership.findMany({ where: { householdId: context.household.id, status: "ACTIVE" }, include: { user: { select: { id: true, name: true } } } }),
    prisma.rewardRedemption.findMany({ where: { householdId: context.household.id }, orderBy: { redeemedAt: "desc" }, take: 10, include: { redeemedBy: { select: { name: true } }, reward: { select: { name: true } } } }),
  ]);
  return NextResponse.json({
    balance: (earned._sum.starsGrantedSnapshot ?? 0) - (redeemed._sum.costSnapshot ?? 0),
    rewards,
    members: members.map(({ user }) => user),
    history: history.map((item) => ({ id: item.id, rewardName: item.reward.name, redeemedBy: item.redeemedBy.name, cost: item.costSnapshot, redeemedAt: item.redeemedAt.toISOString() })),
  });
}

export async function POST(request: Request) {
  const context = await getRealContext();
  if (!context) return NextResponse.json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });
  const body = await request.json().catch(() => null) as { name?: unknown; cost?: unknown; recipientType?: unknown; recipientMemberId?: unknown } | null;
  if (!validName(body?.name) || !validCost(body?.cost)) return NextResponse.json({ error: "Informe um nome e um custo entre 1 e 999 estrelas." }, { status: 400 });
  const recipientType = body?.recipientType === "MEMBER" ? "MEMBER" : "HOUSEHOLD";
  let recipientMemberId: string | null = null;
  if (recipientType === "MEMBER") {
    if (typeof body?.recipientMemberId !== "string") return NextResponse.json({ error: "Escolha a pessoa da recompensa." }, { status: 400 });
    const member = await prisma.membership.findFirst({ where: { householdId: context.household.id, status: "ACTIVE", userId: body.recipientMemberId } });
    if (!member) return NextResponse.json({ error: "Essa pessoa não pertence a esta casa." }, { status: 400 });
    recipientMemberId = member.id;
  }
  const reward = await prisma.reward.create({ data: { householdId: context.household.id, name: body.name.trim(), cost: body.cost, recipientType, recipientMemberId } });
  return NextResponse.json({ reward }, { status: 201 });
}

export async function PATCH(request: Request) {
  const context = await getRealContext();
  if (!context) return NextResponse.json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });
  const body = await request.json().catch(() => null) as { rewardId?: unknown; action?: unknown; name?: unknown; cost?: unknown; recipientType?: unknown; recipientMemberId?: unknown; idempotencyKey?: unknown } | null;
  if (typeof body?.rewardId !== "string") return NextResponse.json({ error: "Recompensa inválida." }, { status: 400 });
  if (body.action === "redeem") {
    if (typeof body.idempotencyKey !== "string" || body.idempotencyKey.length < 16 || body.idempotencyKey.length > 100) {
      return NextResponse.json({ error: "Não foi possível confirmar este resgate. Tente novamente." }, { status: 400 });
    }
    const prior = await prisma.rewardRedemption.findFirst({ where: { requestKey: body.idempotencyKey, householdId: context.household.id } });
    if (prior) return NextResponse.json({ redemption: prior });
  }
  const reward = await prisma.reward.findFirst({ where: { id: body.rewardId, householdId: context.household.id, status: "ACTIVE" } });
  if (!reward) return NextResponse.json({ error: "Recompensa não encontrada." }, { status: 404 });

  if (body.action === "archive") {
    await prisma.reward.update({ where: { id: reward.id }, data: { status: "ARCHIVED", archivedAt: new Date() } });
    return NextResponse.json({ ok: true });
  }
  if (body.action === "edit") {
    if (!validName(body.name) || !validCost(body.cost)) return NextResponse.json({ error: "Informe um nome e um custo entre 1 e 999 estrelas." }, { status: 400 });
    const recipientType = body.recipientType === "MEMBER" ? "MEMBER" : "HOUSEHOLD";
    let recipientMemberId: string | null = null;
    if (recipientType === "MEMBER") {
      const member = typeof body.recipientMemberId === "string"
        ? await prisma.membership.findFirst({ where: { householdId: context.household.id, status: "ACTIVE", userId: body.recipientMemberId } })
        : null;
      if (!member) return NextResponse.json({ error: "Essa pessoa não pertence a esta casa." }, { status: 400 });
      recipientMemberId = member.id;
    }
    const updated = await prisma.reward.update({ where: { id: reward.id }, data: { name: body.name.trim(), cost: body.cost, recipientType, recipientMemberId } });
    return NextResponse.json({ reward: updated });
  }
  if (body.action !== "redeem") return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  const idempotencyKey = body.idempotencyKey as string;
  try {
    const redemption = await prisma.$transaction(async (tx) => {
      const existingRedemption = await tx.rewardRedemption.findFirst({ where: { requestKey: idempotencyKey, householdId: context.household.id } });
      if (existingRedemption) return existingRedemption;
      const currentReward = await tx.reward.findFirst({ where: { id: reward.id, householdId: context.household.id, status: "ACTIVE" } });
      if (!currentReward) throw new Error("REWARD_UNAVAILABLE");
      const earned = await tx.taskOccurrence.aggregate({ where: { task: { householdId: context.household.id }, status: "COMPLETED" }, _sum: { starsGrantedSnapshot: true } });
      const redeemed = await tx.rewardRedemption.aggregate({ where: { householdId: context.household.id }, _sum: { costSnapshot: true } });
      if ((earned._sum.starsGrantedSnapshot ?? 0) - (redeemed._sum.costSnapshot ?? 0) < currentReward.cost) throw new Error("INSUFFICIENT_BALANCE");
      return tx.rewardRedemption.create({ data: { requestKey: idempotencyKey, rewardId: currentReward.id, householdId: context.household.id, redeemedByUserId: context.dbUser.id, recipientType: currentReward.recipientType, recipientMemberId: currentReward.recipientMemberId, costSnapshot: currentReward.cost } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json({ redemption });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "INSUFFICIENT_BALANCE") return NextResponse.json({ error: "Ainda não há estrelas suficientes para esse resgate." }, { status: 409 });
    if (message === "REWARD_UNAVAILABLE") return NextResponse.json({ error: "Essa recompensa não está mais disponível." }, { status: 409 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2034" || error.code === "P2002")) {
      const prior = await prisma.rewardRedemption.findFirst({ where: { requestKey: idempotencyKey, householdId: context.household.id } });
      if (prior) return NextResponse.json({ redemption: prior });
      if (error.code === "P2034") return NextResponse.json({ error: "O saldo acabou de mudar. Atualize e tente novamente." }, { status: 409 });
    }
    throw error;
  }
}

