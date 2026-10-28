const db = require('../db/connection');
require('../db/paymentsSchema');
const { pay } = require('../services/paymentEngine');
const wallet = require('../services/walletService');
const CATALOG = require('../services/paytmCatalog');

const ID_RE = /^[A-Za-z0-9_-]{1,50}$/;

const BILLERS = {
  'Recharge & Bills': { id: 'B001', name: 'Clarion Recharge & Bills', upiId: 'recharge@clarion' },
  'Travel & Tickets': { id: 'B002', name: 'Clarion Travel & Tickets', upiId: 'travel@clarion' },
  Finance: { id: 'B003', name: 'Clarion Finance', upiId: 'finance@clarion' },
};

const ins = db.prepare("INSERT OR IGNORE INTO merchants (id, name, upiId, category) VALUES (?,?,?,'Biller')");
Object.values(BILLERS).forEach((b) => ins.run(b.id, b.name, b.upiId));

function payService(req, res) {
  const { customerId, productId, forceOutcome } = req.body || {};
  if (!ID_RE.test(String(customerId || ''))) return res.status(400).json({ success: false, error: 'valid customerId is required' });
  const product = CATALOG.find((p) => p.id === productId);
  if (!product) return res.status(400).json({ success: false, error: 'Unknown service' });
  const biller = BILLERS[product.category];
  if (!biller) return res.status(400).json({ success: false, error: 'Use Scan & Pay for transfers and shop payments' });
  const out = pay({
    customerId, upiId: biller.upiId, amount: product.price, note: product.name,
    channel: 'service', forceOutcome, productName: product.name,
  });
  if (out.status >= 400) return res.status(out.status).json({ success: false, error: out.error });
  res.status(201).json({ success: true, data: { outcome: out.outcome, message: out.message, txn: out.txn, payments: out.payments, balance: out.balance } });
}

function topUp(req, res) {
  const { customerId } = req.body || {};
  const amount = Number((req.body || {}).amount);
  if (!ID_RE.test(String(customerId || ''))) return res.status(400).json({ success: false, error: 'valid customerId is required' });
  if (!Number.isFinite(amount) || amount < 1 || amount > 50000) return res.status(400).json({ success: false, error: 'Enter an amount between 1 and 50000' });
  try {
    wallet.ensureWallet(customerId);
    const balance = wallet.credit(customerId, amount, null, 'Added from bank account');
    res.status(201).json({ success: true, data: {
      outcome: 'SUCCESS', message: 'Money added to wallet', balance,
      txn: { id: `ADD${Date.now().toString().slice(-6)}`, amount, status: 'delivered' },
    } });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
}

module.exports = { payService, topUp };
