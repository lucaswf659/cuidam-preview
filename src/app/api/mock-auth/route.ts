import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { mockSessionId } from "@/lib/mock/store";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: unknown } | null;
  if (typeof body?.email !== "string" || !body.email.includes("@")) return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  // A sessão precisa estar disponível nas rotas da aplicação, não apenas em
  // `/api`. Sem o path explícito, o navegador pode limitar o cookie à rota que
  // fez o login e `/today`/`/nos` passam a parecer uma sessão expirada.
  (await cookies()).set("cuidam_mock_session", mockSessionId(body.email), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return NextResponse.json({ ok: true });
}
