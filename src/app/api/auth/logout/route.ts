import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const mockMode = process.env.NEXT_PUBLIC_CUIDAM_MOCK !== "false";

export async function POST() {
  if (mockMode) {
    (await cookies()).set("cuidam_mock_session", "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0
    });
    return NextResponse.json({ ok: true });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) return NextResponse.json({ error: "Não foi possível sair agora." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

