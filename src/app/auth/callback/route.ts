import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next");
  const next = requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/";

  const redirectWithError = () => {
    const destination = new URL(next, url.origin);
    destination.searchParams.set("error", "link_invalid");
    return NextResponse.redirect(destination);
  };

  if (!code) return redirectWithError();

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return redirectWithError();

  return NextResponse.redirect(new URL(next, url.origin));
}
