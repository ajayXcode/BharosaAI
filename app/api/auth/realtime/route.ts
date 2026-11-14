import { NextResponse } from "next/server";
import { supabaseServer, supabaseUrl } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await supabaseServer();
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  return NextResponse.json({
    url: supabaseUrl(),
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    token: data.session.access_token,
    userId: userData.user.id,
  });
}
