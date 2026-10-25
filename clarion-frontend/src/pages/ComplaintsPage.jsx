import { useCallback, useEffect, useState } from 'react';
import { Camera, Check, X } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { goTo } from '../auth/nav';
import { getMyComplaints, confirmProposal, replyToComplaint } from '../api/client';
import StoreHeader from '../components/customer/StoreHeader';
import ChatWidget from '../components/customer/ChatWidget';

const STEPS = ['Registered', 'Under review', 'Resolved'];

function stepFor(status) {
  if (status === 'registered') return { current: 0, tone: 'text-muted border-border-strong bg-ink-lighter', label: 'Registered' };
  if (status === 'in_review') return { current: 1, tone: 'text-amber border-amber/40 bg-amber-dim', label: 'Under review' };
  if (status === 'needs_info') return { current: 1, tone: 'text-alert border-alert/40 bg-alert-dim', label: 'More information needed' };
  if (status === 'awaiting_you') return { current: 1, tone: 'text-alert border-alert/40 bg-alert-dim', label: 'Action needed' };
  if (status === 'answered') return { current: 2, tone: 'text-verified border-verified/40 bg-verified-dim', label: 'Answered' };
  return { current: 2, tone: 'text-verified border-verified/40 bg-verified-dim', label: 'Resolved' };
}

function Tracker({ current, attention }) {
  return (
    <div className="flex items-center gap-2 mt-4">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold border ${i < current || (i === current && current === 2) ? 'bg-verified text-ink border-verified' : i === current ? (attention ? 'bg-alert text-white border-alert' : 'bg-amber text-ink border-amber') : 'border-border-strong text-muted'}`}>
              {i < current || (i === current && current === 2) ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </span>
            <span className={`text-[11px] font-semibold hidden sm:inline ${i <= current ? 'text-paper' : 'text-muted'}`}>{s}</span>
          </div>
          {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 rounded ${i < current ? 'bg-verified' : 'bg-border-strong'}`} />}
        </div>
      ))}
    </div>
  );
}

