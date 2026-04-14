import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';

type ProfileRow = { id: string; full_name: string; account_number: string };

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { target_id, amount, note } = body as Record<string, unknown>;

    // ── Validation ───────────────────────────────────────────────────────────
    if (!target_id || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: target_id, amount' },
        { status: 400 }
      );
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    if (user.id === target_id) {
      return NextResponse.json(
        { error: 'Cannot request money from yourself' },
        { status: 400 }
      );
    }

    // ── Fetch requester profile ───────────────────────────────────────────────
    const { data: rawRequester, error: requesterErr } = await supabase
      .from('profiles')
      .select('id, full_name, account_number')
      .eq('id', user.id)
      .single() as unknown as { data: ProfileRow | null; error: unknown };

    if (requesterErr || !rawRequester) {
      return NextResponse.json({ error: 'Requester profile not found' }, { status: 404 });
    }
    const requesterProfile = rawRequester;

    // ── Verify target exists ──────────────────────────────────────────────────
    const { data: rawTarget, error: targetErr } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', target_id as string)
      .single() as unknown as { data: { id: string; full_name: string } | null; error: unknown };

    if (targetErr || !rawTarget) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }
    const targetProfile = rawTarget;

    // ── Insert notification for target user ───────────────────────────────────
    const { error: notifErr } = await supabase
      .from('notifications')
      .insert({
        user_id: target_id as string,
        type:    'payment_request',
        title:   `${requesterProfile.full_name} requested money`,
        body:    note
          ? `"${note}" — ${formatCurrency(amount)}`
          : `Requesting ${formatCurrency(amount)} from you`,
        is_read: false,
        metadata: {
          is_payment_request: true,
          requester_id:       user.id,
          requester_name:     requesterProfile.full_name,
          requester_account:  requesterProfile.account_number,
          amount:             amount,
          note:               (note as string | undefined) ?? null,
        },
      } as never);

    if (notifErr) {
      console.error('[Request Money] Insert notification failed:', notifErr);
      return NextResponse.json({ error: notifErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Payment request sent to ${targetProfile.full_name}`,
    });

  } catch (err) {
    console.error('[Request Money API] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
