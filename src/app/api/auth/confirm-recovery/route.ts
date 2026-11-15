import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const tokenHash = typeof body?.tokenHash === "string" ? body.tokenHash : "";
  if (!tokenHash || tokenHash.length > 512) {
    return NextResponse.json({ error: "Link de recuperação inválido." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
  if (error) {
    return NextResponse.json({ error: "Este link expirou ou já foi usado. Peça uma nova mensagem." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

