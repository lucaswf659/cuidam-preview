import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRealContext, getRealHouseholdSnapshot, recurrenceFromLabel } from "@/lib/real/household";
import { periodKeyForRecurrence } from "@/lib/real/recurrence";
import type { MockResponsibility } from "@/lib/mock/store";

const validRecurrences = ["Diária", "Semanal", "3× por semana", "Mensal"];

type TaskPayload = {
  name?: unknown;
  areaId?: unknown;
  responsibility?: unknown;
  recurrence?: unknown;
  load?: unknown;
};

function parseTaskPayload(body: TaskPayload) {
  if (
    typeof body.name !== "string" || !body.name.trim() ||
    typeof body.areaId !== "string" ||
    typeof body.recurrence !== "string" || !validRecurrences.includes(body.recurrence) ||
    typeof body.load !== "number" || body.load < 1 || body.load > 5
  ) return null;
  const responsibility: MockResponsibility = body.responsibility === "Nós" || body.responsibility === "Outra pessoa" ? body.responsibility : "Você";
  return { name: body.name.trim(), areaId: body.areaId, responsibility, recurrence: body.recurrence, load: body.load };
}

async function resolveResponsibility(responsibility: MockResponsibility, householdId: string, membershipId: string) {
  if (responsibility === "Nós") return { responsibilityType: "SHARED" as const, responsibleMemberId: null };
  if (responsibility === "Você") return { responsibilityType: "PERSON" as const, responsibleMemberId: membershipId };
  const other = await prisma.membership.findFirst({ where: { householdId, status: "ACTIVE", id: { not: membershipId } }, orderBy: { joinedAt: "asc" } });
  return other ? { responsibilityType: "PERSON" as const, responsibleMemberId: other.id } : null;
}

async function taskResponse(taskId: string) {
  const household = await getRealHouseholdSnapshot();
  return household?.tasks.find((task) => task.id === taskId) ?? null;
}

export async function POST(request: Request) {
  const context = await getRealContext();
  if (!context) return NextResponse.json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });
  const body = await request.json().catch(() => null) as TaskPayload | null;
  const parsed = parseTaskPayload(body ?? {});
  if (!parsed) return NextResponse.json({ error: "Preencha nome, área, frequência e carga." }, { status: 400 });

  const area = await prisma.area.findFirst({ where: { id: parsed.areaId, householdId: context.household.id, status: "ACTIVE" } });
  if (!area) return NextResponse.json({ error: "A área informada não pertence a esta casa." }, { status: 400 });
  const responsibility = await resolveResponsibility(parsed.responsibility, context.household.id, context.membership.id);
  if (!responsibility) return NextResponse.json({ error: "Convide outra pessoa antes de atribuir uma tarefa a ela." }, { status: 400 });

  const now = new Date();
  const recurrence = recurrenceFromLabel(parsed.recurrence);
  const task = await prisma.$transaction(async (tx) => {
    const created = await tx.task.create({
      data: {
        householdId: context.household.id,
        areaId: area.id,
        name: parsed.name,
        responsibilityType: responsibility.responsibilityType,
        responsibleMemberId: responsibility.responsibleMemberId,
        ...recurrence,
        recurrenceAnchor: now,
        load: parsed.load,
        status: "ACTIVE"
      }
    });
    await tx.taskOccurrence.create({
      data: {
        taskId: created.id,
        periodKey: periodKeyForRecurrence({ ...recurrence, recurrenceAnchor: now }, now, context.household.timezone)!,
        scheduledFor: now,
        responsibilityTypeSnapshot: responsibility.responsibilityType,
        responsibleMemberIdSnapshot: responsibility.responsibleMemberId,
        loadSnapshot: parsed.load
      }
    });
    return created;
  });

  return NextResponse.json({ task: await taskResponse(task.id) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const context = await getRealContext();
  if (!context) return NextResponse.json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });
  const body = await request.json().catch(() => null) as (TaskPayload & { taskId?: unknown; action?: unknown }) | null;
  if (typeof body?.taskId !== "string") return NextResponse.json({ error: "Tarefa inválida." }, { status: 400 });

  const existing = await prisma.task.findFirst({ where: { id: body.taskId, householdId: context.household.id } });
  if (!existing) return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });

  if (body.action === "archive") {
    await prisma.task.update({ where: { id: existing.id }, data: { status: "ARCHIVED", archivedAt: new Date() } });
    return NextResponse.json({ task: await taskResponse(existing.id) });
  }

  if (body.action === "edit") {
    const parsed = parseTaskPayload(body);
    if (!parsed) return NextResponse.json({ error: "Preencha nome, área, frequência e carga." }, { status: 400 });
    const area = await prisma.area.findFirst({ where: { id: parsed.areaId, householdId: context.household.id, status: "ACTIVE" } });
    if (!area) return NextResponse.json({ error: "A área informada não pertence a esta casa." }, { status: 400 });
    const responsibility = await resolveResponsibility(parsed.responsibility, context.household.id, context.membership.id);
    if (!responsibility) return NextResponse.json({ error: "Convide outra pessoa antes de atribuir uma tarefa a ela." }, { status: 400 });
    await prisma.task.update({
      where: { id: existing.id },
      data: {
        areaId: area.id,
        name: parsed.name,
        responsibilityType: responsibility.responsibilityType,
        responsibleMemberId: responsibility.responsibleMemberId,
        ...recurrenceFromLabel(parsed.recurrence),
        load: parsed.load
      }
    });
    return NextResponse.json({ task: await taskResponse(existing.id) });
  }

  const now = new Date();
  const periodKey = periodKeyForRecurrence(existing, now, context.household.timezone);
  if (!periodKey) return NextResponse.json({ error: "Esta tarefa ainda não possui uma ocorrência neste período." }, { status: 409 });
  await prisma.$transaction(async (tx) => {
    let occurrence = await tx.taskOccurrence.findUnique({ where: { taskId_periodKey: { taskId: existing.id, periodKey } } });
    if (!occurrence) {
      occurrence = await tx.taskOccurrence.create({
        data: {
          taskId: existing.id,
          periodKey,
          scheduledFor: now,
          responsibilityTypeSnapshot: existing.responsibilityType,
          responsibleMemberIdSnapshot: existing.responsibleMemberId,
          loadSnapshot: existing.load
        }
      });
    }
    const nextCount = Math.min(occurrence.completedCount + 1, occurrence.targetCompletions);
    const completesOccurrence = nextCount >= occurrence.targetCompletions;
    const updated = await tx.taskOccurrence.updateMany({
      where: { id: occurrence.id, status: "PENDING" },
      data: {
        status: completesOccurrence ? "COMPLETED" : "PENDING",
        completedAt: completesOccurrence ? now : null,
        completedCount: nextCount,
        starsGrantedSnapshot: completesOccurrence ? existing.load : 0
      }
    });
    if (updated.count) {
      await tx.occurrenceCompletion.create({ data: { occurrenceId: occurrence.id, completedById: context.dbUser.id, starsGranted: completesOccurrence ? existing.load : 0 } });
    }
  });
  return NextResponse.json({ task: await taskResponse(existing.id) });
}
