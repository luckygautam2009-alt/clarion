import {
  Users,
  ShoppingBag,
  CreditCard,
  RotateCcw,
  Ticket,
  ShieldAlert,
  BookOpen,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  FileText,
  MessageSquare,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'complaints', label: 'Complaints', icon: MessageSquare },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'refunds', label: 'Refunds', icon: RotateCcw },
  { id: 'tickets', label: 'Tickets', icon: Ticket },
  { id: 'securityEvents', label: 'Security Events', icon: ShieldAlert },
  { id: 'policies', label: 'Policies', icon: BookOpen },
  { id: 'analytics', label: 'Analytics (2.0)', icon: TrendingUp },
  { id: 'auditlog', label: 'Audit Log (2.0)', icon: FileText },
];

export default function LeftNav({ activeTable, setActiveTable, data, badges = {} }) {
  return (
    <aside className="w-56 xl:w-64 border-r border-border bg-ink-light flex flex-col justify-between shrink-0 p-3 select-none transition-colors">
      <div className="space-y-3">
        {/* Navigation Section Header */}
        <div className="px-2.5 pt-1.5 flex items-center justify-between">
          <span className="text-xs font-bold tracking-wider uppercase text-muted">
            Database Tables
          </span>
          <span className="text-xs font-mono text-muted bg-ink-inset px-2 py-0.5 rounded-md border border-border">
            10 views
          </span>
        </div>

        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const count = badges[item.id] ?? data?.[item.id]?.length ?? 0;
            const isActive = activeTable === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTable(item.id)}
                className={`w-full group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all duration-150 cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-[#2F6F68] focus-visible:outline-offset-1 ${isActive
                    ? 'bg-[#3B6260] text-white font-bold border border-[#2F6F68]/70 neon-edge-teal shadow-[0_0_12px_rgba(47,111,104,0.35)]'
                    : 'text-paper/85 hover:text-paper hover:bg-ink-lighter font-semibold border border-transparent'
                  }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-muted group-hover:text-paper'
                      }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {count > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold shrink-0 transition-colors ${isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-ink-inset text-muted group-hover:text-paper border border-border'
                      }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Bottom Section: System Status & Security Badge ── */}
      <div className="space-y-2.5 pt-3 border-t border-border">
        {/* System Online Card */}
        <div className="bg-ink-inset rounded-xl p-2.5 border border-border flex items-center gap-2.5 shadow-2xs">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 neon-live-pulse shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-paper leading-tight flex items-center justify-between">
              <span>System Online</span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold uppercase">Live</span>
            </div>
            <div className="text-xs text-muted font-medium truncate mt-0.5">Database synchronized</div>
          </div>
        </div>

        {/* Enterprise Security Footer */}
        <div className="px-1 flex items-center justify-between text-xs text-muted">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="font-bold text-paper/90">CLARION Enterprise</span>
          </div>
          <span className="text-[11px] font-mono text-muted/80 font-bold">v2.4</span>
        </div>
      </div>
    </aside>
  );
}
