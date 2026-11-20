import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRealContext, getRealHouseholdSnapshot, recurrenceFromLabel, recurrenceLabel } from "@/lib/real/household";
import { currentPeriodKey, dateAtNoonInTimeZone, periodKeyForRecurrence } from "@/lib/real/recurrence";
import type { MockResponsibility } from "@/lib/mock/store";
import { DEFAULT_TASK_LOAD, starsForCompletedOccurrence } from "@/lib/task-load";

const validRecurrences = ["Diária", "Semanal", "3× por semana", "Mensal", "Uma vez"];

type TaskPayload = {
  name?: unknown;
  areaId?: unknown;
  responsibility?: unknown;
  recurrence?: unknown;
  dueDate?: unknown;
  load?: unknown;
};

function parseTaskPayload(body: TaskPayload) {
  if (
    typeof body.name !== "string" || !body.name.trim() ||
    typeof body.areaId !== "string" ||
    typeof body.recurrence !== "string" || !validRecurrences.includes(body.recurrence) ||
    (body.recurrence === "Uma vez" && (typeof body.dueDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.dueDate))) ||
    (body.load !== undefined && (typeof body.load !== "number" || body.load < 1 || body.load > 5))
  ) return null;
  const responsibility: MockResponsibility = body.responsibility === "Nós" || body.responsibility === "Outra pessoa" ? body.responsibility : "Você";
  return { name: body.name.trim(), areaId: body.areaId, responsibility, recurrence: body.recurrence, dueDate: typeof body.dueDate === "string" ? body.dueDate : undefined, load: body.load === undefined ? DEFAULT_TASK_LOAD : body.load as number };
}

async function resolveResponsibility(responsibility: MockResponsibility, householdId: string, membershipId: string) {
  if (responsibility === "Nós") return { responsibilityType: "SHARED" as const, responsibleMemberId: null };
  if (responsibility === "Você") return { responsibilityType: "PERSON" as const, responsibleMemberId: membershipId };
  const other = await prisma.membership.findFirst({ where: { householdId, status: "ACTIVE", id: { not: membershipId } }, orderBy: { joinedAt: "asc" } });
  return other ? { responsibilityType: "PERSON" as const, responsibleMemberId: other.id } : null;
}

type TaskResponseContext = NonNullable<Awaited<ReturnType<typeof getRealContext>>>;
type TaskRecord = Prisma.TaskGetPayload<{}>;
type OccurrenceRecord = Prisma.TaskOccurrenceGetPayload<{ include: { claimedBy: { select: { id: true; name: true } } } }>;

function taskResponse(task: TaskRecord, occurrence: OccurrenceRecord | null | undefined, context: TaskResponseContext) {
  const now = new Date();
  const dueDate = task.recurrenceKind === "ONCE" ? currentPeriodKey(task.recurrenceAnchor, context.household.timezone) : undefined;
  const usePendingSnapshot = occurrence?.status === "PENDING";
  const responsibilityType = usePendingSnapshot ? occurrence.responsibilityTypeSnapshot : task.responsibilityType;
  const responsibleMemberId = usePendingSnapshot ? occurrence.responsibleMemberIdSnapshot : task.responsibleMemberId;
  const responsibility: MockResponsibility = responsibilityType === "SHARED"
    ? "Nós"
    : responsibleMemberId === context.membership.id
      ? "Você"
      : "Outra pessoa";

  return {
    id: task.id,
    name: task.name,
    areaId: task.areaId,
    responsibility,
    recurrence: recurrenceLabel(task.recurrenceKind, task.recurrenceInterval, task.weeklyTarget),
    ...(dueDate ? { dueDate, isOverdue: dueDate < currentPeriodKey(now, context.household.timezone) } : {}),
    load: occurrence?.loadSnapshot ?? task.load,
    completed: occurrence?.status === "COMPLETED" || Boolean(occurrence && occurrence.completedCount >= occurrence.targetCompletions),
    completedCount: occurrence?.completedCount ?? 0,
    targetCompletions: occurrence?.targetCompletions ?? (task.recurrenceKind === "WEEKLY" ? task.weeklyTarget : 1),
    occurrenceAvailable: periodKeyForRecurrence(task, now, context.household.timezone) === occurrence?.periodKey,
    completedAt: occurrence?.completedAt?.toISOString(),
    archived: task.status === "ARCHIVED",
    claimInProgress: occurrence?.status === "PENDING" && Boolean(occurrence.claimedByUserId),
    claimOwnedByCurrentUser: occurrence?.status === "PENDING" && occurrence.claimedByUserId === context.dbUser.id,
    claimOwnerName: occurrence?.claimedBy?.name
  };
}

