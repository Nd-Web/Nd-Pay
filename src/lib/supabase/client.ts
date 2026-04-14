import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Custom fetch that transparently routes all Supabase HTTP requests through
 * the Next.js server proxy (/api/sb/…) so the browser never needs a direct
 * TCP connection to supabase.co.  WebSocket (Realtime) bypasses this because
 * the Supabase client opens its own ws:// connection independently.
 */
function makeProxyFetch(): typeof fetch {
  return (input, init) => {
    if (typeof window === 'undefined') return fetch(input, init);

    const raw =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.href
        : (input as Request).url;

    if (raw.startsWith(SUPABASE_URL)) {
      const proxied = raw.replace(SUPABASE_URL, '/api/sb');
      const newInput =
        input instanceof Request ? new Request(proxied, input) : proxied;
      return fetch(newInput, init);
    }

    return fetch(input, init);
  };
}

export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { fetch: makeProxyFetch() },
  });
}
