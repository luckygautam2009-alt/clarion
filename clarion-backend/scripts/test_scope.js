const db = require('../src/db/connection');
const { pay } = require('../src/services/paymentEngine');
const { runInvestigation } = require('../src/services/investigationRunner');

(async () => {
  const cust = db.prepare('SELECT * FROM customers ORDER BY id LIMIT 1').get();
  const mk = (amt) => pay({ customerId: cust.id, upiId: 'chaipoint@clarion', amount: amt, channel: 'qr' }).txn.id;
  const cases = [
    ['debited, failed (.13)', mk(410.13), (id) => `Mera payment fail ho gaya lekin paise kat gaye. Transaction ${id}`],
    ['double debit (.99)', mk(410.99), (id) => `Mujhse double paise kat gaye, ${id} ka payment do baar hua`],
    ['pending (.77)', mk(410.77), (id) => `Payment abhi tak pending hai, ${id}`],
    ['wrong UPI ID', mk(411), (id) => `Maine galat UPI ID pe paise bhej diye, ${id}`],
    ['receiver says not received', mk(412), (id) => `Merchant ko paise nahi mile, ${id} successful dikha raha hai`],
    ['security', null, () => 'Someone logged into my account from another device and sent money'],
    ['damaged item (out of scope)', null, () => 'my item arrived with a cracked broken part, please refund'],
    ['delivery late (out of scope)', null, () => 'mera parcel abhi tak nahi aaya, courier late hai'],
  ];
  const rows = [];
  for (const [label, id, text] of cases) {
    const out = await runInvestigation({ customerId: cust.id, complaintText: text(id) });
    if (out.error) { rows.push({ case: label, error: out.error.message }); continue; }
    const d = out.data;
    rows.push({
      case: label, intent: d.analysis.intent, sub: d.analysis.subIntent,
      policy: d.rootCause.matchedPolicy, conf: d.rootCause.confidence,
      decision: d.decision.decision, info: (d.decision.infoRequest || '').slice(0, 40),
    });
  }
  console.table(rows);
})();
