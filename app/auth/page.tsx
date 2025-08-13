'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
// If the @ alias isn't set, change to: import { supabase } from '../../lib/supabaseClient';
import { supabase } from '@/lib/supabaseClient';

const ADMIN_EMAILS = [
  'cadence.c@dragonboat.org.hk',
  'annie@dragonboat.org.hk',
  'andy@dragonboat.org.hk',
];

type Mode = 'login' | 'signup';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok?: boolean }>({ text: '' });

  const canSubmit = useMemo(() => {
    if (!email || !pass) return false;
    if (mode === 'signup' && pass.length < 8) return false;
    return true;
  }, [email, pass, mode]);

  function resetMsg() {
    setMsg({ text: '' });
  }

  async function onSignup(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    resetMsg();
    setLoading(true);

    const role = ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : 'user';

    const { error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: { data: { role } },
    });

    setLoading(false);
    if (error) setMsg({ text: error.message });
    else {
      setMsg({ text: 'Check your email to confirm your account.', ok: true });
      setMode('login');
    }
  }

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    resetMsg();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    setLoading(false);
    if (error) {
      setMsg({ text: error.message });
      return;
    }
    const role = data.user.user_metadata?.role;
    router.push(role === 'admin' ? '/admin' : '/dashboard');
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-50 dark:bg-[#0a0a0a]">
      {/* subtle gradient background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        aria-hidden
        style={{
          background:
            'radial-gradient(1200px 500px at 80% -10%, rgba(59,130,246,.18), transparent 60%), radial-gradient(1000px 600px at -10% 120%, rgba(34,197,94,.15), transparent 60%)',
        }}
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="rounded-2xl bg-white/80 backdrop-blur shadow-lg ring-1 ring-black/5 dark:bg-white/10 dark:ring-white/10">
            {/* Header */}
            <div className="px-8 pt-8 pb-4 text-center">
              <div className="mx-auto mb-3 h-10 w-10 rounded-full bg-blue-600/90 text-white grid place-items-center shadow">
                {/* simple logo dot */}
                <span className="text-lg font-bold">S</span>
              </div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                StanleyDB Account
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {mode === 'login' ? 'Welcome back.' : 'Create your account.'}
              </p>
            </div>

            {/* Tabs */}
            <div className="px-2">
              <div className="mx-6 grid grid-cols-2 rounded-lg border border-slate-200 dark:border-white/15 p-1">
                <button
                  type="button"
                  onClick={() => { setMode('login'); resetMsg(); }}
                  className={`py-2 text-sm rounded-md transition ${
                    mode === 'login'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('signup'); resetMsg(); }}
                  className={`py-2 text-sm rounded-md transition ${
                    mode === 'signup'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-8 pb-8 pt-6">
              {/* message */}
              {!!msg.text && (
                <div
                  className={`mb-4 rounded-md border px-3 py-2 text-sm ${
                    msg.ok
                      ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300'
                      : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300'
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  {msg.text}
                </div>
              )}

              {/* Forms */}
              {mode === 'login' ? (
                <form onSubmit={onLogin} className="space-y-4">
                  <EmailInput value={email} onChange={v => { setEmail(v); resetMsg(); }} />
                  <PasswordInput
                    value={pass}
                    onChange={v => { setPass(v); resetMsg(); }}
                    show={showPass}
                    setShow={setShowPass}
                  />

                  <button
                    disabled={!canSubmit || loading}
                    className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? <Spinner /> : 'Log In'}
                  </button>

                  <p className="text-center text-sm text-slate-600 dark:text-slate-300">
                    New here?{' '}
                    <button
                      type="button"
                      className="font-medium text-blue-600 hover:underline"
                      onClick={() => { setMode('signup'); resetMsg(); }}
                    >
                      Sign up
                    </button>
                  </p>
                </form>
              ) : (
                <form onSubmit={onSignup} className="space-y-4">
                  <EmailInput value={email} onChange={v => { setEmail(v); resetMsg(); }} />
                  <PasswordInput
                    value={pass}
                    onChange={v => { setPass(v); resetMsg(); }}
                    show={showPass}
                    setShow={setShowPass}
                    minLength={8}
                    hint="At least 8 characters"
                  />

                  <button
                    disabled={!canSubmit || loading}
                    className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? <Spinner /> : 'Create account'}
                  </button>

                  <p className="text-center text-sm text-slate-600 dark:text-slate-300">
                    Have an account?{' '}
                    <button
                      type="button"
                      className="font-medium text-blue-600 hover:underline"
                      onClick={() => { setMode('login'); resetMsg(); }}
                    >
                      Log in
                    </button>
                  </p>
                </form>
              )}
            </div>
          </div>

          {/* tiny footer */}
          <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
            By continuing you agree to the event’s terms and privacy policy.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------- Reusable field components (no external libs) ---------- */

function EmailInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-200">
        Email
      </span>
      <div className="relative">
        <input
          type="email"
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-white/20 dark:bg-white/5 dark:text-slate-100 dark:placeholder-slate-400 dark:focus:ring-blue-900/30"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-slate-400">
          {/* @ icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M16 8a4 4 0 1 1-1.17-2.83" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M16 8v4a2 2 0 1 0 4 0V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.2" opacity=".25"/>
          </svg>
        </span>
      </div>
    </label>
  );
}

function PasswordInput({
  value,
  onChange,
  show,
  setShow,
  minLength,
  hint,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  setShow: (v: boolean) => void;
  minLength?: number;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-200">
        Password {minLength ? <em className="not-italic text-slate-400">(min {minLength})</em> : null}
      </span>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          required
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-10 text-sm text-slate-900 placeholder-slate-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-white/20 dark:bg-white/5 dark:text-slate-100 dark:placeholder-slate-400 dark:focus:ring-blue-900/30"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute inset-y-0 right-0 grid w-10 place-items-center text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {/* eye icon */}
          {show ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M10.6 10.65A3 3 0 0 1 12 9c1.66 0 3 1.34 3 3a3 3 0 0 1-.94 2.17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".4"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          )}
        </button>
      </div>
      {hint ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </label>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
  );
}
