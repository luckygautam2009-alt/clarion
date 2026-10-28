const db = require('./connection');

function addCol(table, col, type) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS wallets (
    customerId TEXT PRIMARY KEY,
    upiId TEXT NOT NULL UNIQUE,
    balance REAL NOT NULL DEFAULT 0,
    updatedAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS merchants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    upiId TEXT NOT NULL UNIQUE,
    category TEXT,
    ownerCustomerId TEXT,
    pendingSettlement REAL NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS wallet_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customerId TEXT NOT NULL,
    txnId TEXT,
    entryType TEXT NOT NULL,
    amount REAL NOT NULL,
    balanceAfter REAL NOT NULL,
    note TEXT,
    createdAt TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_ledger_customer ON wallet_ledger(customerId, id);
`);

addCol('orders', 'payeeVpa', 'TEXT');
addCol('orders', 'payeeName', 'TEXT');
addCol('orders', 'note', 'TEXT');
addCol('orders', 'channel', 'TEXT');
addCol('orders', 'failureCode', 'TEXT');

const SEED_MERCHANTS = [
  ['M001', 'Chai Point', 'chaipoint@clarion', 'Food & Beverage'],
  ['M002', 'Metro Mart', 'metromart@clarion', 'Grocery'],
  ['M003', 'Sharma Electronics', 'sharmaelec@clarion', 'Electronics'],
  ['M004', 'Noida Bus Services', 'noidabus@clarion', 'Travel'],
];
if (db.prepare('SELECT COUNT(*) n FROM merchants').get().n === 0) {
  const ins = db.prepare('INSERT INTO merchants (id, name, upiId, category) VALUES (?,?,?,?)');
  db.transaction(() => SEED_MERCHANTS.forEach((m) => ins.run(...m)))();
}

function generateUpiId(customer) {
  const slug = String(customer.name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) || 'user';
  const num = String(customer.id).replace(/\D/g, '') || String(Date.now()).slice(-4);
  let candidate = `${slug}${num}@clarion`;
  const exists = db.prepare('SELECT 1 FROM wallets WHERE upiId=?');
  while (exists.get(candidate)) candidate = `${slug}${num}x${Math.floor(Math.random() * 90 + 10)}@clarion`;
  return candidate;
}

const STARTING_BALANCE = Number(process.env.STARTING_BALANCE) || 10000;

function backfillWallets() {
  const missing = db.prepare('SELECT * FROM customers WHERE id NOT IN (SELECT customerId FROM wallets)').all();
  const ins = db.prepare('INSERT INTO wallets (customerId, upiId, balance, updatedAt) VALUES (?,?,?,?)');
  db.transaction(() => missing.forEach((c) => ins.run(c.id, generateUpiId(c), STARTING_BALANCE, new Date().toISOString())))();
  if (missing.length) console.log(`[db] Wallets created for ${missing.length} customers`);
}
backfillWallets();

module.exports = { generateUpiId, backfillWallets, STARTING_BALANCE };
