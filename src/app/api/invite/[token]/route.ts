import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { authDisplayNameOrEmail } from "@/lib/real/auth-display-name";

type RouteContext = { params: Promise<{ token: string }> };

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function findValidInvitation(token: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: { household: true }
  });
  if (!invitation) return { invitation: null, error: "Convite não encontrado." };
  if (invitation.status !== "PENDING") return { invitation: null, error: "Este convite não está mais disponível." };
  if (invitation.household.status !== "ACTIVE") return { invitation: null, error: "Esta casa está desativada. Peça a uma pessoa que já fez parte dela para reabri-la e enviar um novo convite." };
  if (invitation.expiresAt <= new Date()) {
    await prisma.invitation.update({ where: { id: invitation.id }, data: { status: "EXPIRED" } });
    return { invitation: null, error: "Este convite expirou." };
  }
  return { invitation, error: null };
}

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const result = await findValidInvitation(token);
  if (!result.invitation) return NextResponse.json({ error: result.error }, { status: 404 });
  return NextResponse.json({ invitation: { email: result.invitation.email, householdName: result.invitation.household.name, expiresAt: result.invitation.expiresAt.toISOString() } });
}

export async function POST(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const result = await findValidInvitation(token);
  if (!result.invitation) return NextResponse.json({ error: result.error }, { status: 404 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Entre ou crie sua conta antes de aceitar o convite." }, { status: 401 });
  if (user.email.trim().toLowerCase() !== result.invitation.email) return NextResponse.json({ error: "Este convite foi enviado para outro e-mail." }, { status: 403 });

  const invitation = result.invitation;
  const accepted = await prisma.$transaction(async (tx) => {
    const displayName = authDisplayNameOrEmail(user);
    const dbUser = await tx.user.upsert({
      where: { authProviderId: user.id },
      update: { email: user.email!, name: displayName },
      create: { authProviderId: user.id, email: user.email!, name: displayName }
    });
    await tx.$queryRaw`SELECT "id" FROM "Household" WHERE "id" = ${invitation.householdId} FOR UPDATE`;
    const household = await tx.household.findUnique({ where: { id: invitation.householdId }, select: { status: true } });
    if (!household || household.status !== "ACTIVE") return { error: "Esta casa está desativada. Peça a uma pessoa que já fez parte dela para reabri-la e enviar um novo convite." };
    if (dbUser.activeHouseholdId && dbUser.activeHouseholdId !== invitation.householdId) return { error: "Sua conta já está vinculada a outra casa. Para aceitar este convite, saia da casa atual em Configurações e abra o link novamente." };
    const existingMembership = await tx.membership.findUnique({ where: { householdId_userId: { householdId: invitation.householdId, userId: dbUser.id } } });
    if (!existingMembership) {
      const memberCount = await tx.membership.count({ where: { householdId: invitation.householdId, status: "ACTIVE" } });
      if (memberCount >= 2) return { error: "Esta casa já atingiu o limite de pessoas do MVP." };
      await tx.membership.create({ data: { householdId: invitation.householdId, userId: dbUser.id, role: "MEMBER", status: "ACTIVE" } });
    } else if (existingMembership.status === "LEFT") {
      const memberCount = await tx.membership.count({ where: { householdId: invitation.householdId, status: "ACTIVE" } });
      if (memberCount >= 2) return { error: "Esta casa já atingiu o limite de pessoas do MVP." };
      await tx.membership.update({ where: { id: existingMembership.id }, data: { status: "ACTIVE", leftAt: null } });
    }
    await tx.user.update({ where: { id: dbUser.id }, data: { activeHouseholdId: invitation.householdId } });
    await tx.invitation.update({ where: { id: invitation.id }, data: { status: "ACCEPTED", acceptedAt: new Date() } });
    return { householdId: invitation.householdId };
  });
  if ("error" in accepted) return NextResponse.json({ error: accepted.error }, { status: 409 });
  return NextResponse.json({ accepted: true, householdId: accepted.householdId });
}

