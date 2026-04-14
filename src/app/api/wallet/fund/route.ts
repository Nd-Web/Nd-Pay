import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const FUND_AMOUNT = 1000;
const DAILY_LIMIT = 5; // max self-funds per day

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check daily self-fund count (prevent abuse)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('sender_id', user.id)
      .eq('receiver_id', user.id)
      .eq('type', 'deposit')
      .gte('created_at', today.toISOString());

    if ((count ?? 0) >= DAILY_LIMIT) {
      return NextResponse.json(
        { error: `Daily self-fund limit reached (${DAILY_LIMIT} per day)` },
        { status: 429 }
      );
    }

    // Credit wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const newBalance = ((wallet as unknown as { balance: number }).balance) + FUND_AMOUNT;

    const { error: updateError } = await supabase
      .from('wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() } as never)
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Create deposit transaction record
    const ref = `DEP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

    await supabase.from('transactions').insert({
      reference: ref,
      sender_id: user.id,
      receiver_id: user.id,
      amount: FUND_AMOUNT,
      currency: 'USD',
      status: 'completed' as const,
      type: 'deposit' as const,
      narration: 'Self-fund (demo top-up)',
      completed_at: new Date().toISOString(),
    } as never);

    // Create notification
    await supabase.from('notifications').insert({
      user_id: user.id,
      title: 'Account Funded',
      body: `$${FUND_AMOUNT.toLocaleString()}.00 has been added to your NdPay wallet.`,
      type: 'credit' as const,
      metadata: { amount: FUND_AMOUNT, reference: ref },
    } as never);

    return NextResponse.json({ success: true, new_balance: newBalance, amount: FUND_AMOUNT });

  } catch (err) {
    console.error('[Fund API] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
