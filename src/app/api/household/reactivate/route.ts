import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

type Payload = { householdId?: unknown };

function redirectTo(path: string) {
  return new NextResponse(null, { status: 303, headers: { location: path } });
}

export async function POST(request: Request) {
  const isFormPost = request.headers.get("content-type")?.includes("application/x-www-form-urlencoded") ?? false;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    if (isFormPost) return redirectTo("/entrar?mode=login&reopenError=session");
    return NextResponse.json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });
  }

  const body = isFormPost
    ? { householdId: (await request.formData()).get("householdId") }
    : await request.json().catch(() => null) as Payload | null;
  if (!body || typeof body.householdId !== "string" || !body.householdId) {
    if (isFormPost) return redirectTo("/entrar?mode=login&reopenError=choose");
    return NextResponse.json({ error: "Escolha uma casa para reabrir." }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({ where: { authProviderId: user.id }, select: { id: true } });
  if (!dbUser) {
    if (isFormPost) return redirectTo("/entrar?mode=login&reopenError=unavailable");
    return NextResponse.json({ error: "Não encontramos uma casa anterior para esta conta." }, { status: 404 });
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${dbUser.id} FOR UPDATE`;
    const lockedUser = await tx.user.findUnique({ where: { id: dbUser.id }, select: { activeHouseholdId: true } });
    if (!lockedUser) return { status: 404, error: "Conta não encontrada." };
    if (lockedUser.activeHouseholdId) return { status: 409, error: "Sua conta já está vinculada a uma casa." };

    const membership = await tx.membership.findUnique({
      where: { householdId_userId: { householdId: body.householdId as string, userId: dbUser.id } },
      select: { id: true, status: true }
    });
    if (!membership || membership.status !== "LEFT") return { status: 404, error: "Esta casa não está disponível para reabertura nesta conta." };

    await tx.$queryRaw`SELECT "id" FROM "Household" WHERE "id" = ${body.householdId as string} FOR UPDATE`;
    const household = await tx.household.findUnique({ where: { id: body.householdId as string }, select: { id: true, status: true } });
    if (!household || household.status !== "INACTIVE") return { status: 409, error: "Esta casa não está desativada. Peça a alguém que ainda esteja nela para enviar um convite." };
    const activeMemberCount = await tx.membership.count({ where: { householdId: household.id, status: "ACTIVE" } });
    if (activeMemberCount > 0) return { status: 409, error: "Alguém ainda está nesta casa. Peça um novo convite para voltar." };

    const reopened = await tx.household.updateMany({ where: { id: household.id, status: "INACTIVE" }, data: { status: "ACTIVE" } });
    const restoredMembership = await tx.membership.updateMany({ where: { id: membership.id, status: "LEFT" }, data: { status: "ACTIVE", leftAt: null } });
    const activatedUser = await tx.user.updateMany({ where: { id: dbUser.id, activeHouseholdId: null }, data: { activeHouseholdId: household.id } });
    if (reopened.count !== 1 || restoredMembership.count !== 1 || activatedUser.count !== 1) {
      throw new Error("A casa mudou durante a reabertura. Tente novamente.");
    }
    return { householdId: household.id };
  });

  if ("error" in result) {
    if (isFormPost) {
      const code = result.status === 409 ? "occupied" : "unavailable";
      return redirectTo(`/entrar?mode=login&reopenError=${code}`);
    }
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  if (isFormPost) return redirectTo("/today");
  return NextResponse.json({ reactivated: true, householdId: result.householdId });
}
