import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function POST() {
  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON) {
      return NextResponse.json(
        { error: "SUPABASE_URL/ANON ausentes" },
        { status: 500 },
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    });
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token)
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const fnUrl = `${SUPABASE_URL}/functions/v1/pull-evo-instances`;
    const fnRes = await fetch(fnUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const fnJson = await fnRes.json().catch(() => ({}));

    return NextResponse.json(fnJson, { status: fnRes.status });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
