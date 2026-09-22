import { NextResponse } from "next/server";
import { ensureAllCurrentOccurrences } from "@/lib/real/occurrences";

function authorized(request: Request) {
  const secret = process.env.CUIDAM_CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const processed = await ensureAllCurrentOccurrences();
  return NextResponse.json({ processed });
}

export async function GET(request: Request) {
  return POST(request);
}
