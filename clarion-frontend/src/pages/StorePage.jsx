import { useEffect, useState, useCallback, useMemo } from 'react';
import { X, Smartphone, Send, Ticket, Landmark, LifeBuoy } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { goTo } from '../auth/nav';
import { getShopProducts, placeShopOrder, getShopOrders, getMyComplaints } from '../api/client';
import ChatWidget from '../components/customer/ChatWidget';
import StoreHeader from '../components/customer/StoreHeader';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// Display names for the demo payment simulator. The ids must stay the same: the backend uses them.
const MODES = [
  { id: 'normal', label: 'Normal payment', hint: 'One clean debit' },
  { id: 'double_charge', label: 'Double debit glitch', hint: 'The bank debits twice for one payment (demo)' },
  { id: 'gateway_glitch', label: 'Debited but payment failed', hint: 'Money is cut, the transaction never completes (demo)' },
];

// Order statuses stay the same in the backend. Only the labels change for payments.
const STATUS = {
  in_transit: { label: 'Processing', cls: 'text-[#0B4DA8] bg-[#00BAF2]/15' },
  pending: { label: 'Failed', cls: 'text-alert bg-alert-dim' },
  delivered: { label: 'Successful', cls: 'text-verified bg-verified-dim' },
  cancelled: { label: 'Cancelled', cls: 'text-muted bg-ink-inset' },
  returned: { label: 'Refund initiated', cls: 'text-[#0B4DA8] bg-[#00BAF2]/15' },
};

const CATEGORY_ICONS = {
  'Recharge & Bills': Smartphone,
  'Money Transfer': Send,
  'Travel & Tickets': Ticket,
  Finance: Landmark,
};

