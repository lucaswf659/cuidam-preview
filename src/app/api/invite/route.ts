import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRealContext } from "@/lib/real/household";

export async function POST(request: Request) {
  const context = await getRealContext();
  if (!context) return NextResponse.json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });
  const body = await request.json().catch(() => null) as { email?: unknown } | null;
  if (typeof body?.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });

  const email = body.email.trim().toLowerCase();
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.$transaction(async (tx) => {
    await tx.invitation.updateMany({ where: { householdId: context.household.id, status: "PENDING" }, data: { status: "CANCELLED" } });
    await tx.invitation.create({
      data: {
        householdId: context.household.id,
        email,
        invitedByUserId: context.dbUser.id,
        tokenHash,
        expiresAt,
        status: "PENDING"
      }
    });
  });
  return NextResponse.json({ sent: true, inviteUrl: `/convite/${token}`, expiresAt: expiresAt.toISOString() });
}
