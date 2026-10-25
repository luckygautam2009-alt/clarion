import { useEffect } from 'react';
import { ShoppingBag, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { goTo } from '../auth/nav';

export default function GatePage() {
  const { customer } = useAuth();

  useEffect(() => {
    if (customer) goTo('/store');
  }, [customer]);

  const card = 'rounded-2xl border border-border-strong bg-ink-light p-7 sm:p-8 shadow-xs flex flex-col hover:border-muted/50 transition-colors duration-150';
  const primary = 'w-full bg-[#34484A] text-white font-semibold py-3 rounded-xl cursor-pointer hover:bg-[#273738] transition-all duration-150 shadow-xs active:scale-[0.98] text-sm sm:text-base';
  const secondary = 'w-full border border-border-strong bg-ink-lighter hover:bg-ink-light text-paper font-semibold py-3 rounded-xl cursor-pointer transition-all duration-150 shadow-2xs active:scale-[0.98] text-sm sm:text-base';

  return (
    <div className="min-h-screen bg-ink text-paper flex flex-col transition-colors duration-200">
      <header className="border-b border-border backdrop-blur-md sticky top-0 z-40 transition-colors" style={{ background: 'var(--header-glass)' }}>
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-dim border border-amber/40 flex items-center justify-center p-1.5 overflow-hidden shadow-xs">
              <img src="/favicon.png" alt="CLARION" className="w-full h-full object-contain" />
            </div>
            <span className="font-display text-2xl font-bold tracking-tight text-paper">CLARION</span>
          </div>
          <button
            type="button"
            onClick={() => goTo('/story')}
            className="flex items-center gap-2 text-sm font-semibold text-amber hover:text-red-light cursor-pointer px-3.5 py-2 rounded-xl bg-red-dim border border-amber/30 transition-colors shadow-2xs"
          >
            <Sparkles className="w-4 h-4 text-amber" />
            <span>See how it works</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="text-center my-10 sm:my-16">
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight text-paper">
            Complaints resolved with evidence,<br className="hidden sm:block" /> not guesswork.
          </h1>
          <p className="mt-4 sm:mt-5 text-base sm:text-lg text-muted max-w-2xl mx-auto leading-relaxed">
            Shop, report a problem, and watch it get investigated against real order, payment, and photo evidence.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
          <section className={card}>
            <div className="w-12 h-12 rounded-xl bg-verified-dim border border-verified/40 flex items-center justify-center mb-5 shadow-xs">
              <ShoppingBag className="w-6 h-6 text-verified" />
            </div>
            <h2 className="font-display text-2xl font-bold text-paper tracking-tight">I'm a customer</h2>
            <p className="text-sm sm:text-[15px] text-muted mt-2.5 mb-7 flex-1 leading-relaxed">
              Browse products, track your orders and report a problem. Every order and payment is saved to your own account.
            </p>
            <div className="space-y-3">
              <button type="button" onClick={() => goTo('/login?next=/store')} className={primary}>Sign in</button>
              <button type="button" onClick={() => goTo('/login?mode=signup&next=/store')} className={secondary}>Create account</button>
            </div>
          </section>

          <section className={card}>
            <div className="w-12 h-12 rounded-xl bg-red-dim border border-amber/40 flex items-center justify-center mb-5 shadow-xs">
              <ShieldCheck className="w-6 h-6 text-amber" />
            </div>
            <h2 className="font-display text-2xl font-bold text-paper tracking-tight">I'm an admin</h2>
            <p className="text-sm sm:text-[15px] text-muted mt-2.5 mb-7 flex-1 leading-relaxed">
              Dashboard, analytics, audit log and overrides. Admin access needs the admin password and ID verification.
            </p>
            <div className="space-y-3">
              <button type="button" onClick={() => goTo('/admin')} className={primary}>Admin sign-in</button>
              <button type="button" onClick={() => goTo('/console')} className={secondary}>Agent console (demo tool)</button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
