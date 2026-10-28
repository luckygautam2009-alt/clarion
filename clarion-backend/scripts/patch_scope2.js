const fs = require('fs');
function apply(file, pairs) {
  let s = fs.readFileSync(file, 'utf8');
  let n = 0;
  for (const [a, b] of pairs) {
    if (s.includes(a)) { s = s.split(a).join(b); n++; }
    else if (!s.includes(b)) console.warn('  not found:', a.slice(0, 70));
  }
  fs.writeFileSync(file, s);
  console.log(`${file}: ${n} changed`);
}
apply('src/services/rootCauseEngine.js', [
  ['Verified live shipping and dispatch status in carrier records.', 'Verified live processing status in bank and NPCI records.'],
  ['Unable to determine root cause from available customer data: Order is not in transit.', 'Unable to determine root cause from available customer data: the transaction is not processing.'],
  ['Order is not in transit in database records', 'Transaction is not in processing state in database records'],
  ['No active shipment in transit.', 'No processing payment found.'],
  ['Customer claim requires physical or logistics partner verification prior to automated action.', 'Customer claim requires bank or recipient-bank verification prior to automated action.'],
  ['Customer reported damaged product for Order ${focusOrder.id}. Per policy, physical damage claims rely on customer claims and require photo verification before resolution.',
   'Customer disputes transaction ${focusOrder.id}. Per policy, claims that depend on a screenshot or bank statement need proof verification before resolution.'],
]);