async function getTaskResponse(taskId: string, context: TaskResponseContext) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, householdId: context.household.id },
    include: {
      occurrences: {
        orderBy: { scheduledFor: "desc" },
        take: 1,
        include: { claimedBy: { select: { id: true, name: true } } }
      }
    }
  });
  if (!task) return null;
  return taskResponse(task, task.occurrences[0], context);
}

export async function GET(request: Request) {
  if (process.env.NEXT_PUBLIC_CUIDAM_MOCK !== "false") {
    return NextResponse.json({ error: "O app móvel precisa do ambiente com backend real." }, { status: 503 });
  }
  const household = await getRealHouseholdSnapshot(request);
  if (!household) return NextResponse.json({ error: "Entre novamente ou configure sua casa." }, { status: 401 });
  return NextResponse.json({ household });
}

export async function POST(request: Request) {
  const context = await getRealContext(request);
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
  const recurrenceAnchor = recurrence.recurrenceKind === "ONCE"
    ? dateAtNoonInTimeZone(parsed.dueDate ?? "", context.household.timezone)
    : now;
  if (!recurrenceAnchor) return NextResponse.json({ error: "Informe uma data válida para a tarefa pontual." }, { status: 400 });
  const periodKey = periodKeyForRecurrence({ ...recurrence, recurrenceAnchor }, now, context.household.timezone);
  const task = await prisma.task.create({
    data: {
      householdId: context.household.id,
      areaId: area.id,
      name: parsed.name,
      responsibilityType: responsibility.responsibilityType,
      responsibleMemberId: responsibility.responsibleMemberId,
      ...recurrence,
      recurrenceAnchor,
      load: parsed.load,
      status: "ACTIVE",
      ...(periodKey ? { occurrences: {
        create: {
          periodKey,
          scheduledFor: recurrenceAnchor,
          targetCompletions: recurrence.recurrenceKind === "WEEKLY" ? recurrence.weeklyTarget : 1,
          responsibilityTypeSnapshot: responsibility.responsibilityType,
          responsibleMemberIdSnapshot: responsibility.responsibleMemberId,
          loadSnapshot: parsed.load
        }
      } } : {})
    }
  });

  return NextResponse.json({ task: await getTaskResponse(task.id, context) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const context = await getRealContext(request);
  if (!context) return NextResponse.json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });
  const body = await request.json().catch(() => null) as (TaskPayload & { taskId?: unknown; action?: unknown }) | null;
  if (typeof body?.taskId !== "string") return NextResponse.json({ error: "Tarefa inválida." }, { status: 400 });

  const existing = await prisma.task.findFirst({ where: { id: body.taskId, householdId: context.household.id } });
  if (!existing) return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });

  if (body.action === "archive") {
    await prisma.task.update({ where: { id: existing.id }, data: { status: "ARCHIVED", archivedAt: new Date() } });
    return NextResponse.json({ task: await getTaskResponse(existing.id, context) });
  }

  if (body.action === "transfer") {
    if (existing.responsibilityType !== "PERSON" || existing.responsibleMemberId !== context.membership.id) {
      return NextResponse.json({ error: "Só é possível passar para outra pessoa uma tarefa da sua responsabilidade." }, { status: 409 });
    }
    const recipient = await prisma.membership.findFirst({
      where: { householdId: context.household.id, status: "ACTIVE", id: { not: context.membership.id } },
      orderBy: { joinedAt: "asc" }
    });
    if (!recipient) return NextResponse.json({ error: "Convide outra pessoa para passar esta tarefa." }, { status: 400 });
    await prisma.$transaction(async (tx) => {
      await tx.task.update({ where: { id: existing.id }, data: { responsibilityType: "PERSON", responsibleMemberId: recipient.id } });
      await tx.taskOccurrence.updateMany({
        where: { taskId: existing.id, status: "PENDING" },
        data: { responsibilityTypeSnapshot: "PERSON", responsibleMemberIdSnapshot: recipient.id, claimedByUserId: null, claimedAt: null }
      });
    });
    return NextResponse.json({ task: await getTaskResponse(existing.id, context) });
  }

  if (body.action === "edit") {
    const parsed = parseTaskPayload(body);
    if (!parsed) return NextResponse.json({ error: "Preencha nome, área, frequência e carga." }, { status: 400 });
    const area = await prisma.area.findFirst({ where: { id: parsed.areaId, householdId: context.household.id, status: "ACTIVE" } });
    if (!area) return NextResponse.json({ error: "A área informada não pertence a esta casa." }, { status: 400 });
    const responsibility = await resolveResponsibility(parsed.responsibility, context.household.id, context.membership.id);
    if (!responsibility) return NextResponse.json({ error: "Convide outra pessoa antes de atribuir uma tarefa a ela." }, { status: 400 });
    const recurrence = recurrenceFromLabel(parsed.recurrence);
    const recurrenceAnchor = recurrence.recurrenceKind === "ONCE"
      ? dateAtNoonInTimeZone(parsed.dueDate ?? "", context.household.timezone)
      : existing.recurrenceAnchor;
    if (!recurrenceAnchor) return NextResponse.json({ error: "Informe uma data válida para a tarefa pontual." }, { status: 400 });
    await prisma.task.update({
      where: { id: existing.id },
      data: {
        areaId: area.id,
        name: parsed.name,
        responsibilityType: responsibility.responsibilityType,
        responsibleMemberId: responsibility.responsibleMemberId,
        ...recurrence,
        recurrenceAnchor,
        load: body.load === undefined ? existing.load : parsed.load
      }
    });
    const household = await getRealHouseholdSnapshot(request);
    return NextResponse.json({ task: household?.tasks.find((task) => task.id === existing.id) ?? null });
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
        update: {},
        include: { claimedBy: { select: { id: true, name: true } } }
      });
      if (occurrence.status !== "PENDING") return { ok: false, error: "Esta ocorrência não está mais disponível.", occurrence };
      if (occurrence.responsibilityTypeSnapshot !== "SHARED") return { ok: false, error: "Esta tarefa não é compartilhada.", occurrence };
      if (occurrence.claimedByUserId === context.dbUser.id) return { ok: true, occurrence };
      if (occurrence.claimedByUserId) return { ok: false, error: "Outra pessoa já está cuidando desta tarefa.", occurrence };

      const updated = await tx.taskOccurrence.updateMany({
        where: { id: occurrence.id, status: "PENDING", claimedByUserId: null },
        data: { claimedByUserId: context.dbUser.id, claimedAt: now }
      });
      if (updated.count) return {
        ok: true,
        occurrence: {
          ...occurrence,
          claimedByUserId: context.dbUser.id,
          claimedAt: now,
          claimedBy: { id: context.dbUser.id, name: context.dbUser.name }
        }
      };

      const latest = await tx.taskOccurrence.findUnique({ where: { id: occurrence.id }, include: { claimedBy: { select: { id: true, name: true } } } });
      if (latest?.status === "PENDING" && latest.claimedByUserId === context.dbUser.id) return { ok: true, occurrence: latest };
      return { ok: false, error: "Outra pessoa acabou de assumir esta tarefa. Atualize para ver o estado atual.", occurrence: latest ?? occurrence };
    });

    const task = taskResponse(existing, claim.occurrence, context);
    if (!claim.ok) return NextResponse.json({ error: claim.error, task }, { status: 409 });
    return NextResponse.json({ task });
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
        update: {},
        include: { claimedBy: { select: { id: true, name: true } } }
    });
      if (occurrence.status === "COMPLETED" || occurrence.completedCount >= occurrence.targetCompletions) return { ok: true, occurrence };
    if (occurrence.status !== "PENDING") return { ok: false, error: "Esta ocorrência não está disponível neste período.", occurrence };
    if (occurrence.responsibilityTypeSnapshot === "SHARED" && !occurrence.claimedByUserId) {
      return { ok: false, error: "Toque em “Vou cuidar” antes de concluir esta tarefa.", occurrence };
    }
    if (occurrence.responsibilityTypeSnapshot === "SHARED" && occurrence.claimedByUserId !== context.dbUser.id) {
      return { ok: false, error: "Outra pessoa já está cuidando desta tarefa.", occurrence };
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
    if (!updated.count) return { ok: false, error: "Esta ocorrência foi atualizada. Atualize a tela para ver o estado atual.", occurrence };

    await tx.occurrenceCompletion.create({
      data: { occurrenceId: occurrence.id, completedById: context.dbUser.id, starsGranted }
    });
    return {
      ok: true,
      occurrence: {
        ...occurrence,
        status: completesOccurrence ? "COMPLETED" as const : "PENDING" as const,
        completedAt: completesOccurrence ? now : null,
        completedCount: nextCount,
        starsGrantedSnapshot: completesOccurrence ? starsGranted : 0,
        claimedByUserId: completesOccurrence ? null : occurrence.claimedByUserId,
        claimedAt: completesOccurrence ? null : occurrence.claimedAt,
        claimedBy: completesOccurrence ? null : occurrence.claimedBy
      }
    };
  });

  const task = taskResponse(existing, completion.occurrence, context);
  if (!completion.ok) return NextResponse.json({ error: completion.error, task }, { status: 409 });
  return NextResponse.json({ task });
}

