const fs = require('fs');

function edit(file, fn, label) {
  const s = fs.readFileSync(file, 'utf8');
  const out = fn(s);
  if (out === null) return console.log('already patched:', label);
  if (out === false) { console.error('NOT FOUND:', label); process.exit(1); }
  fs.writeFileSync(file, out);
  console.log('patched:', label);
}

function rep(file, pairs) {
  let s = fs.readFileSync(file, 'utf8');
  let n = 0;
  for (const [from, to] of pairs) {
    if (s.includes(to)) continue;
    if (!s.includes(from)) { console.warn('  text not found (skipped):', from.slice(0, 60)); continue; }
    s = s.split(from).join(to); n++;
  }
  fs.writeFileSync(file, s);
  console.log(`text replaced in ${file}: ${n}`);
}

const BLOCK = String.raw`  // 3. Wrong beneficiary: money sent to a wrong UPI ID or account (internal id wrong_product maps to POLICY8)
  else if (
    /(wrong|galat|incorrect)\s*(upi|vpa|number|no\.?|account|person|beneficiary|id|jagah|banda|bande)|(upi|paise|paisa|payment|money|amount|transfer).*(wrong|galat)|(wrong|galat).*(upi|paise|paisa|transfer|bheje|bhej)/i.test(text)
  ) {
    intent = 'product_issue';
    subIntent = 'wrong_product';
    urgency = 'high';
    confidence = 85;
  }
  // 4. Receiver says the money did not arrive (POLICY10)
  else if (
    /(merchant|shopkeeper|dukan|receiver|beneficiary|samne\s*wale|dost|friend)[^.]{0,40}(nahi|not|never)\s*(mila|mile|received|aaya|aaye|got)|(not|never)\s*(received|credited)|credited\s*nahi/i.test(text)
  ) {
    intent = 'product_issue';
    subIntent = 'delivered_not_received';
    sentiment = 'angry';
    urgency = 'high';
    confidence = 85;
  }
  // 5. Pending / processing / status of a payment (POLICY11)
  else if (
    /(?:kya\s*status|status\s*kya|where\s*is|kab\s*aayega|kab\s*tak|late|delay|in\s*transit|stuck|atak|atka|track|tracking|pending|processing|process\s*ho\s*raha|abhi\s*tak)\b/i.test(text) &&
    !/(?:refund|wapas|reversal|money\s*back)/i.test(text) &&
    !/(?:kat\s*g|deduct|debited)/i.test(text)
  ) {
    intent = 'order_status/delay';
    subIntent = 'order_status_tracking';
    confidence = 85;
  }
  // 6. Goods / delivery complaints are outside payment support
  else if (
    /damage|broken|kharab|tuta|tut\s*gaya|defective|faulty|wrong\s*item|different\s*item|courier|delivery|deliver|parcel|package|product|item|shipping|warehouse|exchange|replace|खराब|टूटा/i.test(text) &&
    !/upi|payment|paise|paisa|debit|credited|transaction|txn|wallet|bank|utr|recharge|bill/i.test(text)
  ) {
    intent = 'other/ambiguous';
    subIntent = 'out_of_scope';
    confidence = 80;
  }
`;

edit('src/services/intentEngine.js', (s) => {
  if (s.includes("'out_of_scope'")) return null;
  const a = s.indexOf('  // 3. Order status / delay / in transit');
  const b = s.indexOf('  // 5. Refund / return');
  if (a < 0 || b < 0 || b < a) return false;
  return s.slice(0, a) + BLOCK + s.slice(b);
}, 'intentEngine fallback rules');

edit('src/services/intentEngine.js', (s) => {
  const from = "if (intent === 'delivery' || intent === 'product_quality') intent = 'product_issue';";
  const to = "if (intent === 'delivery' || intent === 'product_quality') { intent = 'other/ambiguous'; raw = { ...raw, subIntent: 'out_of_scope' }; }";
  if (s.includes(to)) return null;
  return s.includes(from) ? s.replace(from, to) : false;
}, 'intentEngine normalisation');

edit('src/services/intentEngine.js', (s) => {
  if (s.includes('NOT about a payment')) return null;
  const lines = {
    'payment/billing': '- "payment/billing": duplicate or double debit, money debited but payment failed, recharge or bill payment not completed, unauthorized charges',
    'refund/return': '- "refund/return": refund pending or delayed, refund status of a payment',
    'cancellation': '- "cancellation": status or reason of a cancelled payment or booking',
    'product_issue': '- "product_issue": money sent to a wrong UPI ID or account, receiver says the money did not arrive, payment proof or screenshot disputes',
    'order_status/delay': '- "order_status/delay": a payment stuck in pending or processing, status of a payment',
    'other/ambiguous': '- "other/ambiguous": unclear text, greetings, or anything NOT about a payment (for example damaged goods, product delivery, courier). Use subIntent "out_of_scope" for goods or delivery complaints.',
  };
  let out = s;
  for (const [k, v] of Object.entries(lines)) {
    const re = new RegExp('^- "' + k.replace('/', '\\/') + '": .*$', 'm');
    if (!re.test(out)) return false;
    out = out.replace(re, () => v);
  }
  return out;
}, 'intentEngine Gemini prompt');

edit('src/services/investigationRunner.js', (s) => {
  if (s.includes("'out_of_scope'")) return null;
  const from = 'function refineDecision({ decision, analysis, rootCause, investigation, photo }) {\n';
  if (!s.includes(from)) return false;
  const add = `  if (analysis.subIntent === 'out_of_scope') {
    return {
      ...decision, decision: 'NEEDS_INFO',
      reasoning: 'This complaint is about goods or delivery, which is outside Clarion payment support. No refund or ticket was created.',
      infoRequest: 'Clarion handles payment problems only (failed, double or pending payments, refunds, wrong transfers). For a product or delivery issue, please contact the merchant directly. If money was debited wrongly, tell us the transaction ID.',
    };
  }
`;
  return s.replace(from, from + add);
}, 'investigationRunner out-of-scope guard');

rep('src/services/investigationRunner.js', [
  ["'A photo of the item is needed to verify its condition before any resolution.'", "'A payment screenshot or bank statement is needed to verify this claim before any resolution.'"],
  ["'Please send a clear photo of the item showing the problem (and the shipping label if possible).'", "'Please attach a screenshot of the payment or your bank statement showing this transaction.'"],
  ["'Please tell us which order this is about (the order ID, for example ORDER1001) and describe what went wrong.'", "'Please tell us which payment this is about (the transaction ID, for example ORDER1001) and describe what went wrong.'"],
  ["'The complaint does not say which order it is about, so nothing can be verified yet.'", "'The complaint does not say which payment it is about, so nothing can be verified yet.'"],
]);

rep('src/services/decisionEngine.js', [
  ["'Carrier tracking marks delivery but customer disputes receipt. Requires logistics proof-of-delivery (POD) verification before financial resolution.'", "'The transaction shows as successful but the receiver disputes receipt. Bank proof (UTR) must be obtained before any resolution.'"],
  ["'Product condition claims rely on unverified customer words and require photo or reverse pickup verification prior to refund. No photo was provided.'", "'Payment-proof claims rely on unverified customer words and need a screenshot or bank statement before any refund. None was provided.'"],
  ["'Photo received, but no active policy matches this product complaint; requires human review.'", "'Proof received, but no active policy matches this payment complaint; requires human review.'"],
]);
