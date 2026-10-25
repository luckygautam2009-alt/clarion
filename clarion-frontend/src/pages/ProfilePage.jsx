import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  Package,
  Truck,
  Clock,
  ArrowLeft,
  HelpCircle,
  LogOut,
  Camera,
  Bell,
  FileText,
  Check,
  X,
  Search,
  RotateCcw,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Phone,
  MapPin,
  UserCheck,
} from 'lucide-react';
import {
  getShopOrders,
  simulateShopOrder,
  getMyComplaints,
  getMyNotifications,
  markMyNotificationsRead,
  dismissMyNotifications,
  fetchMyAvatarUrl,
  uploadMyAvatar,
  removeMyAvatar,
  updateMyName,
} from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { goTo } from '../auth/nav';
import ChatWidget from '../components/customer/ChatWidget';
import EditProfileModal from '../components/customer/EditProfileModal';
import { getProductImage, PRODUCT_IMAGES } from '../data/productImages';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const STATUS_STYLE = {
  in_transit: 'text-[#C58B4B] border-[#C58B4B]/40 bg-[#C58B4B]/10',
  delivered: 'text-[#2E7D5B] border-[#2E7D5B]/40 bg-[#2E7D5B]/10',
  pending: 'text-[#C4433A] border-[#C4433A]/40 bg-[#C4433A]/10',
  cancelled: 'text-muted border-border-strong bg-ink-lighter',
  returned: 'text-muted border-border-strong bg-ink-lighter',
};

function suggestIssue(o) {
  if (o.status === 'pending') return 'failed';
  if ((o.payments || []).filter((p) => p.gatewayStatus === 'success').length > 1) return 'double';
  if (o.status === 'delivered') return 'damaged';
  if (o.status === 'in_transit') return 'delay';
  return 'other';
}

