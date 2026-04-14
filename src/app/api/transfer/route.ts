import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { TransferResult } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { receiver_id, amount, pin, narration } = body as Record<string, unknown>;

    // ── Input validation ──────────────────────────────────────────────────────
    if (!receiver_id || !amount || !pin) {
      return NextResponse.json(
        { error: 'Missing required fields: receiver_id, amount, pin' },
        { status: 400 }
      );
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: 'PIN must be a 4-digit number' },
        { status: 400 }
      );
    }

    if (user.id === receiver_id) {
      return NextResponse.json(
        { error: 'Cannot transfer money to yourself' },
        { status: 400 }
      );
    }

    // ── PIN lockout check ─────────────────────────────────────────────────────
    const { data: lockSeconds, error: lockErr } = await supabase.rpc(
      'check_pin_lockout',
      { p_user_id: user.id } as never
    );

    if (!lockErr && typeof lockSeconds === 'number' && lockSeconds > 0) {
      const minsLeft = Math.ceil(lockSeconds / 60);
      return NextResponse.json(
        {
          error: 'PIN_LOCKED',
          message: `Too many wrong attempts. Try again in ${minsLeft} minute${minsLeft === 1 ? '' : 's'}.`,
          seconds_remaining: lockSeconds,
        },
        { status: 429 }
      );
    }

    // ── Execute transfer (ACID via DB function) ───────────────────────────────
    const { data, error } = await supabase.rpc('execute_transfer', {
      p_sender_id:   user.id,
      p_receiver_id: receiver_id,
      p_amount:      amount,
      p_pin:         pin,
      p_narration:   narration ?? null,
    } as never);

    if (error) {
      const message = error.message;

      // ── Wrong PIN: track the attempt ─────────────────────────────────────
      if (message.includes('INVALID_PIN')) {
        const { data: attemptsLeft } = await supabase.rpc(
          'record_failed_pin',
          { p_user_id: user.id } as never
        );

        const remaining = typeof attemptsLeft === 'number' ? attemptsLeft : 0;
        const isNowLocked = remaining === 0;

        return NextResponse.json(
          {
            error: 'INVALID_PIN',
            message: isNowLocked
              ? 'PIN locked for 15 minutes after too many failed attempts.'
              : `Incorrect PIN. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
            attempts_remaining: remaining,
            locked: isNowLocked,
          },
          { status: 403 }
        );
      }

      if (message.includes('INSUFFICIENT_FUNDS')) {
        return NextResponse.json({ error: 'Insufficient funds' }, { status: 422 });
      }
      if (message.includes('RECEIVER_NOT_FOUND')) {
        return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
      }
      if (message.includes('PIN_NOT_SET')) {
        return NextResponse.json(
          { error: 'PIN not set', message: 'Set up your transaction PIN first.' },
          { status: 403 }
        );
      }

      return NextResponse.json({ error: message }, { status: 500 });
    }

    // ── Success: reset attempt counter ────────────────────────────────────────
    await supabase.rpc('reset_pin_attempts', { p_user_id: user.id } as never);

    return NextResponse.json(data as TransferResult, { status: 200 });

  } catch (err) {
    console.error('[Transfer API] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
