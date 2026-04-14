import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { email, password, full_name } = body as Record<string, string>;

  if (!email || !password || !full_name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { data: { full_name: full_name.trim() } },
  });

  if (error) {
    // Log the full error so it appears in the Next.js dev-server terminal
    console.error('[sign-up] Supabase error:', {
      message: error.message,
      status: error.status,
        code: (error as unknown as { code?: string }).code,
      cause: (error as unknown as { cause?: unknown }).cause,
    });

    const msg = error.message ?? 'Sign up failed';

    // ── Map known Supabase codes to actionable messages ──────────────────────
    // "Database error saving new user"
    //   → migration not applied or trigger broken
    if (msg.toLowerCase().includes('database error saving')) {
      return NextResponse.json({
        error: 'Database not set up yet.',
        hint: 'Apply the SQL migration at /setup before creating accounts.',
        supabase_error: msg,
      }, { status: 503 });
    }

    // "Email signups are disabled"
    if (msg.toLowerCase().includes('email signups are disabled') ||
        msg.toLowerCase().includes('sign ups not allowed')) {
      return NextResponse.json({
        error: 'Email sign-ups are disabled in your Supabase project.',
        hint: 'Dashboard → Authentication → Providers → Email → enable "Email" provider.',
        supabase_error: msg,
      }, { status: 503 });
    }

    // "User already registered"
    if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already been registered')) {
      return NextResponse.json({ error: 'User already registered' }, { status: 409 });
    }

    return NextResponse.json({ error: msg, supabase_error: msg }, { status: 400 });
  }

  return NextResponse.json({
    user: { id: data.user?.id, email: data.user?.email },
    session: data.session ? 'active' : 'pending_confirmation',
  });
}
