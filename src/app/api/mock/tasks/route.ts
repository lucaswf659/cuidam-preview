import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { mockHouseholdForSession, updateMockHousehold } from "@/lib/mock/store";
import { DEFAULT_TASK_LOAD } from "@/lib/task-load";

export async function POST(request: Request) {
  const session = (await cookies()).get("cuidam_mock_session")?.value;
  const household = mockHouseholdForSession(session);
  if (!household) return NextResponse.json({ error: "Sua sessão expirou." }, { status: 401 });
  const body = await request.json().catch(() => null) as { name?: unknown; areaId?: unknown; responsibility?: unknown; recurrence?: unknown; dueDate?: unknown; load?: unknown } | null;
  const validRecurrences = ["Diária", "Semanal", "3× por semana", "Mensal", "Uma vez"];
  if (typeof body?.name !== "string" || !body.name.trim() || typeof body.areaId !== "string" || !validRecurrences.includes(String(body.recurrence)) || (body.recurrence === "Uma vez" && (typeof body.dueDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.dueDate) || Number.isNaN(Date.parse(`${body.dueDate}T12:00:00`)))) || (body.load !== undefined && (typeof body.load !== "number" || body.load < 1 || body.load > 5))) return NextResponse.json({ error: "Preencha nome, área e frequência." }, { status: 400 });
  if (!household.areas.some((area) => area.id === body.areaId)) return NextResponse.json({ error: "A área informada não pertence a esta casa." }, { status: 400 });
  const responsibility = body.responsibility === "Nós" || body.responsibility === "Outra pessoa" ? body.responsibility : "Você";
  const localToday = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  const dueDate = body.recurrence === "Uma vez" ? body.dueDate as string : undefined;
  const task = { id: `mock-task-${Date.now()}`, name: body.name.trim(), areaId: body.areaId, responsibility, recurrence: String(body.recurrence), ...(dueDate ? { dueDate, isOverdue: dueDate < localToday, occurrenceAvailable: dueDate <= localToday } : {}), load: body.load === undefined ? DEFAULT_TASK_LOAD : body.load as number, completed: false } as const;
  updateMockHousehold({ ...household, tasks: [...household.tasks, task] });
  return NextResponse.json({ task }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = (await cookies()).get("cuidam_mock_session")?.value;
  const household = mockHouseholdForSession(session);
  if (!household) return NextResponse.json({ error: "Sua sessão expirou." }, { status: 401 });
  const body = await request.json().catch(() => null) as { taskId?: unknown; action?: unknown; name?: unknown; areaId?: unknown; responsibility?: unknown; recurrence?: unknown; dueDate?: unknown; load?: unknown } | null;
  if (typeof body?.taskId !== "string") return NextResponse.json({ error: "Tarefa inválida." }, { status: 400 });
  const task = household.tasks.find((item) => item.id === body.taskId);
  if (!task) return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });
  if (body.action === "claim") {
    if (task.responsibility !== "Nós") return NextResponse.json({ error: "Esta tarefa não é compartilhada.", task }, { status: 409 });
    if (task.completed) return NextResponse.json({ error: "Esta ocorrência não está mais disponível.", task }, { status: 409 });
    if (task.claimInProgress && !task.claimOwnedByCurrentUser) return NextResponse.json({ error: "Outra pessoa já está cuidando desta tarefa.", task }, { status: 409 });
    task.claimInProgress = true;
    task.claimOwnedByCurrentUser = true;
    task.claimOwnerName = "Você";
  } else if (body.action === "archive") task.archived = true;
  else if (body.action === "transfer") {
    if (task.responsibility !== "Você" || household.memberCount < 2) return NextResponse.json({ error: "Só é possível passar para outra pessoa uma tarefa da sua responsabilidade." }, { status: 409 });
    task.responsibility = "Outra pessoa";
  }
  else if (body.action === "edit") {
    const validRecurrences = ["Diária", "Semanal", "3× por semana", "Mensal", "Uma vez"];
    if (typeof body.name !== "string" || !body.name.trim() || typeof body.areaId !== "string" || !validRecurrences.includes(String(body.recurrence)) || (body.recurrence === "Uma vez" && (typeof body.dueDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.dueDate) || Number.isNaN(Date.parse(`${body.dueDate}T12:00:00`)))) || (body.load !== undefined && (typeof body.load !== "number" || body.load < 1 || body.load > 5))) return NextResponse.json({ error: "Preencha nome, área e frequência." }, { status: 400 });
    if (!household.areas.some((area) => area.id === body.areaId)) return NextResponse.json({ error: "A área informada não pertence a esta casa." }, { status: 400 });
    task.name = body.name.trim(); task.areaId = body.areaId; task.responsibility = body.responsibility === "Nós" || body.responsibility === "Outra pessoa" ? body.responsibility : "Você"; task.recurrence = String(body.recurrence); task.dueDate = task.recurrence === "Uma vez" ? body.dueDate as string : undefined; if (task.recurrence === "Uma vez") { const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10); task.isOverdue = task.dueDate! < today; task.occurrenceAvailable = task.dueDate! <= today; } else { task.isOverdue = false; task.occurrenceAvailable = true; } if (body.load !== undefined) task.load = body.load as number;
  } else {
    if (task.responsibility === "Nós" && !task.claimOwnedByCurrentUser) {
      return NextResponse.json({ error: "Toque em “Vou cuidar” antes de concluir esta tarefa.", task }, { status: 409 });
    }
    task.completed = true;
    task.completedAt = new Date().toISOString();
    task.claimInProgress = false;
    task.claimOwnedByCurrentUser = false;
    task.claimOwnerName = undefined;
  }
  updateMockHousehold(household);
  return NextResponse.json({ task });
}

