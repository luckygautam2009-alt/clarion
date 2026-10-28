const db = require('../src/db/connection');
const { pay } = require('../src/services/paymentEngine');
const { createRefund } = require('../src/services/actionExecutor');
const { settleRefund } = require('../src/services/refundService');
const wallet = require('../src/services/walletService');

const cust = db.prepare('SELECT * FROM customers ORDER BY id LIMIT 1').get();
const before = wallet.ensureWallet(cust.id).balance;
const r = pay({ customerId: cust.id, upiId: 'chaipoint@clarion', amount: 200.13, channel: 'qr' });
console.log('outcome:', r.outcome, '| balance after debit:', r.balance, '(before', before + ')');
const rf = createRefund({ orderId: r.txn.id, customerId: cust.id, amount: 200.13, reason: 'test reconciliation', gatewayRef: null });
console.log('refund pending:', rf.id, rf.status);
const s = settleRefund(rf.id);
console.log('settled:', s.status, '| balance now:', s.balance, '| expected:', before);
console.log('double settle blocked:', settleRefund(rf.id));
console.table(wallet.getLedger(cust.id, 3));
