const db = require('../src/db/connection');
const { pay } = require('../src/services/paymentEngine');
const { runInvestigation } = require('../src/services/investigationRunner');

(async () => {
  const cust = db.prepare('SELECT * FROM customers ORDER BY id LIMIT 1').get();
  const scenarios = [
    { amt: 310.13, text: (id) => `Mera payment fail ho gaya lekin paise kat gaye. Transaction ${id}` },
    { amt: 310.99, text: (id) => `Mujhse double paise kat gaye, ${id} ka payment do baar hua` },
    { amt: 310.77, text: (id) => `Payment abhi tak pending hai, ${id}` },
  ];
  const rows = [];
  for (const s of scenarios) {
    const r = pay({ customerId: cust.id, upiId: 'chaipoint@clarion', amount: s.amt, channel: 'qr' });
    const out = await runInvestigation({ customerId: cust.id, complaintText: s.text(r.txn.id) });
    if (out.error) { rows.push({ txn: r.txn.id, error: out.error.message }); continue; }
    const d = out.data;
    rows.push({
      txn: r.txn.id, outcome: r.outcome, intent: d.analysis.intent,
      policy: d.rootCause.matchedPolicy, conf: d.rootCause.confidence,
      decision: d.decision.decision, risk: d.risk && d.risk.score,
    });
  }
  console.table(rows);
})();
