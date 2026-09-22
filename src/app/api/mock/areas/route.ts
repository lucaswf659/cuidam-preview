import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { mockHouseholdForSession, updateMockHousehold } from "@/lib/mock/store";

export async function POST(request: Request) {
  const session = (await cookies()).get("cuidam_mock_session")?.value;
  const household = mockHouseholdForSession(session);
  if (!household) return NextResponse.json({ error: "Sua sessão expirou." }, { status: 401 });
  const body = await request.json().catch(() => null) as { name?: unknown; icon?: unknown } | null;
  if (typeof body?.name !== "string" || !body.name.trim()) return NextResponse.json({ error: "Informe um nome de área." }, { status: 400 });
  const area = { id: `mock-area-${Date.now()}`, name: body.name.trim().slice(0, 80), icon: typeof body.icon === "string" && body.icon.trim() ? body.icon.trim().slice(0, 12) : "🏡", sortOrder: household.areas.length };
  updateMockHousehold({ ...household, areas: [...household.areas, area] });
  return NextResponse.json({ area }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = (await cookies()).get("cuidam_mock_session")?.value;
  const household = mockHouseholdForSession(session);
  if (!household) return NextResponse.json({ error: "Sua sessão expirou." }, { status: 401 });
  const body = await request.json().catch(() => null) as { areaId?: unknown; name?: unknown; icon?: unknown } | null;
  if (typeof body?.areaId !== "string" || typeof body.name !== "string" || !body.name.trim()) return NextResponse.json({ error: "Informe um nome de área." }, { status: 400 });
  const area = household.areas.find((item) => item.id === body.areaId);
  if (!area) return NextResponse.json({ error: "Área não encontrada." }, { status: 404 });
  const areaName = (body.name as string).trim().slice(0, 80);
  const icon = typeof body.icon === "string" && body.icon.trim() ? body.icon.trim().slice(0, 12) : area.icon;
  const areas = household.areas.map((item) => item.id === body.areaId ? { ...item, name: areaName, icon } : item);
  updateMockHousehold({ ...household, areas });
  return NextResponse.json({ area: areas.find((item) => item.id === body.areaId) });
}
