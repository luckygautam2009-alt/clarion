const db = require('../db/connection');
const { pay } = require('../services/paymentEngine');
const wallet = require('../services/walletService');
const refunds = require('../services/refundService');
const { parseUpiUri, buildUpiUri } = require('../utils/upi');
const { resolvePayee, resolveByPhone } = require('../services/paymentEngine');
const { normalizePhone } = require('../utils/phone');

const ID_RE = /^[A-Za-z0-9_-]{1,50}$/;
const cid = (req) => (req.customer ? req.customer.id : String((req.body && req.body.customerId) || req.query.customerId || ''));

function payNow(req, res) {
  const customerId = cid(req);
  if (!ID_RE.test(customerId)) return res.status(400).json({ success: false, error: 'valid customerId is required' });
  const { upiId, amount, note, channel, forceOutcome } = req.body || {};
  const out = pay({ customerId, upiId, amount, note, channel: channel === 'qr' ? 'qr' : 'upi', forceOutcome });
  if (out.status >= 400) return res.status(out.status).json({ success: false, error: out.error });
  res.status(201).json({ success: true, data: { outcome: out.outcome, message: out.message, txn: out.txn, payments: out.payments, balance: out.balance } });
}

function myWallet(req, res) {
  const customerId = cid(req);
  if (!ID_RE.test(customerId)) return res.status(400).json({ success: false, error: 'valid customerId is required' });
  const w = wallet.ensureWallet(customerId);
  if (!w) return res.status(404).json({ success: false, error: 'Customer not found' });
  res.json({ success: true, data: { customerId, upiId: w.upiId, balance: w.balance, phone: req.customer ? (req.customer.phone || '') : '', qr: buildUpiUri({ upiId: w.upiId, name: req.customer ? req.customer.name : '' }) } });
}

function ledger(req, res) {
  const customerId = cid(req);
  if (!ID_RE.test(customerId)) return res.status(400).json({ success: false, error: 'valid customerId is required' });
  res.json({ success: true, data: wallet.getLedger(customerId, 50) });
}

function parseQr(req, res) {
  const parsed = parseUpiUri((req.body && req.body.raw) || '');
  if (!parsed) return res.status(400).json({ success: false, error: 'Not a valid UPI QR' });
  const payee = resolvePayee(parsed.upiId);
  if (!payee) return res.status(404).json({ success: false, error: 'This UPI ID is not registered on Clarion Pay' });
  res.json({ success: true, data: { ...parsed, payee: { kind: payee.kind, name: payee.name, upiId: payee.upiId } } });
}

function lookupPayee(req, res) {
  const q = String(req.query.upi || req.query.q || '').trim();
  if (normalizePhone(q)) {
    const r = resolveByPhone(q);
    if (r.error) return res.status(404).json({ success: false, error: r.error });
    return res.json({ success: true, data: r.payee });
  }
  if (/^\+?[\d\s-]{6,}$/.test(q)) return res.status(400).json({ success: false, error: 'Enter a valid 10-digit mobile number' });
  const payee = resolvePayee(q.toLowerCase());
  if (!payee) return res.status(404).json({ success: false, error: 'UPI ID not found' });
  res.json({ success: true, data: { kind: payee.kind, name: payee.name, upiId: payee.upiId } });
}

function merchants(req, res) {
  const rows = db.prepare("SELECT id, name, upiId, category FROM merchants WHERE category != 'Biller'").all()
    .map((m) => ({ ...m, qr: buildUpiUri({ upiId: m.upiId, name: m.name }) }));
  res.json({ success: true, data: rows });
}

function settleRefund(req, res) {
  const customerId = cid(req);
  const r = db.prepare('SELECT customerId FROM refunds WHERE id=?').get(req.params.id);
  if (!r || r.customerId !== customerId) return res.status(404).json({ success: false, error: 'Refund not found' });
  const out = refunds.settleRefund(req.params.id);
  if (out.status !== 200) return res.status(out.status).json({ success: false, error: out.error });
  res.json({ success: true, data: { refund: out.refund, balance: out.balance } });
}

module.exports = { payNow, myWallet, ledger, parseQr, lookupPayee, merchants, settleRefund };
