import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { mockHouseholdForSession, updateMockHousehold } from "@/lib/mock/store";

export async function POST(request: Request) {
  const session = (await cookies()).get("cuidam_mock_session")?.value;
  const household = mockHouseholdForSession(session);
  if (!household) return NextResponse.json({ error: "Sua sessão expirou." }, { status: 401 });
  const body = await request.json().catch(() => null) as { email?: unknown } | null;
  if (typeof body?.email !== "string" || !body.email.includes("@")) return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  updateMockHousehold({ ...household, inviteEmail: body.email.trim().toLowerCase() });
  return NextResponse.json({ sent: true });
}
