const db = require('../src/db/connection');
const { normalizePhone } = require('../src/utils/phone');
const rows = db.prepare('SELECT id, phone FROM customers ORDER BY id').all();
const used = new Set(rows.map((r) => normalizePhone(r.phone)).filter(Boolean));
const upd = db.prepare('UPDATE customers SET phone=? WHERE id=?');
let n = 1;
db.transaction(() => rows.forEach((r) => {
  if (normalizePhone(r.phone)) return;
  let p;
  do { p = '98765' + String(n++).padStart(5, '0'); } while (used.has(p));
  used.add(p); upd.run(p, r.id);
}))();
console.table(db.prepare('SELECT c.id, c.name, c.phone, w.upiId FROM customers c LEFT JOIN wallets w ON w.customerId=c.id ORDER BY c.id').all());
