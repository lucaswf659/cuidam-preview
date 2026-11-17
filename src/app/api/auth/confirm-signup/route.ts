import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeReturnPath(value: unknown, origin: string) {
  if (typeof value !== "string" || value.length > 2048) return "/entrar?confirmed=1";
  try {
    const url = new URL(value, origin);
    if (url.origin !== origin) return "/entrar?confirmed=1";
    const isEntry = url.pathname === "/entrar";
    const isInvitation = /^\/convite\/[a-zA-Z0-9_-]+$/.test(url.pathname);
    if (!isEntry && !isInvitation) return "/entrar?confirmed=1";
    if (isEntry) {
      url.search = "";
      url.hash = "";
      url.searchParams.set("confirmed", "1");
    } else {
      url.search = "";
      url.hash = "";
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return "/entrar?confirmed=1";
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const tokenHash = typeof body?.tokenHash === "string" ? body.tokenHash : "";
  if (!tokenHash || tokenHash.length > 512) {
    return NextResponse.json({ error: "Link de confirmação inválido." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
  if (error) {
    return NextResponse.json({ error: "Este link expirou ou já foi usado. Peça uma nova confirmação." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, next: safeReturnPath(body?.next, new URL(request.url).origin) });
}
