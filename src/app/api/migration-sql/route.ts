import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const patch = searchParams.get('patch') === '1';

  const file = patch
    ? join(process.cwd(), 'supabase', 'migrations', '002_fix_trigger.sql')
    : join(process.cwd(), 'supabase', 'migrations', '001_initial_schema.sql');

  if (!existsSync(file)) {
    return new NextResponse('-- File not found', { status: 404 });
  }

  const sql = readFileSync(file, 'utf-8');
  return new NextResponse(sql, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
