import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { mockHouseholdForSession, updateMockHousehold } from "@/lib/mock/store";

const demoInvitationId = "mock-pending-invite";

export async function POST(request: Request) {
  const session = (await cookies()).get("cuidam_mock_session")?.value;
  const household = mockHouseholdForSession(session);
  if (!household) return NextResponse.json({ error: "Sua sessão expirou." }, { status: 401 });
  const body = await request.json().catch(() => null) as { email?: unknown } | null;
  if (typeof body?.email !== "string" || !body.email.includes("@")) return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  const email = body.email.trim().toLowerCase();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  updateMockHousehold({ ...household, inviteEmail: email, invitations: [{ id: demoInvitationId, email, expiresAt }] });
  return NextResponse.json({ created: true, invitation: { id: demoInvitationId, email, expiresAt }, inviteUrl: "/convite/demo", expiresAt });
}

export async function DELETE() {
  const session = (await cookies()).get("cuidam_mock_session")?.value;
  const household = mockHouseholdForSession(session);
  if (!household) return NextResponse.json({ error: "Sua sessão expirou." }, { status: 401 });
  updateMockHousehold({ ...household, inviteEmail: undefined, invitations: [] });
  return NextResponse.json({ cancelled: true });
}
