import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRealContext } from "@/lib/real/household";

export async function POST() {
  const context = await getRealContext();
  if (!context) return NextResponse.json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });

  const leftAt = new Date();
  const left = await prisma.$transaction(async (tx) => {
    const membership = await tx.membership.updateMany({
      where: { id: context.membership.id, householdId: context.household.id, userId: context.dbUser.id, status: "ACTIVE" },
      data: { status: "LEFT", leftAt }
    });
    if (membership.count !== 1) return false;

    const user = await tx.user.updateMany({
      where: { id: context.dbUser.id, activeHouseholdId: context.household.id },
      data: { activeHouseholdId: null }
    });
    if (user.count !== 1) throw new Error("O vínculo ativo da casa mudou. Tente novamente.");
    return true;
  });

  if (!left) return NextResponse.json({ error: "Sua conta já não está vinculada a esta casa." }, { status: 409 });
  return NextResponse.json({ left: true });
}
