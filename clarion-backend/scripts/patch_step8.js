const fs = require('fs');
function edit(file, pairs) {
  let s = fs.readFileSync(file, 'utf8');
  for (const [a, b] of pairs) {
    if (s.includes(b)) { console.log('already patched:', file); continue; }
    if (!s.includes(a)) { console.error('NOT FOUND in', file, '->', a.slice(0, 80)); process.exit(1); }
    s = s.replace(a, b);
    console.log('patched:', file);
  }
  fs.writeFileSync(file, s);
}

edit('src/services/paymentEngine.js', [
  ["function pay({ customerId, upiId, amount, note, channel = 'upi', forceOutcome }) {",
   "function pay({ customerId, upiId, amount, note, channel = 'upi', forceOutcome, productName }) {"],
  ["product: payee.kind === 'merchant' ? `Pay at Shop (QR): ${payee.name}` : `Send Money (UPI): ${payee.name}`,",
   "product: productName || (payee.kind === 'merchant' ? `Pay at Shop (QR): ${payee.name}` : `Send Money (UPI): ${payee.name}`),"],
]);

edit('src/controllers/pay.controller.js', [
  ["'SELECT id, name, upiId, category FROM merchants'",
   "\"SELECT id, name, upiId, category FROM merchants WHERE category != 'Biller'\""],
]);

edit('src/routes/pay.routes.js', [
  ["module.exports = router;",
   "const svc = require('../controllers/service.controller');\nrouter.post('/pay/service', ...authed, svc.payService);\nrouter.post('/wallet/topup', ...authed, svc.topUp);\n\nmodule.exports = router;"],
]);
