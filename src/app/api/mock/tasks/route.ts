import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { mockHouseholdForSession, updateMockHousehold } from "@/lib/mock/store";

export async function POST(request: Request) {
  const session = (await cookies()).get("cuidam_mock_session")?.value;
  const household = mockHouseholdForSession(session);
  if (!household) return NextResponse.json({ error: "Sua sessão expirou." }, { status: 401 });
  const body = await request.json().catch(() => null) as { name?: unknown; areaId?: unknown; responsibility?: unknown; recurrence?: unknown; load?: unknown } | null;
  const validRecurrences = ["Diária", "Semanal", "3× por semana", "Mensal"];
  if (typeof body?.name !== "string" || !body.name.trim() || typeof body.areaId !== "string" || !validRecurrences.includes(String(body.recurrence)) || typeof body.load !== "number" || body.load < 1 || body.load > 5) return NextResponse.json({ error: "Preencha nome, área, frequência e carga." }, { status: 400 });
  if (!household.areas.some((area) => area.id === body.areaId)) return NextResponse.json({ error: "A área informada não pertence a esta casa." }, { status: 400 });
  const responsibility = body.responsibility === "Nós" || body.responsibility === "Outra pessoa" ? body.responsibility : "Você";
  const task = { id: `mock-task-${Date.now()}`, name: body.name.trim(), areaId: body.areaId, responsibility, recurrence: String(body.recurrence), load: body.load, completed: false } as const;
  updateMockHousehold({ ...household, tasks: [...household.tasks, task] });
  return NextResponse.json({ task }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = (await cookies()).get("cuidam_mock_session")?.value;
  const household = mockHouseholdForSession(session);
  if (!household) return NextResponse.json({ error: "Sua sessão expirou." }, { status: 401 });
  const body = await request.json().catch(() => null) as { taskId?: unknown; action?: unknown; name?: unknown; areaId?: unknown; responsibility?: unknown; recurrence?: unknown; load?: unknown } | null;
  if (typeof body?.taskId !== "string") return NextResponse.json({ error: "Tarefa inválida." }, { status: 400 });
  const task = household.tasks.find((item) => item.id === body.taskId);
  if (!task) return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });
  if (body.action === "archive") task.archived = true;
  else if (body.action === "edit") {
    const validRecurrences = ["Diária", "Semanal", "3× por semana", "Mensal"];
    if (typeof body.name !== "string" || !body.name.trim() || typeof body.areaId !== "string" || !validRecurrences.includes(String(body.recurrence)) || typeof body.load !== "number" || body.load < 1 || body.load > 5) return NextResponse.json({ error: "Preencha nome, área, frequência e carga." }, { status: 400 });
    if (!household.areas.some((area) => area.id === body.areaId)) return NextResponse.json({ error: "A área informada não pertence a esta casa." }, { status: 400 });
    task.name = body.name.trim(); task.areaId = body.areaId; task.responsibility = body.responsibility === "Nós" || body.responsibility === "Outra pessoa" ? body.responsibility : "Você"; task.recurrence = String(body.recurrence); task.load = body.load;
  } else { task.completed = true; task.completedAt = new Date().toISOString(); }
  updateMockHousehold(household);
  return NextResponse.json({ task });
}
