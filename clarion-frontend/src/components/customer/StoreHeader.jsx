import { FileText, Wallet, ShieldCheck, Receipt } from 'lucide-react';
import { goTo } from '../../auth/nav';
import NotificationBell from './NotificationBell';
import ProfileMenu from './ProfileMenu';

export default function StoreHeader({ customer, active, actionNeeded = 0, onLogout, children }) {
  const link = (key, label, path, Icon, badge) => {
    const isActive = active === key;
    return (
      <button
        key={key}
        type="button"
        onClick={() => goTo(path)}
        className={`flex items-center gap-2 text-sm px-3.5 py-2 rounded-xl transition-all duration-150 cursor-pointer border select-none ${
          isActive
            ? 'bg-[#0A4AA0] text-white border border-[#002E6E]/70 neon-edge-teal shadow-[0_0_12px_rgba(0,186,242,0.35)] font-bold'
            : 'text-paper/80 hover:text-paper hover:bg-ink-lighter font-semibold border-transparent'
        }`}
      >
        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-muted'}`} />
        <span className="hidden sm:inline">{label}</span>
        {badge > 0 && (
          <span className="min-w-5 h-5 px-1.5 rounded-full bg-alert text-white text-xs flex items-center justify-center font-bold">
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <header
      className="sticky top-0 z-40 border-b border-border backdrop-blur-md transition-colors"
      style={{ background: 'var(--header-glass)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 sm:gap-6 min-w-0">
          <button
            type="button"
            onClick={() => goTo('/store')}
            className="flex items-center gap-3 cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-[#002E6E] focus-visible:outline-offset-2 rounded-xl"
            title="CLARION Pay"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden shadow-xs">
              <img src="/clarion-logo.svg" alt="CLARION" className="w-full h-full object-contain" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-extrabold tracking-tight text-paper">CLARION</span>
              <span className="text-border-strong text-sm select-none">/</span>
              <span className="text-xs sm:text-sm text-paper-dim dark:text-muted font-bold">Pay</span>
            </div>
          </button>

          <nav className="flex items-center gap-1 sm:gap-1.5">
            {link("store", "Pay", "/store", Wallet, 0)}
            {link("orders", "Transactions", "/orders", Receipt, 0)}
            {link('complaints', 'My complaints', '/complaints', FileText, actionNeeded)}
          </nav>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {children}
          <NotificationBell />
          <ProfileMenu customer={customer} onLogout={onLogout} />
        </div>
      </div>
    </header>
  );
}

