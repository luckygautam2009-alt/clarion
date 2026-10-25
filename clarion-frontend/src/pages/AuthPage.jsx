import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { goTo } from '../auth/nav';

export default function AuthPage() {
  const { customer, signup, login, logout } = useAuth();
  const rawNext = new URLSearchParams(window.location.search).get('next') || '/store';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

  const [mode, setMode] = useState(new URLSearchParams(window.location.search).get('mode') === 'signup' ? 'signup' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (mode === 'signup' && name.trim().length < 2) { setError('Please enter your full name.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setBusy(true);
    try {
      if (mode === 'signup') await signup({ name: name.trim(), email: email.trim(), password });
      else await login({ email: email.trim(), password });
      goTo(next);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const input = 'w-full bg-ink-inset border border-border-strong rounded-xl px-3.5 py-2.5 text-sm text-paper placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-amber/40 focus:border-amber transition-all';

  return (
    <div className="min-h-screen bg-ink text-paper flex flex-col transition-colors duration-200">
      <header className="border-b border-border backdrop-blur-md sticky top-0 z-40 transition-colors" style={{ background: 'var(--header-glass)' }}>
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <button type="button" onClick={() => goTo('/')} className="flex items-center gap-2 text-sm font-semibold text-paper hover:text-amber transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> <span>Back to CLARION</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-border-strong bg-ink-light p-7 sm:p-8 shadow-xs">
          <div className="mb-6">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-xl bg-red-dim border border-amber/40 flex items-center justify-center p-1.5 overflow-hidden shadow-2xs">
                <img src="/favicon.png" alt="CLARION" className="w-full h-full object-contain" />
              </div>
              <span className="font-display text-2xl font-bold tracking-tight text-paper">CLARION</span>
            </div>
            <p className="text-sm text-muted">Your orders, payments, and complaints in one account.</p>
          </div>

          {customer ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-verified/40 bg-verified-dim p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-verified mb-1">Signed in</div>
                <div className="font-bold text-sm sm:text-base text-paper">{customer.name} <span className="font-mono text-xs text-muted">· {customer.id}</span></div>
                <div className="text-xs text-muted mt-0.5">{customer.email}</div>
              </div>
              <button
                type="button"
                onClick={() => goTo(next)}
                className="w-full bg-[#34484A] text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-[#273738] transition-all cursor-pointer shadow-xs active:scale-[0.98]"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={logout}
                className="w-full text-xs sm:text-sm font-semibold text-muted hover:text-paper py-2 cursor-pointer transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <>
              <div className="flex p-1 rounded-xl bg-ink-inset border border-border-strong mb-6 text-sm font-semibold">
                {[['login', 'Sign in'], ['signup', 'Create account']].map(([m, label]) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMode(m); setError(null); }}
                    className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer select-none ${
                      mode === m
                        ? 'bg-ink-light text-[#5F7F80] shadow-xs border border-border-strong'
                        : 'text-muted hover:text-paper'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <form onSubmit={submit} className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label className="block text-xs font-semibold text-paper/90 mb-1.5">Full name</label>
                    <input className={input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} placeholder="e.g. Yash Gautam" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-paper/90 mb-1.5">Email address</label>
                  <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" maxLength={120} placeholder="you@example.com" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-paper/90 mb-1.5">Password</label>
                  <div className="relative">
                    <input className={input + ' pr-11'} type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} maxLength={128} placeholder="••••••••••••" required />
                    <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-paper cursor-pointer p-1">
                      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {mode === 'signup' && <p className="text-xs text-muted mt-1.5">Must be at least 8 characters.</p>}
                </div>
                {error && <p className="text-xs text-alert font-medium bg-alert-dim border border-alert/30 rounded-xl px-3.5 py-2">{error}</p>}
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-[#34484A] text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-[#273738] transition-all cursor-pointer disabled:opacity-55 shadow-xs active:scale-[0.98]"
                >
                  {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
                </button>
              </form>
              {mode === 'signup' && (
                <p className="text-xs text-muted mt-4 leading-relaxed">A unique customer ID is created for you automatically, and every order and payment you make is saved to it.</p>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
