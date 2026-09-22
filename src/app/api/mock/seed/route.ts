import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { mockHouseholdForSession, updateMockHousehold } from "@/lib/mock/store";

const names = ["Limpar rodapés", "Conferir mantimentos", "Lavar panos", "Organizar armário", "Tirar o lixo", "Higienizar maçanetas", "Repor produtos", "Limpar janelas", "Revisar estoque", "Guardar compras", "Trocar toalhas", "Regar plantas", "Separar recicláveis", "Limpar eletrodomésticos", "Organizar gavetas", "Revisar itens vencidos", "Aspirar cantos", "Limpar interruptores", "Lavar tapetes", "Planejar compras", "Dobrar roupas", "Limpar portas", "Organizar prateleiras", "Repor sacos"];
const recurrences = ["Diária", "Semanal", "3× por semana", "Mensal"];

export async function GET() {
  const session = (await cookies()).get("cuidam_mock_session")?.value;
  const household = mockHouseholdForSession(session);
  if (!household) return NextResponse.json({ error: "Sua sessão expirou." }, { status: 401 });
  const areas = household.areas.length ? household.areas : [{ id: "home", name: "Casa", icon: "⌂", sortOrder: 0 }];
  const extra = names.map((name, index) => ({ id: `seed-task-${Date.now()}-${index}`, name, areaId: areas[index % areas.length].id, responsibility: index % 3 === 0 ? "Nós" as const : index % 3 === 1 ? "Outra pessoa" as const : "Você" as const, recurrence: recurrences[index % recurrences.length], load: (index % 5) + 1, completed: index % 7 === 0 }));
  updateMockHousehold({ ...household, tasks: [...household.tasks, ...extra] });
  return NextResponse.json({ added: extra.length, total: household.tasks.length + extra.length });
}
