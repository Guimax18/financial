import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/src/lib/supabase-server';
import { safeRedirect } from '@/src/lib/safe-redirect';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeRedirect(request.nextUrl.searchParams.get('next'), '/onboarding'), request.url));
  }
  return NextResponse.redirect(new URL('/login?error=confirmation', request.url));
}
