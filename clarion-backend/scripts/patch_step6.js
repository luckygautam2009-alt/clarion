const fs = require('fs');
const f = 'src/app.js';
const s = fs.readFileSync(f, 'utf8');
const line = "app.use('/api', require('./routes/pay.routes'));";
if (s.includes('pay.routes')) { console.log('already mounted'); process.exit(0); }
const m = /app\.use\(\s*['"]\/api\/shop['"][^\n]*\n/.exec(s);
if (!m) {
  console.error('Mount point not found. Lines with app.use:');
  s.split('\n').forEach((l, i) => { if (l.includes('app.use')) console.error(i + 1 + ': ' + l); });
  process.exit(1);
}
fs.writeFileSync(f, s.replace(m[0], m[0] + line + '\n'));
console.log('mounted after:', m[0].trim());
