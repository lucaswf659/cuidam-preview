import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRealContext, getRealHouseholdSnapshot } from "@/lib/real/household";

type AreaPayload = { name?: unknown; icon?: unknown; areaId?: unknown; action?: unknown };

async function areaResponse(areaId: string) {
  const household = await getRealHouseholdSnapshot();
  return household?.areas.find((area) => area.id === areaId) ?? null;
}

export async function POST(request: Request) {
  const context = await getRealContext();
  if (!context) return NextResponse.json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });
  const body = await request.json().catch(() => null) as AreaPayload | null;
  if (typeof body?.name !== "string" || !body.name.trim()) return NextResponse.json({ error: "Informe o nome da área." }, { status: 400 });
  const name = body.name.trim().slice(0, 80);
  const icon = typeof body.icon === "string" && body.icon.trim() ? body.icon.trim().slice(0, 12) : "🏡";
  const area = await prisma.$transaction(async (tx) => {
    const lastArea = await tx.area.findFirst({ where: { householdId: context.household.id }, orderBy: { sortOrder: "desc" } });
    return tx.area.create({
      data: {
        householdId: context.household.id,
        name,
        icon,
        sortOrder: (lastArea?.sortOrder ?? -1) + 1
      }
    });
  });
  return NextResponse.json({ area: await areaResponse(area.id) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const context = await getRealContext();
  if (!context) return NextResponse.json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });
  const body = await request.json().catch(() => null) as AreaPayload | null;
  if (body?.action === "delete") {
    if (typeof body.areaId !== "string") return NextResponse.json({ error: "Área não encontrada." }, { status: 400 });
    const deleted = await prisma.$transaction(async (tx) => {
      const area = await tx.area.findFirst({ where: { id: body.areaId as string, householdId: context.household.id, status: "ACTIVE" }, select: { id: true } });
      if (!area) return false;
      const archivedAt = new Date();
      // Keep the area/task records because task occurrences and completions reference them as history.
      await tx.task.updateMany({ where: { householdId: context.household.id, areaId: area.id, status: "ACTIVE" }, data: { status: "ARCHIVED", archivedAt } });
      await tx.area.update({ where: { id: area.id }, data: { status: "ARCHIVED", archivedAt } });
      return true;
    });
    if (!deleted) return NextResponse.json({ error: "Área não encontrada." }, { status: 404 });
    return NextResponse.json({ deleted: true, areaId: body.areaId });
  }
  if (typeof body?.areaId !== "string" || typeof body.name !== "string" || !body.name.trim()) return NextResponse.json({ error: "Informe o nome da área." }, { status: 400 });
  const existing = await prisma.area.findFirst({ where: { id: body.areaId, householdId: context.household.id, status: "ACTIVE" } });
  if (!existing) return NextResponse.json({ error: "Área não encontrada." }, { status: 404 });
  const area = await prisma.area.update({
    where: { id: existing.id },
    data: {
      name: body.name.trim().slice(0, 80),
      icon: typeof body.icon === "string" && body.icon.trim() ? body.icon.trim().slice(0, 12) : existing.icon
    }
  });
  return NextResponse.json({ area: await areaResponse(area.id) });
}
