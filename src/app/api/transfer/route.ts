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
    const { receiver_id, amount, pin, narration } = body;

    // Validate request body
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

    // Execute transfer via database function (ACID)
    const { data, error } = await supabase.rpc('execute_transfer', {
      p_sender_id: user.id,
      p_receiver_id: receiver_id,
      p_amount: amount,
      p_pin: pin,
      p_narration: narration || null,
    } as never);

    if (error) {
      // Parse database error codes
      const message = error.message;

      if (message.includes('INVALID_PIN')) {
        return NextResponse.json({ error: 'Invalid PIN' }, { status: 403 });
      }
      if (message.includes('INSUFFICIENT_FUNDS')) {
        return NextResponse.json({ error: 'Insufficient funds' }, { status: 422 });
      }
      if (message.includes('RECEIVER_NOT_FOUND')) {
        return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
      }
      if (message.includes('PIN_NOT_SET')) {
        return NextResponse.json({ error: 'Transaction PIN not set' }, { status: 403 });
      }

      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json(data as TransferResult, { status: 200 });

  } catch (err) {
    console.error('[Transfer API] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
