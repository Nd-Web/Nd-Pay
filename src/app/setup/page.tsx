'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, CheckCircle2, XCircle, Loader2,
  ExternalLink, Copy, Check, ChevronRight, Terminal,
} from 'lucide-react';

const PROJECT_REF = 'mxogjbqoetzpzgpmskyi';
const SQL_EDITOR_URL = `https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`;

// ── Fetch the SQL at runtime so we don't bundle it ───────────────────────────
async function fetchMigrationSql(patch = false): Promise<string> {
  const res = await fetch(`/api/migration-sql${patch ? '?patch=1' : ''}`);
  if (!res.ok) throw new Error('Could not load migration SQL');
  return res.text();
}

type ApiStatus = 'idle' | 'running' | 'done' | 'error';

export default function SetupPage() {
  const [sql, setSql]           = useState('');
  const [patchSql, setPatchSql] = useState('');
  const [sqlCopied, setSqlCopy] = useState(false);
  const [patchCopied, setPatchCopied] = useState(false);
  const [apiStatus, setApi]     = useState<ApiStatus>('idle');
  const [apiError, setApiErr]   = useState('');
  const [apiResult, setApiRes]  = useState<{ succeeded: number; failed: number } | null>(null);

  useEffect(() => {
    fetchMigrationSql(false).then(setSql).catch(() => setSql('-- Could not load SQL. See supabase/migrations/001_initial_schema.sql'));
    fetchMigrationSql(true).then(setPatchSql).catch(() => setPatchSql('-- Could not load patch SQL. See supabase/migrations/002_fix_trigger.sql'));
  }, []);

  const handleCopySql = () => {
    navigator.clipboard.writeText(sql);
    setSqlCopy(true);
    setTimeout(() => setSqlCopy(false), 3000);
  };

  const handleCopyPatch = () => {
    navigator.clipboard.writeText(patchSql);
    setPatchCopied(true);
    setTimeout(() => setPatchCopied(false), 3000);
  };

  const runApiMigration = async () => {
    setApi('running');
    setApiErr('');
    setApiRes(null);
    try {
      const res = await fetch('/api/migrate', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setApiErr(data.error ?? JSON.stringify(data));
        setApi('error');
        return;
      }
      // Also create avatars storage bucket
      await fetch('/api/setup-storage', { method: 'POST' }).catch(() => {});
      setApiRes({ succeeded: data.succeeded, failed: data.failed });
      setApi('done');
    } catch (err) {
      setApiErr(String(err));
      setApi('error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0a1e] via-[#1a0f35] to-[#0f0a1e] px-4 py-12">
      <div className="w-full max-w-2xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center mx-auto mb-4">
            <Database className="w-8 h-8 text-violet-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Database Setup</h1>
          <p className="text-white/50 text-sm max-w-md mx-auto">
            Apply the NdPay schema to your Supabase project. Do this once, then sign up works.
          </p>
        </motion.div>

        {/* ── OPTION 1: Manual SQL (primary) ─────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-3xl bg-white/5 border border-white/10 overflow-hidden mb-4"
        >
          {/* Header bar */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <span className="text-emerald-400 text-sm font-bold">1</span>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Paste SQL in Supabase Editor</p>
                <p className="text-white/40 text-xs">Recommended · no tokens needed</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-[10px] font-semibold uppercase tracking-wide">
              Easiest
            </span>
          </div>

          {/* Steps */}
          <div className="px-5 py-4 space-y-3">
            {[
              { n: 1, text: 'Copy the SQL below' },
              { n: 2, text: 'Open your Supabase SQL editor', link: SQL_EDITOR_URL },
              { n: 3, text: 'Paste and click "Run"' },
              { n: 4, text: 'Come back and sign up 🎉' },
            ].map(({ n, text, link }) => (
              <div key={n} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/8 flex items-center justify-center shrink-0">
                  <span className="text-white/40 text-[10px] font-bold">{n}</span>
                </div>
                <p className="text-white/60 text-sm flex-1">{text}</p>
                {link && (
                  <a href={link} target="_blank" rel="noopener noreferrer"
                     className="flex items-center gap-1 text-violet-400 text-xs font-medium hover:text-violet-300 transition-colors shrink-0">
                    Open <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>

          {/* SQL preview + copy */}
          <div className="mx-5 mb-5 rounded-2xl bg-black/40 border border-white/8 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 bg-white/3">
              <span className="text-white/30 text-xs font-mono">001_initial_schema.sql</span>
              <button
                type="button"
                onClick={handleCopySql}
                disabled={!sql}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/20 border border-violet-500/30
                           text-violet-300 text-xs font-medium hover:bg-violet-500/30 transition-all disabled:opacity-40"
              >
                {sqlCopied
                  ? <><Check className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">Copied!</span></>
                  : <><Copy className="w-3.5 h-3.5" />Copy SQL</>
                }
              </button>
            </div>
            <pre className="px-4 py-3 text-[11px] text-white/40 font-mono leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
              {sql
                ? sql.slice(0, 800) + (sql.length > 800 ? '\n\n… (' + sql.length + ' chars total — use Copy SQL above)' : '')
                : 'Loading…'}
            </pre>
          </div>

          {/* Deep link button */}
          <div className="px-5 pb-5">
            <a
              href={SQL_EDITOR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl
                         bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all
                         shadow-lg shadow-emerald-900/30"
            >
              <ExternalLink className="w-4 h-4" />
              Open Supabase SQL Editor
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </motion.div>

        {/* ── OPTION 2: API token (secondary) ────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl bg-white/5 border border-white/8 overflow-hidden mb-6"
        >
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/8">
            <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">One-click via API (optional)</p>
              <p className="text-white/35 text-xs">Requires a Supabase personal access token in .env.local</p>
            </div>
          </div>

          <div className="px-5 py-4 space-y-3">
            <div className="rounded-xl bg-black/30 border border-white/8 px-4 py-3 text-xs text-white/50 font-mono space-y-1">
              <p className="text-white/25"># 1. Get a token at supabase.com/dashboard/account/tokens</p>
              <p className="text-white/25"># 2. Add to .env.local :</p>
              <p className="text-amber-400">SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxx</p>
              <p className="text-white/25"># 3. Restart `npm run dev`, then click below</p>
            </div>

            <button
              type="button"
              onClick={runApiMigration}
              disabled={apiStatus === 'running' || apiStatus === 'done'}
              className="w-full py-3.5 rounded-2xl bg-violet-600/70 hover:bg-violet-600 disabled:opacity-40
                         disabled:cursor-not-allowed text-white font-semibold text-sm transition-all
                         flex items-center justify-center gap-2"
            >
              {apiStatus === 'running' && <Loader2 className="w-4 h-4 animate-spin" />}
              {apiStatus === 'done'    && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {apiStatus === 'error'   && <XCircle className="w-4 h-4 text-red-400" />}
              {apiStatus === 'idle'    && <Database className="w-4 h-4" />}
              {apiStatus === 'running' ? 'Applying migration…'
               : apiStatus === 'done'  ? 'Done!'
               : apiStatus === 'error' ? 'Retry'
               :                         'Apply Migration via API'}
            </button>

            <AnimatePresence>
              {apiStatus === 'done' && apiResult && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-emerald-400 text-xs text-center">
                  {apiResult.succeeded} statements applied · {apiResult.failed} already existed
                </motion.p>
              )}
              {apiStatus === 'error' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
                  <p className="text-red-300 text-xs font-mono leading-relaxed">{apiError}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── PATCH: Fix trigger (if sign-up returns "Database error") ────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="rounded-3xl bg-white/5 border border-red-500/20 overflow-hidden mb-4"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center">
                <span className="text-red-400 text-sm font-bold">!</span>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Patch: fix trigger (if sign-up fails)</p>
                <p className="text-white/40 text-xs">Run this if you see &quot;Database error saving new user&quot;</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/25 text-red-400 text-[10px] font-semibold uppercase tracking-wide">
              Patch
            </span>
          </div>

          <div className="px-5 py-4">
            <p className="text-white/50 text-xs leading-relaxed mb-4">
              The initial schema may have been applied before this fix was added.
              This patch rewrites the <code className="font-mono text-amber-300/80">handle_new_user()</code> trigger
              with <code className="font-mono text-amber-300/80">SET search_path = public</code> — without it,
              PostgreSQL can&apos;t find the <code className="font-mono text-amber-300/80">profiles</code> and{' '}
              <code className="font-mono text-amber-300/80">wallets</code> tables when the trigger fires.
            </p>

            <div className="rounded-2xl bg-black/40 border border-white/8 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 bg-white/3">
                <span className="text-white/30 text-xs font-mono">002_fix_trigger.sql</span>
                <button
                  type="button"
                  onClick={handleCopyPatch}
                  disabled={!patchSql}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/20 border border-red-500/30
                             text-red-300 text-xs font-medium hover:bg-red-500/30 transition-all disabled:opacity-40"
                >
                  {patchCopied
                    ? <><Check className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">Copied!</span></>
                    : <><Copy className="w-3.5 h-3.5" />Copy Patch SQL</>
                  }
                </button>
              </div>
              <pre className="px-4 py-3 text-[11px] text-white/40 font-mono leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                {patchSql
                  ? patchSql.slice(0, 800) + (patchSql.length > 800 ? '\n\n… (' + patchSql.length + ' chars total — use Copy above)' : '')
                  : 'Loading…'}
              </pre>
            </div>
          </div>
        </motion.div>

        {/* Also enable Realtime note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl bg-amber-500/8 border border-amber-500/20 px-5 py-4 mb-6"
        >
          <p className="text-amber-400 text-xs font-semibold mb-1">Also enable Realtime (required for live updates)</p>
          <p className="text-white/40 text-xs leading-relaxed">
            After running the SQL, go to <strong className="text-white/60">Supabase Dashboard → Database → Replication</strong> and
            enable <code className="font-mono text-amber-300/80">wallets</code>,{' '}
            <code className="font-mono text-amber-300/80">notifications</code>, and{' '}
            <code className="font-mono text-amber-300/80">transactions</code> tables.
            The migration SQL already runs <code className="font-mono">ALTER PUBLICATION</code> — this is just a visual confirmation step.
          </p>
        </motion.div>

        {/* Also disable email confirmation note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-blue-500/8 border border-blue-500/20 px-5 py-4 mb-6"
        >
          <p className="text-blue-400 text-xs font-semibold mb-1">Disable email confirmation (recommended for dev)</p>
          <p className="text-white/40 text-xs leading-relaxed">
            <strong className="text-white/60">Dashboard → Authentication → Providers → Email</strong> → uncheck
            <strong className="text-white/60"> &quot;Confirm email&quot;</strong> → Save.
            Otherwise every sign-up will require clicking an email link.
          </p>
        </motion.div>

        {/* Done */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="text-center">
          <a href="/sign-up"
             className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/8 border border-white/15
                        text-white/70 text-sm font-medium hover:bg-white/12 transition-colors">
            Already ran it → Go to Sign Up
            <ChevronRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    </div>
  );
}
