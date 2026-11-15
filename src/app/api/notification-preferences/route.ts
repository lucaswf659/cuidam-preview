import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRealContext } from "@/lib/real/household";
import { defaultNotificationPreferences, isValidQuietTime } from "@/lib/real/notifications";
import { mockHouseholdForSession, mockNotificationPreferencesForSession } from "@/lib/mock/store";

const mockMode = process.env.NEXT_PUBLIC_CUIDAM_MOCK !== "false";

export async function GET() {
  if (mockMode) {
    const session = (await cookies()).get("cuidam_mock_session")?.value;
    if (!session || !mockHouseholdForSession(session)) return NextResponse.json({ error: "Sua sessão expirou." }, { status: 401 });
    return NextResponse.json({ preferences: mockNotificationPreferencesForSession(session) });
  }
  const context = await getRealContext();
  if (!context) return NextResponse.json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });
  const saved = await prisma.notificationPreference.findUnique({ where: { membershipId: context.membership.id } });
  return NextResponse.json({ preferences: { ...defaultNotificationPreferences, ...saved, quietStart: saved?.quietStart ?? defaultNotificationPreferences.quietStart, quietEnd: saved?.quietEnd ?? defaultNotificationPreferences.quietEnd } });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.morningReminder !== "boolean" || typeof body.activity !== "boolean" || typeof body.sharedTask !== "boolean" || !isValidQuietTime(body.quietStart) || !isValidQuietTime(body.quietEnd) || body.quietStart === body.quietEnd) {
    return NextResponse.json({ error: "Confira as opções e os horários de silêncio." }, { status: 400 });
  }
  const preferences = { morningReminder: body.morningReminder, activity: body.activity, sharedTask: body.sharedTask, quietStart: body.quietStart, quietEnd: body.quietEnd };
  if (mockMode) {
    const session = (await cookies()).get("cuidam_mock_session")?.value;
    if (!session || !mockHouseholdForSession(session)) return NextResponse.json({ error: "Sua sessão expirou." }, { status: 401 });
    mockNotificationPreferencesForSession(session, preferences);
    return NextResponse.json({ preferences });
  }
  const context = await getRealContext();
  if (!context) return NextResponse.json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });
  const saved = await prisma.notificationPreference.upsert({
    where: { membershipId: context.membership.id },
    create: { membershipId: context.membership.id, ...preferences },
    update: preferences
  });
  return NextResponse.json({ preferences: { ...defaultNotificationPreferences, ...saved, quietStart: saved.quietStart ?? defaultNotificationPreferences.quietStart, quietEnd: saved.quietEnd ?? defaultNotificationPreferences.quietEnd } });
}