export default function ProfilePage({ customer: initialCustomer, onLogout, initialTab = 'orders' }) {
  const { customer: authCustomer, ready, logout, refresh } = useAuth();
  const customer = authCustomer || initialCustomer;

  const [tab, setTab] = useState(initialTab);
  const [orders, setOrders] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);

  const [loadingOrders, setLoadingOrders] = useState(true);
  const [orderError, setOrderError] = useState(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState('all');

  const [avatar, setAvatar] = useState(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(customer ? customer.name : '');
  const [profileNotice, setProfileNotice] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const [orderNotice, setOrderNotice] = useState(null);
  const [busyAction, setBusyAction] = useState(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [preset, setPreset] = useState(null);

  const [presenter, setPresenter] = useState(() => {
    try {
      return localStorage.getItem('clarion.presenter') === '1';
    } catch {
      return false;
    }
  });

  const currentAvatarUrl = useRef(null);
  const customerId = customer ? customer.id : null;

  // Sync customer name
  useEffect(() => {
    if (customer?.name) setNameVal(customer.name);
  }, [customer?.name]);

  // Auth redirect
  useEffect(() => {
    if (ready && !customer) {
      goTo('/login?next=/orders');
    }
  }, [ready, customer]);

  // Load Avatar from API
  const loadAvatar = useCallback(async () => {
    try {
      const url = await fetchMyAvatarUrl().catch(() => null);
      if (currentAvatarUrl.current) URL.revokeObjectURL(currentAvatarUrl.current);
      currentAvatarUrl.current = url;
      setAvatar(url);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadAvatar();
    return () => {
      if (currentAvatarUrl.current) URL.revokeObjectURL(currentAvatarUrl.current);
    };
  }, [loadAvatar]);

  // Load Orders
  const loadOrders = useCallback(async () => {
    if (!customerId) return;
    try {
      const res = await getShopOrders(customerId);
      setOrders(res.data || []);
      setOrderError(null);
    } catch (err) {
      setOrderError(err.message || 'Could not load your orders');
    } finally {
      setLoadingOrders(false);
    }
  }, [customerId]);

  // Load Complaints
  const loadComplaints = useCallback(async () => {
    if (!customerId) return;
    try {
      const res = await getMyComplaints();
      setComplaints(res.data || []);
    } catch {
      /* ignore */
    }
  }, [customerId]);

  // Load Notifications
  const loadNotifications = useCallback(async () => {
    try {
      const res = await getMyNotifications();
      setNotifications(res.data.notifications || []);
      setUnread(res.data.unread || 0);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!customerId) return;
    loadOrders();
    loadComplaints();
    loadNotifications();

    const timer = setInterval(() => {
      loadOrders();
      loadComplaints();
      loadNotifications();
    }, 10000);

    return () => clearInterval(timer);
  }, [customerId, loadOrders, loadComplaints, loadNotifications]);

  function togglePresenter() {
    const next = !presenter;
    setPresenter(next);
    try {
      localStorage.setItem('clarion.presenter', next ? '1' : '0');
    } catch {
      /* ignore */
    }
  }

  // Profile actions
  async function handleAvatarPick(e) {
    const file = (e.target.files || [])[0];
    e.target.value = '';
    if (!file) return;
    setProfileNotice(null);
    if (!file.type.startsWith('image/')) {
      setProfileNotice({ ok: false, text: 'Please choose an image file (JPG, PNG, WebP).' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setProfileNotice({ ok: false, text: 'The photo must be under 2 MB.' });
      return;
    }
    setAvatarBusy(true);
    try {
      await uploadMyAvatar(file);
      await loadAvatar();
      setProfileNotice({ ok: true, text: 'Profile photo updated successfully.' });
    } catch (err) {
      setProfileNotice({ ok: false, text: err.message || 'Could not upload photo.' });
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleAvatarRemove() {
    setAvatarBusy(true);
    setProfileNotice(null);
    try {
      await removeMyAvatar();
      await loadAvatar();
      setProfileNotice({ ok: true, text: 'Photo removed.' });
    } catch (err) {
      setProfileNotice({ ok: false, text: err.message || 'Could not remove photo.' });
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleSaveName() {
    if (nameVal.trim().length < 2) {
      setProfileNotice({ ok: false, text: 'Name must be at least 2 characters.' });
      return;
    }
    setAvatarBusy(true);
    setProfileNotice(null);
    try {
      await updateMyName(nameVal.trim());
      if (refresh) await refresh();
      setEditingName(false);
      setProfileNotice({ ok: true, text: 'Name updated successfully.' });
    } catch (err) {
      setProfileNotice({ ok: false, text: err.message || 'Could not update name.' });
    } finally {
      setAvatarBusy(false);
    }
  }

  // Order Simulation Actions (deliver, delay, cancel)
  async function simOrder(order, action) {
    setBusyAction(order.id + action);
    setOrderNotice(null);
    try {
      await simulateShopOrder(order.id, customerId, action);
      await loadOrders();
      setOrderNotice({
        ok: true,
        text: `Simulated "${action}" for Order ${order.id}. Tracking updated.`,
      });
    } catch (err) {
      setOrderNotice({ ok: false, text: err.message || 'Simulation action failed' });
    } finally {
      setBusyAction(null);
    }
  }

  // Help With Order -> opens AI ChatWidget
  function helpWithOrder(order) {
    setPreset({ orderId: order.id, issue: suggestIssue(order), ts: Date.now() });
    setChatOpen(true);
  }

  // Notification actions
  async function markAllNotificationsRead() {
    await markMyNotificationsRead();
    loadNotifications();
  }

  async function dismissNotification(n, e) {
    e.stopPropagation();
    try {
      await dismissMyNotifications({ ids: [n.id] });
      loadNotifications();
    } catch {
      /* ignore */
    }
  }

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchFilter =
        orderFilter === 'all'
          ? true
          : orderFilter === 'in_transit'
          ? o.status === 'in_transit'
          : orderFilter === 'delivered'
          ? o.status === 'delivered'
          : orderFilter === 'pending'
          ? o.status === 'pending'
          : orderFilter === 'cancelled'
          ? o.status === 'cancelled' || o.status === 'returned'
          : true;

      const q = orderSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        String(o.id).toLowerCase().includes(q) ||
        String(o.product || '').toLowerCase().includes(q) ||
        String(o.courierTracking || '').toLowerCase().includes(q);

      return matchFilter && matchSearch;
    });
  }, [orders, orderFilter, orderSearch]);

  if (!customer) {
    return (
      <div className="min-h-screen bg-ink text-paper flex items-center justify-center text-sm text-muted font-bold">
        Loading customer session…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink text-paper transition-colors duration-200">
      {/* ── Top Header ── */}
      <header
        className="sticky top-0 z-40 border-b border-border backdrop-blur-md transition-colors"
        style={{ background: 'var(--header-glass)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          <div
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => goTo('/store')}
            title="Back to CLARION Store"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center p-1.5 overflow-hidden shadow-xs">
              <img src="/favicon.png" alt="CLARION" className="w-full h-full object-contain" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-extrabold tracking-tight text-paper">CLARION</span>
              <span className="text-border-strong text-base select-none">/</span>
              <span className="text-xs sm:text-sm text-paper-dim dark:text-muted font-bold">
                {tab === 'orders' ? 'My Orders' : 'Customer Portal'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              id="btn-back-to-store"
              onClick={() => goTo('/store')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-ink-light hover:bg-ink-lighter border border-border-strong text-paper text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-xs active:scale-[0.98]"
            >
              <ArrowLeft className="w-4 h-4 text-primary" />
              <span>Back to Store</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                if (onLogout) await onLogout();
                else if (logout) await logout();
                goTo('/');
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-ink-light hover:bg-ink-lighter border border-border-strong text-muted hover:text-alert text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-xs"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Layout ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="grid gap-8 lg:grid-cols-[340px_1fr] items-start">
          {/* ── Left Column: Profile Card & Navigation ── */}
          <aside className="lg:sticky lg:top-26 space-y-5">
            <div className="rounded-2xl border border-border-strong p-6 bg-white dark:bg-ink-light shadow-xs space-y-5">
              {/* Avatar + Info */}
              <div className="text-center">
                <div className="relative w-22 h-22 rounded-full mx-auto mb-3 border-2 border-primary/30 p-1 shadow-sm">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={customer.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-[#253B3D] text-white flex items-center justify-center text-2xl font-bold font-display">
                      {customer.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}

                  <label
                    title="Change profile photo"
                    className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#2F6F68] hover:bg-[#265B55] text-white flex items-center justify-center cursor-pointer shadow-md transition-colors border-2 border-white dark:border-ink-light"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarPick}
                      disabled={avatarBusy}
                    />
                  </label>
                </div>

                {avatar && (
                  <button
                    type="button"
                    onClick={handleAvatarRemove}
                    disabled={avatarBusy}
                    className="text-[11px] font-bold text-muted hover:text-alert cursor-pointer transition-colors"
                  >
                    Remove photo
                  </button>
                )}

                {/* Name & Email */}
                <div className="mt-2.5">
                  {editingName ? (
                    <div className="flex items-center justify-center gap-1.5">
                      <input
                        value={nameVal}
                        onChange={(e) => setNameVal(e.target.value)}
                        maxLength={80}
                        className="w-36 bg-ink-inset border border-border-strong rounded-lg px-2.5 py-1 text-xs font-bold text-paper focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={handleSaveName}
                        disabled={avatarBusy}
                        className="text-xs font-bold text-primary hover:underline cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingName(false)}
                        className="text-xs text-muted hover:text-paper cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="font-extrabold text-base text-paper flex items-center justify-center gap-1.5">
                      <span>{customer.name}</span>
                      <button
                        type="button"
                        onClick={() => setEditingName(true)}
                        className="text-xs font-bold text-primary hover:underline cursor-pointer"
                        title="Edit name"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                  <div className="text-xs text-muted mt-0.5 truncate">{customer.email}</div>
                  <div className="text-[11px] font-mono text-muted/80 mt-0.5">ID: {customer.id}</div>

                  {/* Phone & Delivery Address Details */}
                  <div className="mt-3.5 pt-3 border-t border-border/70 space-y-2 text-left">
                    <div className="flex items-center gap-2 text-xs">
                      <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                      {customer.phone ? (
                        <span className="font-bold text-paper">{customer.phone}</span>
                      ) : (
                        <span className="text-muted/70 italic">No mobile number added</span>
                      )}
                    </div>

                    <div className="flex items-start gap-2 text-xs">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      {customer.address ? (
                        <span className="text-muted leading-relaxed">
                          {customer.address}
                          {customer.city ? `, ${customer.city}` : ''}
                          {customer.pincode ? ` - ${customer.pincode}` : ''}
                        </span>
                      ) : (
                        <span className="text-muted/70 italic">No delivery address saved</span>
                      )}
                    </div>

                    <button
                      type="button"
                      id="btn-profile-edit-details"
                      onClick={() => setShowEditModal(true)}
                      className="w-full mt-1.5 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-ink-lighter hover:bg-ink-inset border border-border-strong text-paper text-xs font-bold transition-all cursor-pointer shadow-2xs hover:border-primary/40"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-primary" />
                      <span>Edit Details & Address</span>
                    </button>
                  </div>
                </div>
              </div>

              {profileNotice && (
                <p
                  className={`text-xs font-bold text-center px-2 py-1.5 rounded-lg border ${
                    profileNotice.ok
                      ? 'text-verified border-verified/40 bg-verified-dim'
                      : 'text-alert border-alert/40 bg-alert-dim'
                  }`}
                >
                  {profileNotice.text}
                </p>
              )}

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
                <div className="rounded-xl border border-border bg-ink-inset p-3 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Orders</div>
                  <div className="text-xl font-extrabold text-paper mt-0.5">{orders.length}</div>
                </div>
                <div className="rounded-xl border border-border bg-ink-inset p-3 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Complaints</div>
                  <div className="text-xl font-extrabold text-paper mt-0.5">{complaints.length}</div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <nav className="space-y-1 pt-2">
                <button
                  type="button"
                  id="tab-my-orders"
                  onClick={() => setTab('orders')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer border ${
                    tab === 'orders'
                      ? 'bg-primary text-white border-primary neon-edge-teal shadow-xs'
                      : 'border-transparent text-paper hover:bg-ink-lighter'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Package className="w-4 h-4 shrink-0" />
                    <span>My Orders</span>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      tab === 'orders' ? 'bg-white/20 text-white' : 'bg-ink-inset text-muted'
                    }`}
                  >
                    {orders.length}
                  </span>
                </button>

                <button
                  type="button"
                  id="tab-notifications"
                  onClick={() => setTab('notifications')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer border ${
                    tab === 'notifications'
                      ? 'bg-primary text-white border-primary neon-edge-teal shadow-xs'
                      : 'border-transparent text-paper hover:bg-ink-lighter'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Bell className="w-4 h-4 shrink-0" />
                    <span>Notifications</span>
                  </div>
                  {unread > 0 ? (
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-alert text-white">
                      {unread}
                    </span>
                  ) : (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        tab === 'notifications' ? 'bg-white/20 text-white' : 'bg-ink-inset text-muted'
                      }`}
                    >
                      {notifications.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  id="tab-my-complaints"
                  onClick={() => setTab('complaints')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer border ${
                    tab === 'complaints'
                      ? 'bg-primary text-white border-primary neon-edge-teal shadow-xs'
                      : 'border-transparent text-paper hover:bg-ink-lighter'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 shrink-0" />
                    <span>My Complaints</span>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      tab === 'complaints' ? 'bg-white/20 text-white' : 'bg-ink-inset text-muted'
                    }`}
                  >
                    {complaints.length}
                  </span>
                </button>
              </nav>

              {/* Presenter Mode Toggle */}
              <div className="pt-4 border-t border-border">
                <label className="flex items-center justify-between text-xs font-bold text-muted cursor-pointer select-none">
                  <span className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-primary" /> Presenter Demo Controls
                  </span>
                  <input
                    type="checkbox"
                    checked={presenter}
                    onChange={togglePresenter}
                    className="cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </aside>

          {/* ── Right Column: Content Area ── */}
          <div className="space-y-6">
            {/* ══════════ TAB: MY ORDERS ══════════ */}
            {tab === 'orders' && (
              <section className="space-y-5">
                {/* Orders Heading & Actions */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border">
                  <div>
                    <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-paper">
                      My Orders
                    </h1>
                    <p className="text-sm text-muted mt-1 font-medium">
                      Track delivery estimates, courier status, payment details, and get live help.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => goTo('/store')}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-[#265B55] transition-all cursor-pointer shadow-xs neon-glow-teal active:scale-[0.98]"
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>Browse Products</span>
                    </button>
                  </div>
                </div>

                {/* Search & Status Filters */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      ['all', 'All Orders'],
                      ['in_transit', 'In Transit'],
                      ['delivered', 'Delivered'],
                      ['pending', 'Pending'],
                      ['cancelled', 'Cancelled'],
                    ].map(([k, label]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setOrderFilter(k)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                          orderFilter === k
                            ? 'bg-primary text-white border-primary neon-edge-teal shadow-xs'
                            : 'border-border-strong text-muted hover:text-paper hover:bg-white dark:hover:bg-ink-light'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="relative min-w-52 flex-1 sm:flex-none">
                    <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-2.5" />
                    <input
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      placeholder="Search order ID or product…"
                      className="w-full bg-white dark:bg-ink-light border border-border-strong rounded-xl pl-8 pr-3 py-1.5 text-xs font-semibold text-paper placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-2xs"
                    />
                  </div>
                </div>

                {/* Notice message for simulation actions */}
                {orderNotice && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-3 shadow-xs ${
                      orderNotice.ok
                        ? 'text-verified border-verified/40 bg-verified-dim'
                        : 'text-alert border-alert/40 bg-alert-dim'
                    }`}
                  >
                    <span>{orderNotice.text}</span>
                    <button
                      type="button"
                      onClick={() => setOrderNotice(null)}
                      className="cursor-pointer text-muted hover:text-paper"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Loading State */}
                {loadingOrders && (
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="rounded-2xl border border-border bg-white dark:bg-ink-light p-5 space-y-3 animate-pulse"
                      >
                        <div className="h-5 bg-ink-inset rounded w-1/3" />
                        <div className="h-4 bg-ink-inset rounded w-1/2" />
                        <div className="h-10 bg-ink-inset rounded w-full" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Error State */}
                {!loadingOrders && orderError && (
                  <div className="rounded-2xl border border-alert/40 bg-alert-dim p-6 text-center space-y-3">
                    <AlertCircle className="w-8 h-8 text-alert mx-auto" />
                    <div className="text-sm font-bold text-alert">{orderError}</div>
                    <button
                      type="button"
                      onClick={loadOrders}
                      className="px-4 py-2 rounded-xl bg-white dark:bg-ink-light border border-border text-xs font-bold text-paper hover:bg-ink-lighter cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Retry
                    </button>
                  </div>
                )}

                {/* Empty State */}
                {!loadingOrders && !orderError && !filteredOrders.length && (
                  <div className="rounded-2xl border border-border bg-white dark:bg-ink-light p-10 text-center space-y-4 shadow-xs">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto">
                      <Package className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-paper">
                        {orders.length ? 'No orders match your filter' : 'No orders yet'}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted max-w-md mx-auto mt-1">
                        {orders.length
                          ? 'Try adjusting your search query or status filter to find what you are looking for.'
                          : 'When you purchase products from the store, they will appear here with live courier tracking, ETA, and support options.'}
                      </p>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => goTo('/store')}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-[#265B55] text-white text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-xs neon-glow-teal"
                      >
                        <Package className="w-4 h-4" />
                        <span>Go to Store</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Orders List */}
                {!loadingOrders && !orderError && filteredOrders.length > 0 && (
                  <div className="space-y-4">
                    {filteredOrders.map((o) => (
                      <div
                        key={o.id}
                        className="rounded-2xl border border-border bg-white dark:bg-ink-light p-5 sm:p-6 shadow-xs hover:shadow-sm transition-all space-y-4"
                      >
                        {/* Order Header: Thumbnail, ID, Product, Amount, Status Badge */}
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            {(() => {
                              const pName = (o.product || '').toLowerCase();
                              const matchedKey = Object.keys(PRODUCT_IMAGES).find((k) =>
                                pName.includes(k)
                              );
                              const orderImg = o.image || getProductImage(matchedKey || o.productId || 'earbuds');
                              return (
                                <img
                                  src={orderImg}
                                  alt={o.product}
                                  className="w-13 h-13 rounded-xl object-cover border border-border shadow-xs shrink-0"
                                />
                              );
                            })()}
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-extrabold text-primary text-sm sm:text-base">
                                  #{o.id}
                                </span>
                                <span className="text-muted font-bold">·</span>
                                <span className="font-extrabold text-base sm:text-lg text-paper">
                                  {o.product}
                                </span>
                              </div>
                              <div className="text-base sm:text-lg font-extrabold text-amber mt-0.5">
                                {inr(o.amount)}
                              </div>
                            </div>
                          </div>

                          <span
                            className={`text-xs font-extrabold uppercase px-3 py-1 rounded-full border shadow-2xs ${
                              STATUS_STYLE[o.status] || STATUS_STYLE.cancelled
                            }`}
                          >
                            {String(o.status).replace(/_/g, ' ')}
                          </span>
                        </div>

                        {/* Courier & Shipment Details */}
                        {(o.courierTracking || o.estimatedDelivery || o.courierStatus) && (
                          <div className="rounded-xl border border-border bg-ink-inset/60 p-3.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
                            {o.courierTracking && (
                              <div className="flex items-center gap-1.5 font-semibold text-paper">
                                <Truck className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span className="text-muted">Tracking:</span>
                                <span className="font-mono font-bold">{o.courierTracking}</span>
                              </div>
                            )}

                            {o.estimatedDelivery && (
                              <div className="flex items-center gap-1.5 font-semibold text-paper">
                                <Clock className="w-3.5 h-3.5 text-muted shrink-0" />
                                <span className="text-muted">Estimated Delivery:</span>
                                <span className="font-bold">{o.estimatedDelivery}</span>
                              </div>
                            )}

                            {o.courierStatus && (
                              <div className="flex items-center gap-1.5 font-semibold text-paper">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                <span className="text-muted">Status:</span>
                                <span className="font-bold">{o.courierStatus}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Payment & Refund breakdown */}
                        <div className="flex flex-wrap gap-2 text-xs">
                          {(o.payments || []).map((p) => (
                            <span
                              key={p.id}
                              className="px-2.5 py-1 rounded-lg border border-border bg-ink-inset font-semibold text-paper flex items-center gap-1.5"
                            >
                              <span className="font-mono text-muted">{p.id}</span>
                              <span>·</span>
                              <span className="font-bold">{inr(p.amount)}</span>
                              <span>·</span>
                              <span
                                className={`text-[11px] font-bold uppercase ${
                                  p.localStatus === 'success' ? 'text-verified' : 'text-alert'
                                }`}
                              >
                                {presenter
                                  ? `gw ${p.gatewayStatus} / ${p.localStatus}`
                                  : p.localStatus === 'success'
                                  ? 'Paid'
                                  : 'Failed'}
                              </span>
                            </span>
                          ))}

                          {(o.refunds || []).map((r) => (
                            <span
                              key={r.id}
                              className={`px-2.5 py-1 rounded-lg border font-bold text-xs ${
                                r.status === 'cancelled'
                                  ? 'text-muted border-border-strong bg-ink-inset'
                                  : 'text-verified border-verified/40 bg-verified-dim'
                              }`}
                            >
                              Refund {r.id} · {inr(r.amount)} · {r.status}
                            </span>
                          ))}
                        </div>

                        {/* Order Actions Footer */}
                        <div className="pt-3.5 border-t border-border flex flex-wrap items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => helpWithOrder(o)}
                            className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline cursor-pointer"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>Need help with this order?</span>
                          </button>

                          {/* Presenter Demo Courier Controls */}
                          {presenter && (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-extrabold text-muted">
                                <Truck className="w-3 h-3 text-primary" /> Courier demo:
                              </span>

                              {o.status === 'in_transit' && (
                                <>
                                  <button
                                    type="button"
                                    disabled={!!busyAction}
                                    onClick={() => simOrder(o, 'deliver')}
                                    className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-border-strong bg-white dark:bg-ink-light hover:bg-ink-lighter text-paper cursor-pointer disabled:opacity-50 transition-all shadow-2xs"
                                  >
                                    {busyAction === o.id + 'deliver' ? 'Updating…' : 'Mark delivered'}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!!busyAction}
                                    onClick={() => simOrder(o, 'delay')}
                                    className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-border-strong bg-white dark:bg-ink-light hover:bg-ink-lighter text-paper cursor-pointer disabled:opacity-50 transition-all shadow-2xs"
                                  >
                                    {busyAction === o.id + 'delay' ? 'Updating…' : 'Simulate delay'}
                                  </button>
                                </>
                              )}

                              {(o.status === 'in_transit' || o.status === 'pending') && (
                                <button
                                  type="button"
                                  disabled={!!busyAction}
                                  onClick={() => simOrder(o, 'cancel')}
                                  className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-alert/30 text-alert bg-alert-dim hover:bg-alert/20 cursor-pointer disabled:opacity-50 transition-all shadow-2xs"
                                >
                                  {busyAction === o.id + 'cancel' ? 'Cancelling…' : 'Cancel order'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ══════════ TAB: NOTIFICATIONS ══════════ */}
            {tab === 'notifications' && (
              <section className="rounded-2xl border border-border-strong p-6 bg-white dark:bg-ink-light shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div>
                    <h2 className="font-display text-xl font-extrabold text-paper">Notifications</h2>
                    <p className="text-xs text-muted mt-0.5">Stay updated on order events and complaint resolutions.</p>
                  </div>
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={markAllNotificationsRead}
                      className="text-xs font-bold text-primary hover:underline cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {!notifications.length && (
                  <p className="text-sm text-muted py-6 text-center">No notifications yet.</p>
                )}

                <div className="space-y-2.5">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 transition-colors ${
                        n.readAt
                          ? 'border-border bg-ink-inset/40 text-muted'
                          : 'border-primary/30 bg-primary/5 text-paper'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm">{n.title || 'Notification'}</div>
                        <div className="text-xs mt-0.5">{n.message}</div>
                        <div className="text-[10px] text-muted mt-1">
                          {new Date(n.ts || n.createdAt).toLocaleString('en-IN')}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => dismissNotification(n, e)}
                        className="text-muted hover:text-alert cursor-pointer p-1"
                        title="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ══════════ TAB: MY COMPLAINTS ══════════ */}
            {tab === 'complaints' && (
              <section className="rounded-2xl border border-border-strong p-6 bg-white dark:bg-ink-light shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
                  <div>
                    <h2 className="font-display text-xl font-extrabold text-paper">My Complaints</h2>
                    <p className="text-xs text-muted mt-0.5">
                      Review registered investigation cases and arbitration statuses.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => goTo('/complaints')}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-[#265B55] transition-all cursor-pointer shadow-xs neon-glow-teal"
                  >
                    <span>Full Complaints Tracker</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

                {!complaints.length && (
                  <div className="py-8 text-center space-y-3">
                    <p className="text-sm text-muted">You have not registered any complaints yet.</p>
                    <button
                      type="button"
                      onClick={() => setChatOpen(true)}
                      className="text-xs font-bold text-primary hover:underline cursor-pointer"
                    >
                      File a new complaint with AI assistant →
                    </button>
                  </div>
                )}

                <div className="space-y-3">
                  {complaints.map((c) => (
                    <div
                      key={c.id}
                      className="p-4 rounded-xl border border-border bg-ink-inset/40 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-bold text-sm text-paper">
                          Complaint #{c.id} {c.orderId ? `· ${c.orderId}` : ''}
                        </div>
                        <div className="text-xs text-muted mt-0.5 line-clamp-1">“{c.issue}”</div>
                        <div className="text-[11px] text-muted mt-1">
                          Status: <span className="font-bold uppercase text-paper">{c.status}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => goTo('/complaints')}
                        className="text-xs font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <span>View details</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

      {/* ── Edit Profile & Delivery Details Modal ── */}
      <EditProfileModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        customer={customer}
      />

      {/* ── AI Assistant ChatWidget for Order Support ── */}
      <ChatWidget
        customer={customer}
        orders={orders}
        open={chatOpen}
        setOpen={setChatOpen}
        preset={preset}
        onRegistered={loadComplaints}
        onOpenComplaints={() => goTo('/complaints')}
      />
    </div>
  );
}