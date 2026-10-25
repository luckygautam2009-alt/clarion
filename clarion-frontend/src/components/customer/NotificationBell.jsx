import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { getMyNotifications, markMyNotificationsRead, dismissMyNotifications } from '../../api/client';
import { goTo } from '../../auth/nav';

const DOT = { success: 'bg-verified', attention: 'bg-alert', info: 'bg-amber' };
const fmt = (iso) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const box = useRef(null);

  const load = useCallback(async () => {
    try {
      const r = await getMyNotifications();
      setItems(r.data.notifications || []);
      setUnread(r.data.unread || 0);
    } catch { /* ignore polling errors */ }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    function onDoc(e) { if (box.current && !box.current.contains(e.target)) { setOpen(false); setConfirming(false); } }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  async function read(n) {
    if (n.readAt) return;
    setItems((list) => list.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
    setUnread((u) => Math.max(0, u - 1));
    try { await markMyNotificationsRead([n.id]); } finally { load(); }
  }

  async function clearOne(n, e) {
    e.stopPropagation();
    setItems((list) => list.filter((x) => x.id !== n.id));
    if (!n.readAt) setUnread((u) => Math.max(0, u - 1));
    try { await dismissMyNotifications({ ids: [n.id] }); } finally { load(); }
  }

  async function markAll() {
    setItems((list) => list.map((x) => ({ ...x, readAt: x.readAt || new Date().toISOString() })));
    setUnread(0);
    try { await markMyNotificationsRead(); } finally { load(); }
  }

  async function clearAll() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3500);
      return;
    }
    setConfirming(false);
    setItems([]);
    setUnread(0);
    try { await dismissMyNotifications({ all: true }); } finally { load(); }
  }

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => { setOpen(!open); if (!open) load(); }}
        className="relative w-10 h-10 rounded-xl border border-border-strong bg-ink-light hover:bg-ink-lighter flex items-center justify-center transition-all duration-150 cursor-pointer shadow-2xs focus-visible:outline-2 focus-visible:outline-amber focus-visible:outline-offset-1"
      >
        <Bell className="w-4 h-4 text-paper" />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1.5 rounded-full bg-alert text-white text-xs font-bold flex items-center justify-center shadow-xs">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2.5 w-96 max-w-[calc(100vw-1.5rem)] max-h-[70vh] flex flex-col rounded-2xl border border-border-strong bg-ink-light shadow-2xl z-50 overflow-hidden animate-in fade-in">
          <div className="flex items-center justify-between px-4.5 py-3.5 border-b border-border bg-ink-inset/40">
            <div className="font-bold text-sm sm:text-base text-paper">Notifications</div>
            <div className="flex items-center gap-3">
              {unread > 0 && (
                <button type="button" onClick={markAll} className="text-xs font-semibold text-amber hover:underline cursor-pointer">
                  Mark all read
                </button>
              )}
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className={`text-xs font-semibold transition-colors cursor-pointer ${
                    confirming ? 'text-alert' : 'text-muted hover:text-paper'
                  }`}
                >
                  {confirming ? 'Confirm clear all' : 'Clear all'}
                </button>
              )}
            </div>
          </div>

          <div className="overflow-y-auto">
            {!items.length && (
              <div className="px-5 py-10 text-center">
                <div className="w-11 h-11 mx-auto mb-2.5 rounded-full bg-verified-dim border border-verified/40 flex items-center justify-center">
                  <Check className="w-5 h-5 text-verified" />
                </div>
                <div className="text-sm font-semibold text-paper">You&apos;re all caught up!</div>
                <div className="text-xs text-muted mt-1">New updates will appear here.</div>
              </div>
            )}
            {items.map((n) => (
              <div
                key={n.id}
                onClick={() => read(n)}
                className={`group px-4.5 py-3.5 border-b border-border/60 last:border-0 cursor-pointer hover:bg-ink-lighter/70 transition-colors ${
                  n.readAt ? 'opacity-65' : 'bg-red-dim/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                      n.readAt ? 'bg-border-strong' : (DOT[n.severity] || DOT.info)
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className={`text-xs sm:text-sm text-paper ${n.readAt ? 'font-medium' : 'font-bold'}`}>
                      {n.title}
                    </div>
                    {n.body && <div className="text-xs text-muted mt-0.5 leading-relaxed">{n.body}</div>}
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-muted/80 font-mono">{fmt(n.createdAt)}</span>
                      {String(n.type).startsWith('COMPLAINT') && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); read(n); setOpen(false); goTo('/complaints'); }}
                          className="text-xs font-semibold text-amber hover:underline cursor-pointer"
                        >
                          Track complaint
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Clear notification"
                    title="Clear"
                    onClick={(e) => clearOne(n, e)}
                    className="shrink-0 w-7 h-7 rounded-lg text-muted hover:text-alert hover:bg-alert-dim flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