export default function StorePage() {
  const { customer, ready, logout } = useAuth();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [notice, setNotice] = useState(null);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [checkout, setCheckout] = useState(null);
  const [mode, setMode] = useState('normal');
  const [placing, setPlacing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [preset] = useState(null);
  const [presenter, setPresenter] = useState(() => {
    try { return localStorage.getItem('clarion.presenter') === '1'; } catch { return false; }
  });

  const customerId = customer ? customer.id : null;

  const loadOrders = useCallback(async () => {
    if (!customerId) return;
    try { setOrders((await getShopOrders(customerId)).data || []); } catch (e) { setNotice({ ok: false, text: e.message || 'Could not load transactions' }); }
  }, [customerId]);

  const loadComplaints = useCallback(async () => {
    if (!customerId) return;
    try { setComplaints((await getMyComplaints()).data || []); } catch { /* ignore */ }
  }, [customerId]);

  useEffect(() => { if (ready && !customer) goTo('/login?next=/store'); }, [ready, customer]);
  useEffect(() => { getShopProducts().then((r) => setProducts(r.data || [])).catch(() => {}); }, []);
  useEffect(() => { loadOrders(); loadComplaints(); }, [loadOrders, loadComplaints]);
  useEffect(() => {
    const t = setInterval(() => { loadOrders(); loadComplaints(); }, 12000);
    return () => clearInterval(t);
  }, [loadOrders, loadComplaints]);

  const categories = useMemo(() => {
    const present = new Set(products.map((p) => p.category).filter(Boolean));
    const known = Object.keys(CATEGORY_ICONS).filter((c) => present.has(c));
    const extra = [...present].filter((c) => !CATEGORY_ICONS[c]);
    return [...known, ...extra];
  }, [products]);

  const shown = useMemo(() => products.filter((p) =>
    (category === 'All' || p.category === category) &&
    (!search.trim() || p.name.toLowerCase().includes(search.trim().toLowerCase()))), [products, category, search]);

  const emojiFor = useCallback((productName) => {
    const match = products.find((p) => String(productName || '').startsWith(p.name));
    return (match && match.emoji) || '💳';
  }, [products]);

  function togglePresenter() {
    const next = !presenter;
    setPresenter(next);
    try { localStorage.setItem('clarion.presenter', next ? '1' : '0'); } catch { /* ignore */ }
  }

  async function pay() {
    if (!customerId || !checkout) return;
    setPlacing(true);
    setNotice(null);
    try {
      const res = await placeShopOrder({ customerId, productId: checkout.id, quantity: 1, paymentMode: presenter ? mode : 'normal' });
      const o = res.data.order;
      setCheckout(null); setMode('normal');
      if (o.status === 'pending') {
        setNotice({ ok: false, report: true, text: `Payment of ${inr(o.amount)} failed (ref ${o.id}). If the money left your account, report it and Clarion will investigate.` });
      } else {
        setNotice({ ok: true, text: `Payment of ${inr(o.amount)} successful. Ref ${o.id}.` });
      }
      await loadOrders();
    } catch (err) {
      setNotice({ ok: false, text: err.message || 'Payment failed' });
    } finally {
      setPlacing(false);
    }
  }

  if (!customer) {
    return <div className="min-h-screen bg-ink text-paper flex items-center justify-center text-sm text-muted">Loading…</div>;
  }

  const actionNeeded = complaints.filter((c) => c.status === 'awaiting_you' || c.status === 'needs_info').length;
  const firstName = String(customer.name || '').split(' ')[0] || 'there';
  const recent = orders.slice(0, 4);
  const input = 'w-full bg-ink-lighter border border-border-strong rounded-lg px-3 py-2 text-sm text-paper focus:outline-none focus:ring-2 focus:ring-[#00BAF2]/50';

  return (
    <div className="min-h-screen bg-ink text-paper">
      <StoreHeader customer={customer} active="store" actionNeeded={actionNeeded} onLogout={async () => { await logout(); goTo('/'); }}>
        <label className="hidden md:flex items-center gap-1.5 text-[11px] font-semibold text-muted cursor-pointer select-none" title="Shows demo controls (payment and bank simulators)">
          <input type="checkbox" checked={presenter} onChange={togglePresenter} /> Presenter mode
        </label>
      </StoreHeader>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {notice && (
          <div className={`text-sm font-bold p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
            notice.ok ? 'text-verified border-verified/40 bg-verified-dim' : 'text-alert border-alert/40 bg-alert-dim'
          }`}>
            <span>{notice.text}</span>
            {notice.ok && (
              <button type="button" onClick={() => goTo('/orders')}
                className="px-3 py-1.5 rounded-lg bg-ink-light border border-border-strong text-paper hover:bg-ink-lighter text-xs font-bold cursor-pointer">
                View transactions
              </button>
            )}
            {notice.report && (
              <button type="button" onClick={() => setChatOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-alert text-white text-xs font-bold cursor-pointer">
                Report this payment
              </button>
            )}
          </div>
        )}

        <section className="rounded-2xl p-5 sm:p-7 text-white bg-gradient-to-br from-[#002E6E] to-[#0A4AA0] flex flex-wrap items-center justify-between gap-5">
          <div className="max-w-xl">
            <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">Namaste, {firstName}</h1>
            <p className="mt-1.5 text-sm text-[#C9E9FA]">
              Recharge, pay bills and send money from one place. If a payment goes wrong, Clarion checks the records and fixes it for you.
            </p>
          </div>
          <button type="button" onClick={() => setChatOpen(true)}
            className="flex items-center gap-2 bg-white text-[#002E6E] font-bold text-sm px-4 py-2.5 rounded-xl cursor-pointer hover:bg-[#E6F4FD] transition-colors">
            <LifeBuoy className="w-4 h-4" /> Report a payment problem
          </button>
        </section>

        <section>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {categories.map((c) => {
              const Icon = CATEGORY_ICONS[c] || Smartphone;
              const active = category === c;
              return (
                <button key={c} type="button" onClick={() => setCategory(active ? 'All' : c)}
                  className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left cursor-pointer transition-colors ${
                    active ? 'border-[#00BAF2] bg-[#00BAF2]/10' : 'border-border bg-ink-light hover:border-border-strong'
                  }`}>
                  <span className="w-10 h-10 shrink-0 rounded-xl bg-[#E6F4FD] flex items-center justify-center">
                    <Icon className="w-5 h-5 text-[#002E6E]" />
                  </span>
                  <span className="text-sm font-bold leading-snug">{c}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold">{category === 'All' ? 'All payments' : category}</h2>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search recharge, bills, tickets" className={input + ' max-w-64'} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {shown.map((p) => (
              <div key={p.id} className="rounded-2xl border border-border bg-ink-light p-4 flex flex-col">
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-12 h-12 shrink-0 rounded-xl bg-[#E6F4FD] flex items-center justify-center text-2xl">{p.emoji || '💳'}</span>
                  <div className="min-w-0">
                    <div className="font-bold text-sm leading-snug line-clamp-1">{p.name}</div>
                    <div className="text-[11px] text-muted">{p.category}</div>
                  </div>
                </div>
                <div className="text-xs text-muted line-clamp-2 flex-1 mb-3">{p.blurb}</div>
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="font-extrabold text-base text-primary">{inr(p.price)}</div>
                  <button type="button" onClick={() => { setCheckout(p); setMode('normal'); }}
                    className="bg-[#00BAF2] hover:bg-[#33C8F5] text-[#001F4D] font-bold text-xs px-4 py-2 rounded-lg cursor-pointer active:scale-[0.98] transition-colors">
                    Pay now
                  </button>
                </div>
              </div>
            ))}
            {!shown.length && <p className="text-sm text-muted col-span-full py-8 text-center font-medium">No payments match your search. Try a different word.</p>}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">Recent transactions</h2>
            <button type="button" onClick={() => goTo('/orders')} className="text-xs font-bold text-primary hover:underline cursor-pointer">View all</button>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-muted rounded-2xl border border-border bg-ink-light p-5">No transactions yet. Make a payment above and it will show up here.</p>
          ) : (
            <div className="rounded-2xl border border-border bg-ink-light divide-y divide-border">
              {recent.map((o) => {
                const st = STATUS[o.status] || { label: o.status, cls: 'text-muted bg-ink-inset' };
                const hasCase = o.complaint && o.complaint.status && o.complaint.status !== 'none';
                return (
                  <div key={o.id} className="flex flex-wrap items-center gap-3 p-4">
                    <span className="w-10 h-10 shrink-0 rounded-xl bg-[#E6F4FD] flex items-center justify-center text-xl">{emojiFor(o.product)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm line-clamp-1">{o.product}</div>
                      <div className="text-[11px] text-muted">{o.id}</div>
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${st.cls}`}>{st.label}</span>
                    <div className="font-extrabold text-sm w-24 text-right">{inr(o.amount)}</div>
                    {hasCase ? (
                      <span className="text-[11px] font-semibold text-primary">{o.complaint.label || 'Complaint open'}</span>
                    ) : (
                      <button type="button" onClick={() => setChatOpen(true)} className="text-[11px] font-bold text-alert hover:underline cursor-pointer">
                        Report a problem
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {checkout && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-border-strong bg-ink-light p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-xl bg-[#E6F4FD] flex items-center justify-center text-2xl">{checkout.emoji || '💳'}</span>
                <div>
                  <div className="text-xs font-semibold text-muted">Confirm payment</div>
                  <div className="font-bold text-base text-paper">{checkout.name}</div>
                  <div className="text-xs text-muted">{checkout.category}</div>
                </div>
              </div>
              <button type="button" onClick={() => setCheckout(null)} aria-label="Close"
                className="cursor-pointer text-muted hover:text-paper p-1 rounded-lg hover:bg-ink-inset">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl border border-border bg-ink-inset/60 p-3.5 text-xs space-y-1">
              <div className="font-bold text-sm text-paper">{customer.name}</div>
              {customer.phone && <div className="text-muted">{customer.phone}</div>}
              <div className="text-muted">{checkout.blurb}</div>
            </div>

            {presenter ? (
              <>
                <div className="text-xs font-semibold text-muted pt-1">Payment simulator (demo)</div>
                <div className="space-y-1.5">
                  {MODES.map((m) => (
                    <label key={m.id} className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer ${mode === m.id ? 'border-[#00BAF2] bg-[#00BAF2]/10' : 'border-border'}`}>
                      <input type="radio" name="mode" checked={mode === m.id} onChange={() => setMode(m.id)} className="mt-1" />
                      <span><span className="block text-sm font-semibold">{m.label}</span><span className="block text-[11px] text-muted">{m.hint}</span></span>
                    </label>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-[11px] text-muted">Secure payment. Your account is debited once.</p>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-sm font-bold text-muted">Amount</span>
              <span className="text-xl font-extrabold text-primary">{inr(checkout.price)}</span>
            </div>
            <button type="button" onClick={pay} disabled={placing}
              className="w-full bg-[#00BAF2] hover:bg-[#33C8F5] text-[#001F4D] font-bold py-2.5 rounded-xl cursor-pointer disabled:opacity-50 transition-colors active:scale-[0.98]">
              {placing ? 'Processing payment…' : `Pay ${inr(checkout.price)}`}
            </button>
          </div>
        </div>
      )}

      <ChatWidget customer={customer} orders={orders} open={chatOpen} setOpen={setChatOpen} preset={preset}
        onRegistered={loadComplaints} onOpenComplaints={() => goTo('/complaints')} />
    </div>
  );
}
