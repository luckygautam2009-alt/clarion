const db = require('../db/connection');
const wallet = require('./walletService');

const SETTLE_MS = Number(process.env.REFUND_SETTLE_MS) || 8000;

function settleRefund(refundId) {
  const r = db.prepare('SELECT * FROM refunds WHERE id=?').get(refundId);
  if (!r) return { status: 404, error: 'Refund not found' };
  if (r.status !== 'pending') return { status: 409, error: `Refund is already ${r.status}` };
  let balance;
  try {
    db.transaction(() => {
      const upd = db.prepare("UPDATE refunds SET status='completed', completedAt=? WHERE id=? AND status='pending'")
        .run(new Date().toISOString(), refundId);
      if (upd.changes !== 1) throw new Error('Refund already settled');
      balance = wallet.reversal(r.customerId, r.amount, r.orderId, `Refund ${r.id}: ${r.reason || 'refund'}`);
    })();
  } catch (e) {
    return { status: 409, error: e.message };
  }
  return { status: 200, refund: db.prepare('SELECT * FROM refunds WHERE id=?').get(refundId), balance };
}

function scheduleSettle(refundId) {
  if (process.env.AUTO_SETTLE_REFUNDS === 'false') return;
  const t = setTimeout(() => {
    const out = settleRefund(refundId);
    if (out.status !== 200) console.warn('[refund] auto-settle skipped:', refundId, out.error);
    else console.log(`[refund] ${refundId} settled, wallet balance ${out.balance}`);
  }, SETTLE_MS);
  if (t.unref) t.unref();
}

module.exports = { settleRefund, scheduleSettle };
