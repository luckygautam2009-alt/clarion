const fs = require('fs');
function patch(file, from, to) {
  const s = fs.readFileSync(file, 'utf8');
  if (s.includes(to)) return console.log('already patched:', file);
  if (!s.includes(from)) { console.error('NOT FOUND in', file, '->', from); process.exit(1); }
  fs.writeFileSync(file, s.replace(from, to));
  console.log('patched:', file);
}

patch('src/services/actionExecutor.js',
  "result.refund = createRefund({ orderId: order.id, customerId, ...spec });",
  "result.refund = createRefund({ orderId: order.id, customerId, ...spec });\n        require('./refundService').scheduleSettle(result.refund.id);");

patch('src/services/authService.js',
  "return { status: 201, customer: publicCustomer(customer), ...issueSession(customer.id) };",
  "require('./walletService').ensureWallet(customer.id);\n  return { status: 201, customer: publicCustomer(customer), ...issueSession(customer.id) };");
