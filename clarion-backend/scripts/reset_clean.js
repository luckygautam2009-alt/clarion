const fs = require('fs');
const path = require('path');
const db = require('../src/db/connection');

function tryRequire(p) { try { require(p); } catch (e) { console.warn('[warn] could not load', p, '-', e.message); } }
['../src/db/paymentsSchema', '../src/services/authService', '../src/services/auditService',
  '../src/services/proposalService', '../src/services/complaintService', '../src/services/notificationService']
  .forEach(tryRequire);

const ids = (f) => require('../src/mockData/' + f).map((r) => r.id);
const STARTING_BALANCE = Number(process.env.STARTING_BALANCE) || 10000;

function wipe(table, keepIds) {
  try {
    let n;
    if (keepIds && keepIds.length) {
      n = db.prepare(`DELETE FROM ${table} WHERE id NOT IN (${keepIds.map(() => '?').join(',')})`).run(...keepIds).changes;
    } else {
      n = db.prepare(`DELETE FROM ${table}`).run().changes;
    }
    console.log(`  ${table}: ${n} rows removed`);
  } catch (e) {
    console.warn(`  ${table}: skipped (${e.message})`);
  }
}

(async () => {
  fs.mkdirSync(path.join(__dirname, '../backup'), { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = path.join(__dirname, `../backup/clarion-before-reset-${stamp}.db`);
  await db.backup(dest);
  console.log('Backup saved:', dest);

  console.log('Cleaning...');
  db.transaction(() => {
    wipe('orders', ids('orders.json'));
    wipe('payments', ids('payments.json'));
    wipe('refunds', ids('refunds.json'));
    wipe('tickets', ids('tickets.json'));
    ['complaints', 'complaint_files', 'audit_log', 'notifications', 'email_outbox', 'proposals', 'image_hashes', 'wallet_ledger']
      .forEach((t) => wipe(t));
    const now = new Date().toISOString();
    const w = db.prepare('UPDATE wallets SET balance=?, updatedAt=?').run(STARTING_BALANCE, now).changes;
    console.log(`  wallets reset to ${STARTING_BALANCE}: ${w}`);
    try { db.prepare('UPDATE merchants SET pendingSettlement=0').run(); } catch (e) { console.warn('  merchants:', e.message); }
  })();

  const auth = require('../src/services/authService');
  const demo = [
    { name: 'Riya Demo', email: 'riya.demo@clarion.test' },
    { name: 'Aman Demo', email: 'aman.demo@clarion.test' },
  ];
  for (const u of demo) {
    const r = auth.signup({ ...u, password: 'Demo@12345' });
    console.log(r.status === 201 ? `  created demo user ${u.email}` : `  ${u.email}: ${r.error}`);
  }

  console.log('\nResult:');
  console.table(db.prepare(`
    SELECT c.id, c.name, w.upiId, w.balance,
      (SELECT COUNT(*) FROM orders o WHERE o.customerId=c.id) AS txns
    FROM customers c LEFT JOIN wallets w ON w.customerId=c.id ORDER BY c.id`).all());
  console.log('Login for demo users: <email above> / Demo@12345');
})();
