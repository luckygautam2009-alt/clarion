const VPA_RE = /^[a-zA-Z0-9._-]{2,64}@[a-zA-Z0-9]{2,32}$/;

const isValidVpa = (v) => typeof v === 'string' && VPA_RE.test(v.trim());

function parseUpiUri(raw) {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!/^upi:\/\/pay\?/i.test(s)) return null;
  let u;
  try { u = new URL(s); } catch { return null; }
  const pa = (u.searchParams.get('pa') || '').trim().toLowerCase();
  if (!isValidVpa(pa)) return null;
  const am = u.searchParams.get('am');
  const amount = am !== null && am !== '' ? Number(am) : null;
  if (amount !== null && (!Number.isFinite(amount) || amount <= 0)) return null;
  return {
    upiId: pa,
    name: u.searchParams.get('pn') || null,
    amount,
    note: u.searchParams.get('tn') || null,
    currency: (u.searchParams.get('cu') || 'INR').toUpperCase(),
  };
}

function buildUpiUri({ upiId, name, amount, note }) {
  const p = new URLSearchParams({ pa: upiId, pn: name || '', cu: 'INR' });
  if (amount) p.set('am', String(amount));
  if (note) p.set('tn', note);
  return `upi://pay?${p.toString()}`;
}

module.exports = { isValidVpa, parseUpiUri, buildUpiUri };
