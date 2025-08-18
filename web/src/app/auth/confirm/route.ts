import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const hdrs = headers();
  const xfProto = hdrs.get('x-forwarded-proto') || 'https';
  const xfHost = hdrs.get('x-forwarded-host') || hdrs.get('host') || '';
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || `${xfProto}://${xfHost}`).replace(/\/$/, '');

  let nextPath = searchParams.get('next') ?? '/';
  if (!nextPath.startsWith('/')) nextPath = '/';
  const absoluteNextUrl = new URL(nextPath, siteUrl);

  // Fluxo 1: PKCE / code exchange (mais comum quando usamos emailRedirectTo)
  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => cookieStore.get(name)?.value,
          set: (name: string, value: string, options: any) => {
            cookieStore.set({ name, value, ...options });
          },
          remove: (name: string, options: any) => {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession({ code });
    if (!error) {
      // Se é convite de equipe, redirecionar para setup-password
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.invited_by_admin) {
        const role = user.user_metadata?.role || 'collaborator';
        return NextResponse.redirect(
          new URL(`/auth/setup-password?type=team-invite&role=${role}`, siteUrl)
        );
      }
      return NextResponse.redirect(absoluteNextUrl);
    }
  }

  // Fluxo 2: Email OTP (token_hash + type)
  if (token_hash && type) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => cookieStore.get(name)?.value,
          set: (name: string, value: string, options: any) => {
            cookieStore.set({ name, value, ...options });
          },
          remove: (name: string, options: any) => {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      }
    );

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      // Verificar se é convite de equipe e redirecionar adequadamente
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.invited_by_admin) {
        const role = user.user_metadata?.role || 'collaborator';
        return NextResponse.redirect(
          new URL(`/auth/setup-password?type=team-invite&role=${role}`, siteUrl)
        );
      }
      
      // Redirecionamento normal
      return NextResponse.redirect(absoluteNextUrl);
    }
  }

  // Redirecionar para página de erro
  return NextResponse.redirect(new URL('/auth/auth-code-error', siteUrl));
}
