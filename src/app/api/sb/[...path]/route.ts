/**
 * Supabase proxy – routes all browser → Supabase HTTP traffic through the
 * Next.js server so the browser only needs to reach localhost:3000.
 * WebSocket (Realtime) is unaffected; it opens its own TCP connection.
 */

import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// Headers the proxy must never forward upstream or downstream
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
]);

type Ctx = { params: Promise<{ path: string[] }> };

async function proxy(request: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const { path } = await ctx.params;
  const search = new URL(request.url).search;
  const target = `${SUPABASE_URL}/${path.join('/')}${search}`;

  // Build upstream request headers
  const upHeaders = new Headers();
  request.headers.forEach((v, k) => {
    if (!HOP_BY_HOP.has(k.toLowerCase()) && k.toLowerCase() !== 'host') {
      upHeaders.set(k, v);
    }
  });

  const hasBody = !['GET', 'HEAD'].includes(request.method);

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers: upHeaders,
      body: hasBody ? await request.arrayBuffer() : undefined,
      // @ts-expect-error – required for streaming in Node 18+ fetch
      duplex: 'half',
    });
  } catch (err) {
    console.error('[sb-proxy] upstream fetch failed:', err);
    return NextResponse.json(
      { error: 'proxy_error', message: String(err) },
      { status: 502 },
    );
  }

  // Build downstream response headers
  const downHeaders = new Headers();
  upstream.headers.forEach((v, k) => {
    if (!HOP_BY_HOP.has(k.toLowerCase())) {
      downHeaders.set(k, v);
    }
  });
  // Allow the browser to read CORS headers
  downHeaders.set('Access-Control-Allow-Origin', '*');
  downHeaders.set('Access-Control-Allow-Headers', '*');
  downHeaders.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: downHeaders,
  });
}

export const GET     = proxy;
export const POST    = proxy;
export const PUT     = proxy;
export const PATCH   = proxy;
export const DELETE  = proxy;
export const OPTIONS = proxy;
