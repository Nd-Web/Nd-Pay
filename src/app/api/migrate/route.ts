/**
 * One-time migration runner.
 * Applies supabase/migrations/001_initial_schema.sql to the live project
 * via the Supabase Management API.
 *
 * Requires SUPABASE_ACCESS_TOKEN in .env.local
 * (generate at https://app.supabase.com/account/tokens)
 */

import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

// Extract project ref from the Supabase URL
function getProjectRef(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match?.[1] ?? '';
}

// Split the full migration SQL into statements the Management API can run
// The API runs one statement at a time in a transaction.
function splitStatements(sql: string): string[] {
  // Simple split on semicolons that are at the end of a line (not inside strings/$$)
  // For our migration file, a statement ends with '; + newline' outside of $$ blocks.
  const statements: string[] = [];
  let current = '';
  let inDollarQuote = false;
  let dollarTag = '';

  const lines = sql.split('\n');
  for (const raw of lines) {
    const line = raw;

    // Detect $$ or $BODY$ style dollar-quoting
    const dollarMatches = line.match(/\$([^$]*)\$/g) ?? [];
    for (const match of dollarMatches) {
      if (!inDollarQuote) {
        inDollarQuote = true;
        dollarTag = match;
      } else if (match === dollarTag) {
        inDollarQuote = false;
        dollarTag = '';
      }
    }

    current += line + '\n';

    if (!inDollarQuote && line.trimEnd().endsWith(';')) {
      const stmt = current.trim();
      if (stmt && stmt !== ';') {
        statements.push(stmt);
      }
      current = '';
    }
  }
  if (current.trim()) statements.push(current.trim());

  return statements.filter(
    (s) => s.length > 0 && !s.startsWith('--') && s !== ';',
  );
}

export async function POST() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json(
      {
        error: 'SUPABASE_ACCESS_TOKEN not set',
        instructions:
          'Generate a personal access token at https://app.supabase.com/account/tokens and add it to .env.local as SUPABASE_ACCESS_TOKEN=<token>',
      },
      { status: 400 },
    );
  }

  const ref = getProjectRef();
  if (!ref) {
    return NextResponse.json({ error: 'Could not parse project ref from SUPABASE_URL' }, { status: 400 });
  }

  // Read migration file
  let sql: string;
  try {
    sql = readFileSync(
      join(process.cwd(), 'supabase', 'migrations', '001_initial_schema.sql'),
      'utf-8',
    );
  } catch {
    return NextResponse.json({ error: 'Migration file not found' }, { status: 500 });
  }

  // Uncomment the realtime publication lines (they were commented out in the file)
  sql = sql.replace(
    /-- ALTER PUBLICATION supabase_realtime/g,
    'ALTER PUBLICATION supabase_realtime',
  );

  const mgmtUrl = `https://api.supabase.com/v1/projects/${ref}/database/query`;
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const results: Array<{ ok: boolean; status: number; body: unknown }> = [];

  // Run the entire migration as one query (Management API wraps it in a transaction)
  try {
    const res = await fetch(mgmtUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: sql }),
    });

    const body = await res.json().catch(() => res.text());
    results.push({ ok: res.ok, status: res.status, body });

    if (!res.ok) {
      // If bulk run failed, try idempotent statement-by-statement
      const stmts = splitStatements(sql);
      results.length = 0; // clear

      for (const stmt of stmts) {
        const r = await fetch(mgmtUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ query: stmt }),
        });
        const b = await r.json().catch(() => r.text());
        results.push({ ok: r.ok, status: r.status, body: b });
        // Don't stop on error — some statements may already exist (idempotent)
      }
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  const failed = results.filter((r) => !r.ok);

  return NextResponse.json({
    total: results.length,
    succeeded: results.filter((r) => r.ok).length,
    failed: failed.length,
    errors: failed.map((r) => r.body),
  });
}

// Check migration status (do tables exist?)
export async function GET() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const ref = getProjectRef();

  if (!token || !ref) {
    return NextResponse.json({ ready: false, reason: 'SUPABASE_ACCESS_TOKEN not set' });
  }

  const mgmtUrl = `https://api.supabase.com/v1/projects/${ref}/database/query`;
  try {
    const res = await fetch(mgmtUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('profiles','wallets','transactions','notifications','contacts')`,
      }),
    });
    const data = await res.json();
    const count = parseInt(data?.[0]?.count ?? '0', 10);
    return NextResponse.json({ ready: count === 5, tablesFound: count });
  } catch (err) {
    return NextResponse.json({ ready: false, reason: String(err) });
  }
}
