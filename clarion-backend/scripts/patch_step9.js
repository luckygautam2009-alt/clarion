const fs = require('fs');
function edit(file, marker, a, b) {
  const s = fs.readFileSync(file, 'utf8');
  if (s.includes(marker)) return console.log('already patched:', file, '(' + marker + ')');
  if (!s.includes(a)) { console.error('NOT FOUND in', file, '->', a.slice(0, 80)); process.exit(1); }
  fs.writeFileSync(file, s.replace(a, b));
  console.log('patched:', file, '(' + marker + ')');
}

const PE = 'src/services/paymentEngine.js';
edit(PE, "require('../utils/phone')",
  "const { isValidVpa } = require('../utils/upi');",
  "const { isValidVpa } = require('../utils/upi');\nconst { normalizePhone } = require('../utils/phone');");

edit(PE, 'function resolveByPhone',
  "function pay({ customerId, upiId, amount, note, channel = 'upi', forceOutcome, productName }) {",
  `function resolveByPhone(raw) {
  const p = normalizePhone(raw);
  if (!p) return { error: 'Enter a valid 10-digit mobile number' };
  const rows = db.prepare("SELECT c.id, c.name, c.phone, w.upiId FROM customers c JOIN wallets w ON w.customerId=c.id WHERE c.phone IS NOT NULL AND c.phone != ''").all()
    .filter((r) => normalizePhone(r.phone) === p);
  if (rows.length === 0) return { error: 'No Clarion Pay account found for this mobile number' };
  if (rows.length > 1) return { error: 'More than one account uses this number. Pay using the UPI ID instead.' };
  const r = rows[0];
  return { payee: { kind: 'user', id: r.id, name: r.name, upiId: r.upiId, phone: 'XXXXXX' + p.slice(-4) } };
}

function pay({ customerId, upiId, amount, note, channel = 'upi', forceOutcome, productName }) {`);

edit(PE, 'resolveByPhone, decideOutcome',
  "module.exports = { pay, resolvePayee, decideOutcome, OUTCOMES };",
  "module.exports = { pay, resolvePayee, resolveByPhone, decideOutcome, OUTCOMES };");

const PC = 'src/controllers/pay.controller.js';
edit(PC, 'resolveByPhone }',
  "const { resolvePayee } = require('../services/paymentEngine');",
  "const { resolvePayee, resolveByPhone } = require('../services/paymentEngine');\nconst { normalizePhone } = require('../utils/phone');");

edit(PC, 'req.query.q',
  `  const payee = resolvePayee(String(req.query.upi || '').trim().toLowerCase());
  if (!payee) return res.status(404).json({ success: false, error: 'UPI ID not found' });
  res.json({ success: true, data: { kind: payee.kind, name: payee.name, upiId: payee.upiId } });`,
  `  const q = String(req.query.upi || req.query.q || '').trim();
  if (normalizePhone(q)) {
    const r = resolveByPhone(q);
    if (r.error) return res.status(404).json({ success: false, error: r.error });
    return res.json({ success: true, data: r.payee });
  }
  if (/^\\+?[\\d\\s-]{6,}$/.test(q)) return res.status(400).json({ success: false, error: 'Enter a valid 10-digit mobile number' });
  const payee = resolvePayee(q.toLowerCase());
  if (!payee) return res.status(404).json({ success: false, error: 'UPI ID not found' });
  res.json({ success: true, data: { kind: payee.kind, name: payee.name, upiId: payee.upiId } });`);

edit(PC, "phone: req.customer ? (req.customer.phone",
  "balance: w.balance, qr:",
  "balance: w.balance, phone: req.customer ? (req.customer.phone || '') : '', qr:");
