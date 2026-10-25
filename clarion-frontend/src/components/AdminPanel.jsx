import { useState, useEffect, useRef } from 'react';
import ComplaintsView from './admin/ComplaintsView';
import {
  createAdminSession,
  adminCheck,
  getAdminComplaints,
  getAdminOverview,
  uploadReferenceIdCard,
  getReferenceStatus,
  getOrCreateAdminProfile,
} from '../api/client';
import {
  saveAdminSession,
  getAdminSession,
  clearAdminSession,
  isAdminSessionVerified,
} from '../auth/adminSession';
import { goTo } from '../auth/nav';
import {
  Search,
  LogOut,
  ShieldCheck,
  Command,
  ChevronDown,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Lock,
  Upload,
} from 'lucide-react';
import IDScanner from './IDScanner';
import LeftNav from './admin/LeftNav';
import StatCards from './admin/StatCards';
import DataTable from './admin/DataTable';
import AnalyticsView from './admin/AnalyticsView';
import AuditLogView from './admin/AuditLogView';

function getInitials(str) {
  if (!str) return 'AD';
  const parts = str.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AdminPanel({ onClose }) {
  // Pre-unlock verification & configuration state
  const [refConfigured, setRefConfigured] = useState(null); // null = checking
  const [setupPassword, setSetupPassword] = useState('');
  const [setupFile, setSetupFile] = useState(null);
  const [setupError, setSetupError] = useState(null);
  const [setupLoading, setSetupLoading] = useState(false);

  // Login form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [scanning, setScanning] = useState(false);

  // Authenticated state
  const [unlocked, setUnlocked] = useState(false);
  const [data, setData] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [, setVerifyResult] = useState(null);
  const [activeTable, setActiveTable] = useState(
    () => new URLSearchParams(window.location.search).get('view') || 'complaints'
  );

  // Top header search bar state (filters active table client-side across all columns)
  const [globalSearch, setGlobalSearch] = useState('');
  const [attention, setAttention] = useState(0);

  // Profile avatar dropdown state
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const adminMenuRef = useRef(null);

  // ── Session Restoration & Validation ──
  useEffect(() => {
    const s = getAdminSession();
    if (!s || !s.token || !s.idVerified) {
      if (s && !s.idVerified) clearAdminSession();
      setUnlocked(false);
      return undefined;
    }
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        await adminCheck();
        const [overviewRes, profileRes] = await Promise.all([
          getAdminOverview(''),
          getOrCreateAdminProfile({ email: s.email, name: s.name, adminPassword: '' }).catch(() => null),
        ]);
        if (!alive) return;
        setName(s.name || '');
        setEmail(s.email || '');
        setData(overviewRes.data);
        if (profileRes && profileRes.profile) setAdminProfile(profileRes.profile);
        setUnlocked(true);
        const after = sessionStorage.getItem('clarion.afterAdminLogin');
        if (after) {
          sessionStorage.removeItem('clarion.afterAdminLogin');
          goTo(after);
        }
      } catch (e) {
        if (e.status === 401) {
          clearAdminSession();
          setUnlocked(false);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ── Prevent unauthorized access after logout on browser back navigation ──
  useEffect(() => {
    const checkAuthOnPop = () => {
      if (!isAdminSessionVerified()) {
        setUnlocked(false);
      }
    };
    window.addEventListener('popstate', checkAuthOnPop);
    return () => window.removeEventListener('popstate', checkAuthOnPop);
  }, []);

  // ── Expired Token Listener ──
  useEffect(() => {
    const onExpired = () => {
      clearAdminSession();
      setUnlocked(false);
      setData(null);
      setScanning(false);
    };
    window.addEventListener('clarion:admin-expired', onExpired);
    return () => window.removeEventListener('clarion:admin-expired', onExpired);
  }, []);

  // ── Close profile menu on outside click ──
  useEffect(() => {
    function onDocClick(e) {
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target)) {
        setAdminMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // ── Nav badge: complaints that need a human ──
  useEffect(() => {
    if (!unlocked) return undefined;
    let alive = true;
    const tick = async () => {
      try {
        const r = await getAdminComplaints({});
        if (alive) setAttention(r.data.summary.pendingHumanReview);
      } catch {
        /* ignore */
      }
    };
    tick();
    const t = setInterval(tick, 10000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [unlocked]);

  // ── Reference ID status check for pre-unlock ──
  useEffect(() => {
    getReferenceStatus()
      .then((res) => setRefConfigured(res.data.configured))
      .catch(() => setRefConfigured(false));
  }, []);

  // ── Login Step 1: Validate credentials with backend before ID scan ──
  async function handleStartScan(e) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Name, email, and admin password are all required.');
      return;
    }
    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      // Validate credentials against backend before opening scanner
      await getAdminOverview(password);
      setScanning(true);
    } catch (err) {
      setError(err.message || 'Invalid admin credentials');
    } finally {
      setLoading(false);
    }
  }

  // ── Login Step 2: Handle successful ID Verification scan ──
  async function handleVerified(verifyData) {
    setVerifyResult(verifyData);
    setLoading(true);
    try {
      const [overviewRes, profileRes] = await Promise.all([
        getAdminOverview(password),
        getOrCreateAdminProfile({ email: email.trim(), name: name.trim(), adminPassword: password }),
      ]);
      setData(overviewRes.data);
      if (profileRes && profileRes.profile) {
        setAdminProfile(profileRes.profile);
      }
      try {
        const s = await createAdminSession({
          adminPassword: password,
          employeeName: name.trim(),
          employeeEmail: email.trim(),
        });
        saveAdminSession({ ...s.data, idVerified: true });
      } catch (e) {
        console.error('Could not create admin session:', e.message);
      }
      setScanning(false);
      setUnlocked(true);
      const after = sessionStorage.getItem('clarion.afterAdminLogin');
      if (after) {
        sessionStorage.removeItem('clarion.afterAdminLogin');
        goTo(after);
      }
    } catch (err) {
      setError(err.message || 'Could not load admin data');
      setScanning(false);
    } finally {
      setLoading(false);
    }
  }

  // ── Sign Out Handler: Invalidate session & redirect to login ──
  function handleSignOut() {
    clearAdminSession();
    setUnlocked(false);
    setData(null);
    setScanning(false);
    setPassword('');
    setName('');
    setEmail('');
    setAdminProfile(null);
    setVerifyResult(null);
    setAdminMenuOpen(false);
    window.history.replaceState({}, '', '/admin');
  }

  async function refreshOverview() {
    try {
      const r = await getAdminOverview(password);
      setData(r.data);
    } catch {
      /* keep stale data if refresh fails */
    }
  }

  async function handleSetupReference(e) {
    e.preventDefault();
    setSetupError(null);
    if (!setupPassword.trim()) {
      setSetupError('Admin password is required.');
      return;
    }
    if (!setupFile) {
      setSetupError('Please upload the reference NIET ID card image.');
      return;
    }
    setSetupLoading(true);
    try {
      await uploadReferenceIdCard({ file: setupFile, adminPassword: setupPassword });
      setRefConfigured(true);
    } catch (err) {
      setSetupError(err.message || 'Could not save reference ID card');
    } finally {
      setSetupLoading(false);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 1. POST-UNLOCK FULL-SCREEN ADMIN DASHBOARD
  // ═══════════════════════════════════════════════════════════
  if (unlocked) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-ink text-paper overflow-hidden font-sans select-none">
        {/* Full-width Top Enterprise Header */}
        <header className="h-16 px-4 sm:px-6 border-b border-border bg-ink-light flex items-center justify-between gap-4 shrink-0 shadow-xs z-20 transition-colors">
          {/* Left Brand Area */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/30 shadow-xs overflow-hidden p-1.5">
              <img src="/favicon.png" alt="CLARION Admin" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-extrabold text-paper leading-none tracking-tight">
                  CLARION Admin
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold bg-primary/15 text-primary border border-primary/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Console
                </span>
              </div>
              <p className="text-xs font-semibold text-muted hidden sm:block leading-tight mt-1">
                Biometric ID Verified Session
              </p>
            </div>
          </div>

          {/* Center Global Search Bar (Client-side filtering across active table) */}
          <div className="flex-1 max-w-lg mx-2 sm:mx-6">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search across all columns in active table…"
                className="w-full bg-ink-inset border border-border-strong rounded-xl pl-10 pr-12 py-2 text-sm font-semibold text-paper placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-xs font-mono font-bold text-muted bg-ink-light px-1.5 py-0.5 rounded border border-border pointer-events-none">
                <Command className="w-3 h-3" />
                <span>K</span>
              </div>
            </div>
          </div>

          {/* Right: Compact Admin Profile Button & Dropdown */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="relative" ref={adminMenuRef}>
              <button
                type="button"
                id="btn-admin-profile"
                onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-xl border border-border-strong bg-ink-inset hover:bg-ink-lighter transition-all cursor-pointer shadow-2xs focus-visible:outline-2 focus-visible:outline-primary select-none active:scale-[0.98]"
                aria-label="Admin profile menu"
                aria-expanded={adminMenuOpen}
              >
                <div className="w-7 h-7 rounded-full bg-[#002E6E] text-white flex items-center justify-center font-bold text-xs overflow-hidden shrink-0 border border-primary/30">
                  {adminProfile?.profile_photo ? (
                    <img
                      src={adminProfile.profile_photo}
                      alt={adminProfile.name || name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{getInitials(adminProfile?.name || name || 'Admin')}</span>
                  )}
                </div>
                <span className="text-xs font-bold text-paper hidden sm:inline max-w-[120px] truncate">
                  {(adminProfile?.name || name || 'Admin').split(' ')[0]}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-muted transition-transform duration-150 ${
                    adminMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Profile Dropdown Popover */}
              {adminMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-border-strong bg-white dark:bg-ink-light shadow-2xl z-50 overflow-hidden animate-in fade-in duration-150">
                  <div className="p-4 border-b border-border bg-ink-inset/40">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-[#002E6E] text-white flex items-center justify-center font-bold text-sm shrink-0 border border-primary/30 overflow-hidden shadow-xs">
                        {adminProfile?.profile_photo ? (
                          <img
                            src={adminProfile.profile_photo}
                            alt={adminProfile.name || name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{getInitials(adminProfile?.name || name || 'Admin')}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-sm text-paper truncate">
                          {adminProfile?.name || name || 'Administrator'}
                        </div>
                        <div className="text-xs text-muted truncate mt-0.5">
                          {adminProfile?.email || email}
                        </div>
                        <div className="text-[11px] font-mono text-muted/80 mt-0.5">
                          ID: {adminProfile?.employee_id || adminProfile?.login_id || 'ADM-001'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-xs">
                      <span className="text-muted font-medium">Status</span>
                      <span className="inline-flex items-center gap-1 font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full text-[11px]">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Biometric ID Verified</span>
                      </span>
                    </div>
                  </div>

                  <div className="p-1.5">
                    <button
                      type="button"
                      id="btn-admin-signout"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-alert hover:bg-alert-dim rounded-xl transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* 2-Column Dashboard Body: Reclaims full width (Right profile sidebar removed) */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left Navigation */}
          <LeftNav
            activeTable={activeTable}
            setActiveTable={setActiveTable}
            data={data}
            badges={{ complaints: attention }}
          />

          {/* Center Main Content Area: Naturally takes 100% of available width */}
          <main className="flex-1 flex flex-col p-3.5 sm:p-5 overflow-y-auto min-w-0 bg-ink transition-colors">
            {activeTable === 'complaints' ? (
              <ComplaintsView />
            ) : activeTable === 'analytics' ? (
              <AnalyticsView adminPassword={password} />
            ) : activeTable === 'auditlog' ? (
              <AuditLogView
                adminPassword={password}
                adminName={adminProfile?.name || name}
                adminEmail={email}
                onChanged={refreshOverview}
              />
            ) : (
              <>
                {/* Real KPI Statistics */}
                <StatCards data={data} />

                {/* Dense Data Table */}
                <DataTable
                  activeTable={activeTable}
                  data={data}
                  searchQuery={globalSearch}
                  setSearchQuery={setGlobalSearch}
                />
              </>
            )}
          </main>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 2. PRE-UNLOCK DEDICATED ADMIN LOGIN SCREEN
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-ink text-paper flex flex-col transition-colors duration-200">
      {/* Top Header */}
      <header
        className="border-b border-border backdrop-blur-md sticky top-0 z-40 transition-colors"
        style={{ background: 'var(--header-glass)' }}
      >
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center p-1.5 overflow-hidden shadow-xs">
              <img src="/favicon.png" alt="CLARION" className="w-full h-full object-contain" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-display text-2xl font-bold tracking-tight text-paper">CLARION</span>
              <span className="text-border-strong text-base select-none">/</span>
              <span className="text-xs sm:text-sm text-paper-dim dark:text-muted font-bold">Admin Portal</span>
            </div>
          </div>

          <button
            type="button"
            id="btn-admin-back-home"
            onClick={onClose || (() => goTo('/'))}
            className="flex items-center gap-2 text-xs sm:text-sm font-bold text-muted hover:text-paper cursor-pointer px-3.5 py-2 rounded-xl bg-ink-lighter hover:bg-ink-inset border border-border-strong transition-all shadow-2xs active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4 text-primary" />
            <span>Back to Home</span>
          </button>
        </div>
      </header>

      {/* Main Login Screen Body */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-lg rounded-2xl border border-border-strong bg-white dark:bg-ink-light p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Header info */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center mx-auto text-primary shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-extrabold text-paper tracking-tight">
              Admin Console Authentication
            </h2>
            <p className="text-xs sm:text-sm text-muted leading-relaxed max-w-sm mx-auto">
              Enter your credentials and complete institutional ID verification to access the admin dashboard.
            </p>
          </div>

          {refConfigured === null ? (
            <div className="p-8 text-center text-xs font-semibold text-muted flex flex-col items-center justify-center gap-3">
              <span className="w-6 h-6 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
              <span>Checking security configuration…</span>
            </div>
          ) : !refConfigured ? (
            <form onSubmit={handleSetupReference} className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-paper mb-1">
                <Lock className="w-4 h-4 text-primary" /> One-time setup: upload the reference NIET ID card
              </div>
              <p className="text-xs text-muted leading-relaxed font-medium">
                No reference ID card is configured yet. Upload one photo of a valid NIET ID card template once — all future verification scans will be compared against it.
              </p>
              <input
                value={setupPassword}
                onChange={(e) => setSetupPassword(e.target.value)}
                type="password"
                placeholder="Admin password"
                className="w-full bg-ink-inset border border-border rounded-xl px-3.5 py-2.5 text-xs font-semibold text-paper placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-5 text-center cursor-pointer hover:border-primary/50 transition-colors bg-ink-inset/40">
                <Upload className="w-5 h-5 text-primary" />
                <span className="text-xs font-bold text-paper">
                  {setupFile ? setupFile.name : 'Upload reference NIET ID card photo'}
                </span>
                <span className="text-[10px] text-muted font-semibold">JPG, PNG, or WebP</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setSetupFile(e.target.files?.[0] || null)}
                />
              </label>
              {setupError && <p className="text-xs text-alert font-bold">{setupError}</p>}
              <button
                type="submit"
                disabled={setupLoading}
                className="w-full bg-primary hover:bg-[#001F4D] text-white font-bold px-4 py-2.5 rounded-xl text-xs disabled:opacity-50 cursor-pointer transition-all shadow-xs neon-glow-teal"
              >
                {setupLoading ? 'Saving…' : 'Save Reference & Continue'}
              </button>
            </form>
          ) : loading ? (
            <div className="p-10 flex flex-col items-center justify-center gap-3 text-center">
              <span className="w-8 h-8 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
              <p className="text-sm font-bold text-paper">Verifying and unlocking admin console…</p>
            </div>
          ) : scanning ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-primary" /> Step 2: Institutional ID Verification
                </span>
                <button
                  type="button"
                  onClick={() => setScanning(false)}
                  className="text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  ← Back to credentials
                </button>
              </div>
              <IDScanner
                name={name.trim()}
                email={email.trim()}
                adminPassword={password}
                onVerified={handleVerified}
                onCancel={() => setScanning(false)}
              />
            </div>
          ) : (
            <form onSubmit={handleStartScan} className="space-y-4">
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-paper/90 mb-1.5">
                    Full Name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Yash Gautam"
                    required
                    className="w-full bg-ink-inset border border-border-strong rounded-xl px-3.5 py-2.5 text-sm font-semibold text-paper placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-paper/90 mb-1.5">
                    Email Address
                  </label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder="e.g. luckygautam2009@gmail.com"
                    required
                    className="w-full bg-ink-inset border border-border-strong rounded-xl px-3.5 py-2.5 text-sm font-semibold text-paper placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-paper/90 mb-1.5">
                    Admin Password
                  </label>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    placeholder="••••••••••••"
                    required
                    className="w-full bg-ink-inset border border-border-strong rounded-xl px-3.5 py-2.5 text-sm font-semibold text-paper placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl border border-alert/30 bg-alert-dim text-xs font-bold text-alert flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                id="btn-admin-proceed-scan"
                className="w-full bg-primary hover:bg-[#001F4D] text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all cursor-pointer shadow-xs active:scale-[0.98] neon-glow-teal flex items-center justify-center gap-2"
              >
                <span>Proceed to ID Verification Scan</span>
              </button>

              <div className="pt-2 text-center">
                <span className="text-[11px] text-muted flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  Protected by CLARION Institutional ID Verification
                </span>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
