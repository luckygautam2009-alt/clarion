import { useEffect, useState, useCallback, useMemo } from 'react';
import { X, ArrowRight, Phone, MapPin, User } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { goTo } from '../auth/nav';
import { getShopProducts, placeShopOrder, getShopOrders, getMyComplaints } from '../api/client';
import ChatWidget from '../components/customer/ChatWidget';
import StoreHeader from '../components/customer/StoreHeader';
import EditProfileModal from '../components/customer/EditProfileModal';
import { getProductImage } from '../data/productImages';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const MODES = [
  { id: 'normal', label: 'Normal payment', hint: 'One clean charge' },
  { id: 'double_charge', label: 'Double charge glitch', hint: 'Gateway charges the card twice (demo)' },
  { id: 'gateway_glitch', label: 'Debited but order failed', hint: 'Money cut, order never placed (demo)' },
];

export default function StorePage() {
  const { customer, ready, logout } = useAuth();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [notice, setNotice] = useState(null);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [checkout, setCheckout] = useState(null);
  const [qty, setQty] = useState(1);
  const [mode, setMode] = useState('normal');
  const [placing, setPlacing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [preset] = useState(null);
  const [editProfileModal, setEditProfileModal] = useState(false);
  const [presenter, setPresenter] = useState(() => {
    try { return localStorage.getItem('clarion.presenter') === '1'; } catch { return false; }
  });

  const customerId = customer ? customer.id : null;

  const loadOrders = useCallback(async () => {
    if (!customerId) return;
    try { setOrders((await getShopOrders(customerId)).data || []); } catch (e) { setNotice({ ok: false, text: e.message || 'Could not load orders' }); }
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

  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))], [products]);
  const shown = useMemo(() => products.filter((p) =>
    (category === 'All' || p.category === category) &&
    (!search.trim() || p.name.toLowerCase().includes(search.trim().toLowerCase()))), [products, category, search]);

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
      const res = await placeShopOrder({ customerId, productId: checkout.id, quantity: qty, paymentMode: presenter ? mode : 'normal' });
      setCheckout(null); setQty(1); setMode('normal');
      setNotice({ ok: true, text: `Order ${res.data.order.id} placed (${inr(res.data.order.amount)}).` });
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
  const input = 'w-full bg-ink-lighter border border-border-strong rounded-lg px-3 py-2 text-sm text-paper focus:outline-none focus:ring-2 focus:ring-amber/50';

  return (
    <div className="min-h-screen bg-ink text-paper">
      <StoreHeader customer={customer} active="store" actionNeeded={actionNeeded} onLogout={async () => { await logout(); goTo('/'); }}>
        <label className="hidden md:flex items-center gap-1.5 text-[11px] font-semibold text-muted cursor-pointer select-none" title="Shows demo controls (payment and courier simulators)">
          <input type="checkbox" checked={presenter} onChange={togglePresenter} /> Presenter mode
        </label>
      </StoreHeader>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {notice && (
          <div className={`text-sm font-bold p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 shadow-xs ${
            notice.ok ? 'text-verified border-verified/40 bg-verified-dim' : 'text-alert border-alert/40 bg-alert-dim'
          }`}>
            <span>{notice.text}</span>
            {notice.ok && (
              <button
                type="button"
                onClick={() => goTo('/orders')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ink-light border border-border-strong text-paper hover:bg-ink-lighter text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                <span>View in My Orders</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted">Products</h2>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products" className={input + ' max-w-56'} />
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map((c) => (
              <button key={c} type="button" onClick={() => setCategory(c)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border cursor-pointer ${category === c ? 'bg-amber text-ink border-amber' : 'border-border-strong text-muted hover:text-paper'}`}>{c}</button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {shown.map((p) => {
              const imgUrl = getProductImage(p);
              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-border bg-white dark:bg-ink-light p-3.5 flex flex-col shadow-xs hover:shadow-md transition-all duration-200 group"
                >
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-ink-inset mb-3 border border-border/50">
                    <img
                      src={imgUrl}
                      alt={p.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-black/70 text-white backdrop-blur-xs">
                      {p.category}
                    </span>
                  </div>
                  <div className="font-bold text-sm leading-snug text-paper line-clamp-1 mb-1">
                    {p.name}
                  </div>
                  <div className="text-[11px] text-muted line-clamp-2 flex-1 mb-3">
                    {p.blurb}
                  </div>
                  <div className="flex items-center justify-between pt-2.5 border-t border-border mt-auto">
                    <div className="font-extrabold text-base text-amber">
                      {inr(p.price)}
                    </div>
                    <button
                      type="button"
                      onClick={() => { setCheckout(p); setQty(1); setMode('normal'); }}
                      className="bg-primary hover:bg-[#265B55] text-white font-bold text-xs px-3.5 py-2 rounded-lg cursor-pointer shadow-xs active:scale-[0.98] transition-all neon-glow-teal"
                    >
                      Buy now
                    </button>
                  </div>
                </div>
              );
            })}
            {!shown.length && <p className="text-sm text-muted col-span-full py-8 text-center font-medium">No products match your search.</p>}
          </div>
        </section>
      </main>

      {checkout && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-border-strong bg-white dark:bg-ink-light p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-3">
                <img
                  src={getProductImage(checkout)}
                  alt={checkout.name}
                  className="w-13 h-13 rounded-xl object-cover border border-border shadow-xs"
                />
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted">Checkout</div>
                  <div className="font-bold text-base text-paper">{checkout.name}</div>
                  <div className="text-xs text-muted">{checkout.category}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCheckout(null)}
                aria-label="Close"
                className="cursor-pointer text-muted hover:text-paper p-1 rounded-lg hover:bg-ink-inset"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Delivery & Contact Information */}
            <div className="rounded-xl border border-border bg-ink-inset/60 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-primary" /> Delivery & Contact Details
                </span>
                <button
                  type="button"
                  onClick={() => setEditProfileModal(true)}
                  className="text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  Edit Details
                </button>
              </div>

              <div className="text-xs text-paper font-semibold space-y-1">
                <div className="font-extrabold">{customer.name}</div>
                {customer.phone ? (
                  <div className="flex items-center gap-1.5 text-paper">
                    <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="font-bold">{customer.phone}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditProfileModal(true)}
                    className="text-xs font-bold text-amber hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5 text-amber" />
                    <span>⚠️ Add mobile number for courier SMS tracking</span>
                  </button>
                )}

                {customer.address ? (
                  <div className="flex items-start gap-1.5 text-muted">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span>
                      {customer.address}
                      {customer.city ? `, ${customer.city}` : ''}
                      {customer.pincode ? ` - ${customer.pincode}` : ''}
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditProfileModal(true)}
                    className="text-[11px] font-semibold text-muted hover:text-paper hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <MapPin className="w-3 h-3 text-muted" />
                    <span>+ Add delivery address</span>
                  </button>
                )}
              </div>
            </div>

            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted">Quantity</label>
            <select value={qty} onChange={(e) => setQty(Number(e.target.value))} className={input}>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            {presenter ? (
              <>
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted pt-2">Payment simulator (demo)</div>
                <div className="space-y-1.5">
                  {MODES.map((m) => (
                    <label key={m.id} className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer ${mode === m.id ? 'border-amber bg-amber-dim' : 'border-border'}`}>
                      <input type="radio" name="mode" checked={mode === m.id} onChange={() => setMode(m.id)} className="mt-1" />
                      <span><span className="block text-sm font-semibold">{m.label}</span><span className="block text-[11px] text-muted">{m.hint}</span></span>
                    </label>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-[11px] text-muted">Secure payment. You will be charged once.</p>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-sm font-bold text-muted">Total</span>
              <span className="text-xl font-extrabold text-amber">{inr(checkout.price * qty)}</span>
            </div>
            <button
              type="button"
              onClick={pay}
              disabled={placing}
              className="w-full bg-primary hover:bg-[#265B55] text-white font-bold py-2.5 rounded-xl cursor-pointer disabled:opacity-50 transition-all shadow-xs neon-glow-teal active:scale-[0.98]"
            >
              {placing ? 'Processing payment…' : `Pay ${inr(checkout.price * qty)}`}
            </button>
          </div>
        </div>
      )}

      <EditProfileModal
        open={editProfileModal}
        onClose={() => setEditProfileModal(false)}
        customer={customer}
      />

      <ChatWidget customer={customer} orders={orders} open={chatOpen} setOpen={setChatOpen} preset={preset}
        onRegistered={loadComplaints} onOpenComplaints={() => goTo('/complaints')} />
    </div>
  );
}
