const fs = require('fs');
const f = 'src/services/investigationEngine.js';
let s = fs.readFileSync(f, 'utf8');
const from = "orders.find((o) => o.status === 'returned' || o.status === 'cancelled' || o.status === 'in_transit' || o.returnRequested)";
const to = "[...orders].reverse().find((o) => ['returned', 'cancelled', 'in_transit', 'pending', 'failed'].includes(o.status) || o.returnRequested)";
if (s.includes(to)) { console.log('already patched'); process.exit(0); }
if (!s.includes(from)) { console.error('NOT FOUND'); process.exit(1); }
fs.writeFileSync(f, s.replace(from, to));
console.log('patched', f);
