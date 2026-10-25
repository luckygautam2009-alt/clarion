const db = require('../db/connection');

db.exec(`
  CREATE TABLE IF NOT EXISTS customer_profiles (
    customerId TEXT PRIMARY KEY,
    avatar BLOB,
    avatarMime TEXT,
    avatarUpdatedAt TEXT
  );
`);

function get(customerId) {
  const c = db.prepare('SELECT id, name, email, phone, address, city, pincode, tier, joinedOn FROM customers WHERE id=?').get(customerId);
  const p = db.prepare('SELECT avatarMime, avatarUpdatedAt, avatar IS NOT NULL AS has FROM customer_profiles WHERE customerId=?').get(customerId);
  return {
    ...c,
    phone: c ? c.phone || '' : '',
    address: c ? c.address || '' : '',
    city: c ? c.city || '' : '',
    pincode: c ? c.pincode || '' : '',
    hasAvatar: !!(p && p.has),
    avatarUpdatedAt: p ? p.avatarUpdatedAt : null,
  };
}

function setAvatar(customerId, buffer, mime) {
  db.prepare(`INSERT INTO customer_profiles (customerId, avatar, avatarMime, avatarUpdatedAt) VALUES (?,?,?,?)
    ON CONFLICT(customerId) DO UPDATE SET avatar=excluded.avatar, avatarMime=excluded.avatarMime, avatarUpdatedAt=excluded.avatarUpdatedAt`)
    .run(customerId, buffer, mime, new Date().toISOString());
}

function getAvatar(customerId) {
  const p = db.prepare('SELECT avatar, avatarMime FROM customer_profiles WHERE customerId=?').get(customerId);
  return p && p.avatar ? { data: p.avatar, mime: p.avatarMime } : null;
}

function removeAvatar(customerId) {
  db.prepare('UPDATE customer_profiles SET avatar=NULL, avatarMime=NULL, avatarUpdatedAt=? WHERE customerId=?').run(new Date().toISOString(), customerId);
}

function setName(customerId, name) {
  db.prepare('UPDATE customers SET name=? WHERE id=?').run(name, customerId);
}

function updateDetails(customerId, { name, phone, address, city, pincode }) {
  const sets = [];
  const params = [];
  if (name !== undefined) { sets.push('name=?'); params.push(String(name).trim()); }
  if (phone !== undefined) { sets.push('phone=?'); params.push(String(phone).trim()); }
  if (address !== undefined) { sets.push('address=?'); params.push(String(address).trim()); }
  if (city !== undefined) { sets.push('city=?'); params.push(String(city).trim()); }
  if (pincode !== undefined) { sets.push('pincode=?'); params.push(String(pincode).trim()); }
  if (sets.length > 0) {
    params.push(customerId);
    db.prepare(`UPDATE customers SET ${sets.join(', ')} WHERE id=?`).run(...params);
  }
  return get(customerId);
}

module.exports = { get, setAvatar, getAvatar, removeAvatar, setName, updateDetails };
