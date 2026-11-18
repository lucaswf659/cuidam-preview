import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRealContext, getRealHouseholdSnapshot, recurrenceFromLabel } from "@/lib/real/household";
import { periodKeyForRecurrence } from "@/lib/real/recurrence";
import type { MockResponsibility } from "@/lib/mock/store";
import { DEFAULT_TASK_LOAD, starsForCompletedOccurrence } from "@/lib/task-load";

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
    (body.load !== undefined && (typeof body.load !== "number" || body.load < 1 || body.load > 5))
  ) return null;
  const responsibility: MockResponsibility = body.responsibility === "Nós" || body.responsibility === "Outra pessoa" ? body.responsibility : "Você";
  return { name: body.name.trim(), areaId: body.areaId, responsibility, recurrence: body.recurrence, load: body.load === undefined ? DEFAULT_TASK_LOAD : body.load as number };
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
  if (!parsed) return NextResponse.json({ error: "Preencha nome, área e frequência." }, { status: 400 });

  const area = await prisma.area.findFirst({ where: { id: parsed.areaId, householdId: context.household.id, status: "ACTIVE" } });
  if (!area) return NextResponse.json({ error: "A área informada não pertence a esta casa." }, { status: 400 });
  const responsibility = await resolveResponsibility(parsed.responsibility, context.household.id, context.membership.id);
  if (!responsibility) return NextResponse.json({ error: "Convide outra pessoa antes de atribuir uma tarefa a ela." }, { status: 400 });

  const now = new Date();
  const recurrence = recurrenceFromLabel(parsed.recurrence);
  const task = await prisma.task.create({
    data: {
      householdId: context.household.id,
      areaId: area.id,
      name: parsed.name,
      responsibilityType: responsibility.responsibilityType,
      responsibleMemberId: responsibility.responsibleMemberId,
      ...recurrence,
      recurrenceAnchor: now,
      load: parsed.load,
      status: "ACTIVE",
      occurrences: {
        create: {
          periodKey: periodKeyForRecurrence({ ...recurrence, recurrenceAnchor: now }, now, context.household.timezone)!,
          scheduledFor: now,
          targetCompletions: recurrence.recurrenceKind === "WEEKLY" ? recurrence.weeklyTarget : 1,
          responsibilityTypeSnapshot: responsibility.responsibilityType,
          responsibleMemberIdSnapshot: responsibility.responsibleMemberId,
          loadSnapshot: parsed.load
        }
      }
    }
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
        load: body.load === undefined ? existing.load : parsed.load
      }
    });
    return NextResponse.json({ task: await taskResponse(existing.id) });
  }

  const now = new Date();
  const periodKey = periodKeyForRecurrence(existing, now, context.household.timezone);
  if (!periodKey) return NextResponse.json({ error: "Esta tarefa ainda não possui uma ocorrência neste período." }, { status: 409 });

  if (body.action === "claim") {
    const claim = await prisma.$transaction(async (tx) => {
      const occurrence = await tx.taskOccurrence.upsert({
        where: { taskId_periodKey: { taskId: existing.id, periodKey } },
        create: {
          taskId: existing.id,
          periodKey,
          scheduledFor: now,
          targetCompletions: existing.recurrenceKind === "WEEKLY" ? existing.weeklyTarget : 1,
          responsibilityTypeSnapshot: existing.responsibilityType,
          responsibleMemberIdSnapshot: existing.responsibleMemberId,
          loadSnapshot: existing.load
        },
        update: {}
      });
      if (occurrence.status !== "PENDING") return { ok: false, error: "Esta ocorrência não está mais disponível." };
      if (occurrence.responsibilityTypeSnapshot !== "SHARED") return { ok: false, error: "Esta tarefa não é compartilhada." };
      if (occurrence.claimedByUserId === context.dbUser.id) return { ok: true };
      if (occurrence.claimedByUserId) return { ok: false, error: "Outra pessoa já está cuidando desta tarefa." };

      const updated = await tx.taskOccurrence.updateMany({
        where: { id: occurrence.id, status: "PENDING", claimedByUserId: null },
        data: { claimedByUserId: context.dbUser.id, claimedAt: now }
      });
      if (updated.count) return { ok: true };

      const latest = await tx.taskOccurrence.findUnique({ where: { id: occurrence.id } });
      if (latest?.status === "PENDING" && latest.claimedByUserId === context.dbUser.id) return { ok: true };
      return { ok: false, error: "Outra pessoa acabou de assumir esta tarefa. Atualize para ver o estado atual." };
    });

    if (!claim.ok) return NextResponse.json({ error: claim.error, task: await taskResponse(existing.id) }, { status: 409 });
    return NextResponse.json({ task: await taskResponse(existing.id) });
  }

  const completion = await prisma.$transaction(async (tx) => {
    const occurrence = await tx.taskOccurrence.upsert({
      where: { taskId_periodKey: { taskId: existing.id, periodKey } },
      create: {
        taskId: existing.id,
        periodKey,
        scheduledFor: now,
        targetCompletions: existing.recurrenceKind === "WEEKLY" ? existing.weeklyTarget : 1,
        responsibilityTypeSnapshot: existing.responsibilityType,
        responsibleMemberIdSnapshot: existing.responsibleMemberId,
        loadSnapshot: existing.load
      },
      update: {}
    });
    if (occurrence.status === "COMPLETED" || occurrence.completedCount >= occurrence.targetCompletions) return { ok: true };
    if (occurrence.status !== "PENDING") return { ok: false, error: "Esta ocorrência não está disponível neste período." };
    if (occurrence.responsibilityTypeSnapshot === "SHARED" && !occurrence.claimedByUserId) {
      return { ok: false, error: "Toque em “Vou cuidar” antes de concluir esta tarefa." };
    }
    if (occurrence.responsibilityTypeSnapshot === "SHARED" && occurrence.claimedByUserId !== context.dbUser.id) {
      return { ok: false, error: "Outra pessoa já está cuidando desta tarefa." };
    }

    const nextCount = Math.min(occurrence.completedCount + 1, occurrence.targetCompletions);
    const completesOccurrence = nextCount >= occurrence.targetCompletions;
    const starsGranted = completesOccurrence
      ? starsForCompletedOccurrence(occurrence.loadSnapshot, occurrence.targetCompletions)
      : 0;
    const updated = await tx.taskOccurrence.updateMany({
      where: {
        id: occurrence.id,
        status: "PENDING",
        completedCount: occurrence.completedCount,
        claimedByUserId: occurrence.claimedByUserId
      },
      data: {
        status: completesOccurrence ? "COMPLETED" : "PENDING",
        completedAt: completesOccurrence ? now : null,
        completedCount: nextCount,
        starsGrantedSnapshot: completesOccurrence ? starsGranted : 0,
        claimedByUserId: completesOccurrence ? null : occurrence.claimedByUserId,
        claimedAt: completesOccurrence ? null : occurrence.claimedAt
      }
    });
    if (!updated.count) return { ok: false, error: "Esta ocorrência foi atualizada. Atualize a tela para ver o estado atual." };

    await tx.occurrenceCompletion.create({
      data: { occurrenceId: occurrence.id, completedById: context.dbUser.id, starsGranted }
    });
    return { ok: true };
  });

  if (!completion.ok) return NextResponse.json({ error: completion.error, task: await taskResponse(existing.id) }, { status: 409 });
  return NextResponse.json({ task: await taskResponse(existing.id) });
}

