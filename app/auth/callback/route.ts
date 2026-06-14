import { NextResponse } from "next/server";
import { createClient } from "@/lib/server/auth/server-client";

// CLAUDE.md 컨벤션: 변경은 Server Action 기본, OAuth 콜백만 예외적으로 Route Handler.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/profile";
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
