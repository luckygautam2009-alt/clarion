const crypto = require('crypto');
const db = require('../db/connection');
require('../db/paymentsSchema');
const wallet = require('./walletService');
const { isValidVpa } = require('../utils/upi');
const { normalizePhone } = require('../utils/phone');

const MAX_AMOUNT = 100000;
const PAISE_TRIGGERS = { 13: 'DEBITED_NOT_CREDITED', 99: 'DUPLICATE', 77: 'PENDING', 41: 'FAILED' };
const OUTCOMES = ['SUCCESS', 'PENDING', 'DEBITED_NOT_CREDITED', 'DUPLICATE', 'FAILED'];
const DEMO = process.env.DEMO_MODE !== 'false';
const day = (offset = 0) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

function nextNum(table, prefix, min) {
  const re = new RegExp(`^${prefix}(\\d+)$`);
  let max = min - 1;
  for (const r of db.prepare(`SELECT id FROM ${table}`).all()) {
    const m = re.exec(String(r.id));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max + 1;
}

function decideOutcome(amount, forceOutcome) {
  if (DEMO && forceOutcome && OUTCOMES.includes(forceOutcome)) return forceOutcome;
  return PAISE_TRIGGERS[Math.round(amount * 100) % 100] || 'SUCCESS';
}

function resolvePayee(upiId) {
  const m = db.prepare('SELECT * FROM merchants WHERE upiId=?').get(upiId);
  if (m) return { kind: 'merchant', id: m.id, name: m.name, upiId: m.upiId };
  const w = db.prepare('SELECT w.*, c.name FROM wallets w JOIN customers c ON c.id=w.customerId WHERE w.upiId=?').get(upiId);
  if (w) return { kind: 'user', id: w.customerId, name: w.name, upiId: w.upiId };
  return null;
}

function resolveByPhone(raw) {
  const p = normalizePhone(raw);
  if (!p) return { error: 'Enter a valid 10-digit mobile number' };
  const rows = db.prepare("SELECT c.id, c.name, c.phone, w.upiId FROM customers c JOIN wallets w ON w.customerId=c.id WHERE c.phone IS NOT NULL AND c.phone != ''").all()
    .filter((r) => normalizePhone(r.phone) === p);
  if (rows.length === 0) return { error: 'No Clarion Pay account found for this mobile number' };
  if (rows.length > 1) return { error: 'More than one account uses this number. Pay using the UPI ID instead.' };
  const r = rows[0];
  return { payee: { kind: 'user', id: r.id, name: r.name, upiId: r.upiId, phone: 'XXXXXX' + p.slice(-4) } };
}

function pay({ customerId, upiId, amount, note, channel = 'upi', forceOutcome, productName }) {
  const amt = wallet.round2(Number(amount));
  if (!Number.isFinite(amt) || amt <= 0) return { status: 400, error: 'Enter a valid amount' };
  if (amt > MAX_AMOUNT) return { status: 400, error: `Amount cannot exceed INR ${MAX_AMOUNT}` };
  const vpa = String(upiId || '').trim().toLowerCase();
  if (!isValidVpa(vpa)) return { status: 400, error: 'Invalid UPI ID' };

  const me = wallet.ensureWallet(customerId);
  if (!me) return { status: 404, error: `Customer not found: ${customerId}` };
  const payee = resolvePayee(vpa);
  if (!payee) return { status: 404, error: 'UPI ID not found. Check the QR or UPI ID and try again.' };
  if (payee.kind === 'user' && payee.id === customerId) return { status: 400, error: 'You cannot pay yourself' };

  const outcome = decideOutcome(amt, forceOutcome);
  const needed = outcome === 'DUPLICATE' ? amt * 2 : outcome === 'FAILED' ? 0 : amt;
  if (me.balance < needed) return { status: 402, error: `Insufficient balance (available INR ${me.balance})` };

  const txnId = `ORDER${nextNum('orders', 'ORDER', 1001)}`;
  const utrDigits = String(crypto.randomInt(100000000000, 999999999999));
  const nowIso = new Date().toISOString();
  const statusMap = {
    SUCCESS: { status: 'delivered', courierStatus: 'credited', failureCode: null },
    PENDING: { status: 'in_transit', courierStatus: 'processing', failureCode: null },
    DEBITED_NOT_CREDITED: { status: 'pending', courierStatus: null, failureCode: 'BANK_TIMEOUT' },
    DUPLICATE: { status: 'delivered', courierStatus: 'credited', failureCode: null },
    FAILED: { status: 'failed', courierStatus: null, failureCode: 'BANK_DECLINED' },
  }[outcome];

  const order = {
    id: txnId, customerId,
    product: productName || (payee.kind === 'merchant' ? `Pay at Shop (QR): ${payee.name}` : `Send Money (UPI): ${payee.name}`),
    amount: amt,
    status: statusMap.status,
    deliveredAt: statusMap.status === 'delivered' ? nowIso : null,
    deliveredOn: statusMap.status === 'delivered' ? nowIso.slice(0, 10) : null,
    returnRequested: 0, cancelledAt: null, cancellationReason: null, returnStatus: null, returnedAt: null,
    courierTracking: ['SUCCESS', 'DUPLICATE', 'PENDING'].includes(outcome) ? `UTR${utrDigits}` : null,
    courierStatus: statusMap.courierStatus,
    estimatedDelivery: outcome === 'PENDING' ? day(1) : null,
    payeeVpa: payee.upiId, payeeName: payee.name, note: note || null, channel, failureCode: statusMap.failureCode,
  };

  const specs = {
    SUCCESS: [{ status: 'success', gw: 'success', local: 'success' }],
    PENDING: [{ status: 'pending', gw: 'pending', local: 'pending' }],
    DEBITED_NOT_CREDITED: [{ status: 'failed', gw: 'success', local: 'failed' }],
    DUPLICATE: [{ status: 'success', gw: 'success', local: 'success' }, { status: 'success', gw: 'success', local: 'success' }],
    FAILED: [{ status: 'failed', gw: 'failed', local: 'failed' }],
  }[outcome];

  const payments = [];
  db.transaction(() => {
    db.prepare(`INSERT INTO orders (id, customerId, product, amount, status, deliveredAt, deliveredOn, returnRequested,
      cancelledAt, cancellationReason, returnStatus, returnedAt, courierTracking, courierStatus, estimatedDelivery,
      payeeVpa, payeeName, note, channel, failureCode)
      VALUES (@id, @customerId, @product, @amount, @status, @deliveredAt, @deliveredOn, @returnRequested,
      @cancelledAt, @cancellationReason, @returnStatus, @returnedAt, @courierTracking, @courierStatus, @estimatedDelivery,
      @payeeVpa, @payeeName, @note, @channel, @failureCode)`).run(order);

    let n = nextNum('payments', 'PAY', 1001);
    specs.forEach((s, i) => {
      const p = {
        id: `PAY${n++}`, orderId: txnId, customerId, amount: amt, status: s.status,
        gatewayStatus: s.gw, localStatus: s.local,
        gatewayRef: `upi_utr_${i === 0 ? utrDigits : String(crypto.randomInt(100000000000, 999999999999))}`,
        timestamp: new Date(Date.now() + i * 2000).toISOString(),
      };
      db.prepare(`INSERT INTO payments (id, orderId, customerId, amount, status, gatewayStatus, localStatus, gatewayRef, timestamp)
        VALUES (@id, @orderId, @customerId, @amount, @status, @gatewayStatus, @localStatus, @gatewayRef, @timestamp)`).run(p);
      payments.push(p);
      if (s.gw === 'success') wallet.debit(customerId, amt, txnId, `Paid to ${payee.name} (${p.gatewayRef})`);
    });

    if (outcome === 'SUCCESS' || outcome === 'DUPLICATE') {
      if (payee.kind === 'merchant') db.prepare('UPDATE merchants SET pendingSettlement = pendingSettlement + ? WHERE id=?').run(amt, payee.id);
      else wallet.credit(payee.id, amt, txnId, `Received from ${customerId}`);
    }
  })();

  const messages = {
    SUCCESS: 'Payment successful',
    PENDING: 'Payment is processing with the bank',
    DEBITED_NOT_CREDITED: 'Payment failed, but money may have been debited. Report an issue and we will investigate.',
    DUPLICATE: 'Payment successful',
    FAILED: 'Payment failed. No money was debited.',
  };
  return {
    status: 201, outcome, message: messages[outcome],
    txn: db.prepare('SELECT * FROM orders WHERE id=?').get(txnId),
    payments,
    balance: wallet.ensureWallet(customerId).balance,
  };
}

module.exports = { pay, resolvePayee, resolveByPhone, decideOutcome, OUTCOMES };