export default function ComplaintsPage() {
  const { customer, ready, logout } = useAuth();
  const [list, setList] = useState([]);
  const [orders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [done, setDone] = useState({});
  const [replies, setReplies] = useState({});
  const [chatOpen, setChatOpen] = useState(false);

  const load = useCallback(async () => {
    try { setList((await getMyComplaints()).data || []); setError(null); }
    catch (e) { setError(e.message || 'Could not load your complaints'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (ready && !customer) goTo('/login?next=/complaints'); }, [ready, customer]);
  useEffect(() => { if (customer) load(); }, [customer, load]);
  useEffect(() => {
    if (!customer) return undefined;
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [customer, load]);

  async function answer(c, choice) {
    setBusy(c.id + choice);
    try {
      const res = await confirmProposal({ auditId: c.proposal.auditId, customerId: c.proposal.customerId, choice });
      setDone((d) => ({ ...d, [c.id]: res.data.message }));
      await load();
    } catch (e) { setError(e.message || 'Could not record your choice'); }
    finally { setBusy(null); }
  }

  function setReply(id, patch) { setReplies((r) => ({ ...r, [id]: { message: '', photos: [], error: null, ...(r[id] || {}), ...patch } })); }

  function pickPhotos(id, e) {
    const cur = replies[id] || { photos: [] };
    const next = [...cur.photos];
    let err = null;
    for (const file of Array.from(e.target.files || [])) {
      if (!file.type.startsWith('image/')) { err = 'Only image files are allowed.'; continue; }
      if (file.size > 5 * 1024 * 1024) { err = 'Each photo must be under 5 MB.'; continue; }
      if (next.length >= 3) { err = 'You can attach up to 3 photos.'; break; }
      next.push({ file, url: URL.createObjectURL(file) });
    }
    e.target.value = '';
    setReply(id, { photos: next, error: err });
  }

  async function sendReply(c) {
    const r = replies[c.id] || { message: '', photos: [] };
    if (r.message.trim().length < 8 && !r.photos.length) { setReply(c.id, { error: 'Add a short message (8+ characters) or at least one photo.' }); return; }
    setBusy('reply' + c.id);
    try {
      await replyToComplaint(c.id, { message: r.message.trim(), photos: r.photos.map((p) => p.file) });
      r.photos.forEach((p) => URL.revokeObjectURL(p.url));
      setReplies((x) => ({ ...x, [c.id]: undefined }));
      setDone((d) => ({ ...d, [c.id]: 'Thank you. We are checking your complaint again.' }));
      await load();
    } catch (e) { setReply(c.id, { error: e.message || 'Could not send your reply' }); }
    finally { setBusy(null); }
  }

  if (!customer) return <div className="min-h-screen bg-ink text-paper flex items-center justify-center text-sm text-muted">Loading…</div>;

  const open = (c) => ['registered', 'in_review', 'needs_info', 'awaiting_you'].includes(c.status);
  const shown = list.filter((c) => (filter === 'all' ? true : filter === 'open' ? open(c) : !open(c)));
  const actionNeeded = list.filter((c) => c.status === 'awaiting_you' || c.status === 'needs_info').length;
  const input = 'w-full bg-ink-inset border border-border rounded-lg px-3 py-2 text-sm text-paper focus:outline-none focus:ring-1 focus:ring-amber/50';

  return (
    <div className="min-h-screen bg-ink text-paper transition-colors duration-200">
      <StoreHeader customer={customer} active="complaints" actionNeeded={actionNeeded} onLogout={async () => { await logout(); goTo('/'); }} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-border">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-paper">Track my complaints</h1>
            <p className="text-sm text-muted mt-1">Follow every complaint from registration to resolution.</p>
          </div>
          <div className="flex gap-2">
            {[['all', 'All'], ['open', 'Open'], ['closed', 'Resolved']].map(([k, l]) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={`text-xs sm:text-sm font-semibold px-4 py-1.5 rounded-full border transition-all cursor-pointer select-none ${
                  filter === k
                    ? 'bg-[#34484A] text-white border-[#34484A] shadow-xs'
                    : 'border-border-strong text-muted hover:text-paper hover:bg-ink-lighter'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm font-semibold text-alert">{error}</p>}
        {loading && <p className="text-sm text-muted">Loading…</p>}
        {!loading && !shown.length && (
          <div className="rounded-xl border border-border bg-ink-light p-8 text-center">
            <p className="text-sm text-muted mb-3">{list.length ? 'No complaints in this view.' : 'You have not registered any complaints yet.'}</p>
            <button type="button" onClick={() => setChatOpen(true)} className="bg-amber text-ink font-bold text-xs px-4 py-2 rounded-lg cursor-pointer">Register a complaint</button>
          </div>
        )}

        <div className="space-y-4">
          {shown.map((c) => {
            const st = stepFor(c.status);
            const r = replies[c.id] || { message: '', photos: [], error: null };
            return (
              <section key={c.id} className="rounded-xl border border-border bg-ink-light p-5 shadow-2xs">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-bold">Complaint #{c.id}{c.orderId ? ` · ${c.orderId}` : ''}{c.product ? ` · ${c.product}` : ''}</div>
                    <div className="text-[11px] text-muted mt-0.5">Registered {new Date(c.ts).toLocaleString('en-IN')}{c.photoCount ? ` · ${c.photoCount} photo${c.photoCount > 1 ? 's' : ''} attached` : ''}</div>
                  </div>
                  <span className={`text-[11px] font-bold uppercase px-2.5 py-1 rounded-full border ${st.tone}`}>{st.label}</span>
                </div>
                <p className="text-sm text-muted mt-2 italic">“{c.issue}”</p>
                <Tracker current={st.current} attention={c.status === 'needs_info' || c.status === 'awaiting_you'} />

                <div className="mt-4 rounded-lg bg-ink-lighter border border-border p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">Latest update</div>
                  <p className="text-sm text-paper">{c.detail}</p>
                  {c.resolvedAt && <p className="text-[11px] text-muted mt-1">Resolved on {new Date(c.resolvedAt).toLocaleString('en-IN')}</p>}
                </div>

                {done[c.id] && <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-verified"><Check className="w-4 h-4" /> {done[c.id]}</p>}

                {c.status === 'awaiting_you' && c.proposal && (
                  <div className="mt-3 rounded-lg border border-amber/40 bg-amber-dim p-3">
                    <p className="text-sm text-paper mb-2.5">{c.proposal.summary}</p>
                    <div className="flex flex-wrap gap-2">
                      {c.proposal.options.map((o) => (
                        <button key={o.key} type="button" disabled={!!busy} onClick={() => answer(c, o.key)}
                          className={`text-xs font-bold px-3.5 py-2 rounded-lg cursor-pointer disabled:opacity-50 ${o.key === 'DECLINE' ? 'border border-border-strong text-muted' : 'bg-amber text-ink'}`}>{busy === c.id + o.key ? 'Saving…' : o.label}</button>
                      ))}
                    </div>
                  </div>
                )}

                {c.status === 'needs_info' && c.canReply && (
                  <div className="mt-3 rounded-lg border border-alert/40 bg-alert-dim p-3 space-y-2.5">
                    <div className="text-sm font-bold text-paper">Please add the details we asked for</div>
                    <textarea rows={2} maxLength={1000} value={r.message} onChange={(e) => setReply(c.id, { message: e.target.value })} placeholder="Type your reply (Hindi, English or Hinglish)" className={input} />
                    <div className="flex items-center gap-2 flex-wrap">
                      {r.photos.map((p, i) => (
                        <div key={p.url} className="relative w-14 h-14 rounded-lg overflow-hidden border border-border-strong">
                          <img src={p.url} alt={`reply ${i + 1}`} className="w-full h-full object-cover" />
                          <button type="button" aria-label="Remove" onClick={() => { URL.revokeObjectURL(p.url); setReply(c.id, { photos: r.photos.filter((_, k) => k !== i) }); }} className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 text-white flex items-center justify-center cursor-pointer"><X className="w-2.5 h-2.5" /></button>
                        </div>
                      ))}
                      {r.photos.length < 3 && (
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-amber cursor-pointer hover:underline"><Camera className="w-4 h-4" /> Add photo<input type="file" accept="image/*" multiple className="hidden" onChange={(e) => pickPhotos(c.id, e)} /></label>
                      )}
                    </div>
                    {r.error && <p className="text-xs font-semibold text-alert">{r.error}</p>}
                    <button type="button" disabled={busy === 'reply' + c.id} onClick={() => sendReply(c)} className="bg-amber text-ink font-bold text-xs px-4 py-2 rounded-lg cursor-pointer disabled:opacity-50">{busy === 'reply' + c.id ? 'Sending…' : 'Send reply'}</button>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </main>
      <ChatWidget customer={customer} orders={orders} open={chatOpen} setOpen={setChatOpen} preset={null} onRegistered={load} onOpenComplaints={() => load()} />
    </div>
  );
}
