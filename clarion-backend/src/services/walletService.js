const db = require('../db/connection');
const { generateUpiId, STARTING_BALANCE } = require('../db/paymentsSchema');

const round2 = (n) => Math.round(n * 100) / 100;

function ensureWallet(customerId) {
  let w = db.prepare('SELECT * FROM wallets WHERE customerId=?').get(customerId);
  if (w) return w;
  const c = db.prepare('SELECT * FROM customers WHERE id=?').get(customerId);
  if (!c) return null;
  db.prepare('INSERT INTO wallets (customerId, upiId, balance, updatedAt) VALUES (?,?,?,?)')
    .run(customerId, generateUpiId(c), STARTING_BALANCE, new Date().toISOString());
  return db.prepare('SELECT * FROM wallets WHERE customerId=?').get(customerId);
}

function postEntry(customerId, entryType, amount, txnId, note) {
  const w = ensureWallet(customerId);
  if (!w) throw new Error(`No wallet for ${customerId}`);
  const delta = entryType === 'DEBIT' ? -amount : amount;
  const next = round2(w.balance + delta);
  if (next < 0) throw new Error('Insufficient balance');
  const now = new Date().toISOString();
  db.prepare('UPDATE wallets SET balance=?, updatedAt=? WHERE customerId=?').run(next, now, customerId);
  db.prepare('INSERT INTO wallet_ledger (customerId, txnId, entryType, amount, balanceAfter, note, createdAt) VALUES (?,?,?,?,?,?,?)')
    .run(customerId, txnId || null, entryType, amount, next, note || null, now);
  return next;
}

const debit = (cid, amt, txnId, note) => postEntry(cid, 'DEBIT', round2(amt), txnId, note);
const credit = (cid, amt, txnId, note) => postEntry(cid, 'CREDIT', round2(amt), txnId, note);
const reversal = (cid, amt, txnId, note) => postEntry(cid, 'REVERSAL', round2(amt), txnId, note);

const getLedger = (cid, limit = 50) =>
  db.prepare('SELECT * FROM wallet_ledger WHERE customerId=? ORDER BY id DESC LIMIT ?').all(cid, limit);

module.exports = { ensureWallet, debit, credit, reversal, getLedger, round2 };
